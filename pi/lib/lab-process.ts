// Owns one `taste-lab serve --events` child and its process group: spawn,
// parse, log, stop.
import {
  closeSync,
  constants,
  mkdirSync,
  mkdtempSync,
  openSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type AnswerEvent,
  createEventParser,
  createLineSplitter,
  type ReadyEvent,
} from "./events.ts";
import { lanToken, scrubSecrets } from "./messages.ts";

/** The part of a ChildProcess this module uses. Tests pass a fake. */
export interface ChildLike {
  /** Set for a real child. A fake without one is signalled with kill(). */
  pid?: number;
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
  kill(signal?: NodeJS.Signals): boolean;
  on(
    event: "exit",
    fn: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): unknown;
  on(
    event: "close",
    fn: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): unknown;
  on(event: "error", fn: (err: Error) => void): unknown;
}

/** After `exit`, wait this long for `close` so the last stdout and stderr lines land. */
const CLOSE_GRACE_MS = 500;
/** How often stop() checks whether the process group is gone. */
const POLL_MS = 20;

export type SpawnFn = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    stdio: ["ignore", "pipe", "pipe"];
    env: NodeJS.ProcessEnv;
    /** Own process group, so stop() can signal the whole tree. */
    detached: boolean;
  },
) => ChildLike;

export type LabExit = {
  /** True when stop() asked for it. */
  expected: boolean;
  code: number | null;
  signal: NodeJS.Signals | null;
  /** Last `error` event or spawn error, if any. */
  error?: string;
  /** Exited before `ready`. */
  beforeReady: boolean;
};

export type LabHandlers = {
  onReady(ready: ReadyEvent): void;
  onAnswer(answer: AnswerEvent): void;
  onError(message: string): void;
  onExit(exit: LabExit): void;
};

export type LabOptions = {
  spawn: SpawnFn;
  /** Path to bin/taste-lab.mjs. */
  bin: string;
  cwd: string;
  dataDir: string;
  lan: boolean;
  handlers: LabHandlers;
  node?: string;
  /** Parent of the private log dir. Defaults to the OS temp dir. */
  logDir?: string;
  /** Wait after SIGTERM before SIGKILL, and after SIGKILL before giving up. */
  killAfterMs?: number;
  /** Fixed `--port`. Unset lets serve pick a free one (tests set it). */
  port?: number;
};

export function serveArgs(
  bin: string,
  dataDir: string,
  lan: boolean,
  port?: number,
): string[] {
  return [
    bin,
    "serve",
    "--dir",
    dataDir,
    "--events",
    ...(lan ? ["--lan"] : []),
    ...(port !== undefined ? ["--port", String(port)] : []),
  ];
}

/** Prefix of the private log dir, made with mkdtemp under the OS temp dir. */
export const LOG_DIR_PREFIX = "taste-lab-pi-";

/**
 * Makes a fresh 0700 dir and an exclusively created 0600 file in it. O_EXCL
 * refuses an existing path, symlink included, and O_NOFOLLOW backs that up.
 */
function openPrivateLog(parent: string): { path: string; fd: number } {
  mkdirSync(parent, { recursive: true, mode: 0o700 }); // no-op for the OS temp dir
  const dir = mkdtempSync(join(parent, LOG_DIR_PREFIX));
  const path = join(dir, `serve-${process.pid}-${Date.now()}.log`);
  const flags =
    constants.O_WRONLY |
    constants.O_CREAT |
    constants.O_EXCL |
    constants.O_APPEND |
    (constants.O_NOFOLLOW ?? 0);
  return { path, fd: openSync(path, flags, 0o600) };
}

const errCode = (e: unknown) => (e as NodeJS.ErrnoException).code;

/** True while any process in group `pid` lives. EPERM still means it lives. */
function groupAlive(pid: number | undefined): boolean {
  if (pid === undefined || process.platform === "win32") return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (e) {
    return errCode(e) === "EPERM";
  }
}

export class LabProcess {
  /** Empty when the log could not be opened. */
  readonly logPath: string;
  ready: ReadyEvent | undefined;
  private child: ChildLike;
  /** The child reported exit (or failed to spawn). Its group may still live. */
  private childGone = false;
  private exitCode: number | null = null;
  private exitSignal: NodeJS.Signals | null = null;
  /** onExit was delivered. */
  private finished = false;
  private stopping = false;
  private terminating: Promise<void> | undefined;
  private lastError: string | undefined;
  private token: string | undefined;
  private logFd: number | undefined;
  private readonly killAfterMs: number;
  private readonly opts: LabOptions;
  private readonly onPiExit = () => this.signalTree("SIGTERM");

  constructor(opts: LabOptions) {
    this.opts = opts;
    this.killAfterMs = opts.killAfterMs ?? 3000;
    let logPath = "";
    try {
      const log = openPrivateLog(opts.logDir ?? tmpdir());
      logPath = log.path;
      this.logFd = log.fd;
    } catch {
      this.logFd = undefined; // no log is better than no lab
    }
    this.logPath = logPath;
    this.child = opts.spawn(
      opts.node ?? "node",
      serveArgs(opts.bin, opts.dataDir, opts.lan, opts.port),
      {
        cwd: opts.cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
        detached: true,
      },
    );
    // A detached group misses the terminal's Ctrl+C. If pi exits without
    // session_shutdown, still ask the group to stop.
    process.once("exit", this.onPiExit);
    this.wire();
  }

  get running(): boolean {
    return !this.finished;
  }

  /** stderr and stray stdout go here, scrubbed of the token. */
  private log(line: string) {
    if (this.logFd === undefined) return;
    try {
      writeSync(
        this.logFd,
        `${scrubSecrets(line, this.token ? [this.token] : [])}\n`,
      );
    } catch {
      // ignore a full disk or a closed fd
    }
  }

  private wire() {
    const { handlers } = this.opts;
    const parser = createEventParser(
      (e) => {
        if (this.finished) return;
        if (e.event === "ready") {
          this.token = lanToken(e.lan);
          this.ready = e;
          handlers.onReady(e);
        } else if (e.event === "answer") {
          handlers.onAnswer(e);
        } else {
          this.lastError = e.message;
          handlers.onError(e.message);
        }
      },
      (junk) => this.log(`[stdout] ${junk}`),
    );
    const errLines = createLineSplitter((line) => this.log(line));
    this.child.stdout?.setEncoding("utf8");
    this.child.stderr?.setEncoding("utf8");
    this.child.stdout?.on("data", (c: string) => parser.push(c));
    this.child.stdout?.on("end", () => parser.end());
    this.child.stderr?.on("data", (c: string) => errLines.push(c));
    this.child.stderr?.on("end", () => errLines.end());
    this.child.on("error", (err) => {
      // spawn failure (node missing): no exit event follows
      this.lastError = err.message;
      this.log(`[spawn] ${err.message}`);
      this.childExited(null, null);
    });
    // `close` follows `exit` once stdio ends. A grandchild holding the pipes can
    // delay it, so `exit` also counts after a short grace.
    this.child.on("exit", (code, signal) => {
      setTimeout(
        () => this.childExited(code, signal),
        CLOSE_GRACE_MS,
      ).unref?.();
    });
    this.child.on("close", (code, signal) => this.childExited(code, signal));
  }

  private childExited(code: number | null, signal: NodeJS.Signals | null) {
    if (this.childGone) return;
    this.childGone = true;
    this.exitCode = code;
    this.exitSignal = signal;
    // Unasked exit: still reap any descendant left in the group.
    void this.terminate();
  }

  /** Signals the child's process group, or the child alone when it has no pid. */
  private signalTree(signal: NodeJS.Signals) {
    const pid = this.child.pid;
    if (pid !== undefined && process.platform !== "win32") {
      try {
        process.kill(-pid, signal);
        return;
      } catch (e) {
        if (errCode(e) === "ESRCH") return; // the group is gone
      }
    }
    if (!this.childGone) {
      try {
        this.child.kill(signal);
      } catch {}
    }
  }

  private gone(): boolean {
    return this.childGone && !groupAlive(this.child.pid);
  }

  private async waitGone(ms: number): Promise<boolean> {
    const until = Date.now() + ms;
    while (!this.gone()) {
      if (Date.now() >= until) return false;
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    return true;
  }

  /** SIGTERM to the group, SIGKILL after `killAfterMs`, then onExit. Runs once. */
  private terminate(): Promise<void> {
    this.terminating ??= (async () => {
      if (!this.gone()) {
        this.signalTree("SIGTERM");
        if (!(await this.waitGone(this.killAfterMs))) {
          this.signalTree("SIGKILL");
          // A child that ignores SIGKILL or never reports exit must not hang
          // pi's shutdown, so give up after one more wait.
          await this.waitGone(this.killAfterMs);
        }
      }
      this.finish();
    })();
    return this.terminating;
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    process.removeListener("exit", this.onPiExit);
    const signal = this.childGone ? this.exitSignal : "SIGKILL";
    this.log(`[exit] code ${this.exitCode} signal ${signal}`);
    if (this.logFd !== undefined) {
      try {
        closeSync(this.logFd);
      } catch {}
      this.logFd = undefined;
    }
    this.opts.handlers.onExit({
      expected: this.stopping,
      code: this.exitCode,
      signal,
      error: this.lastError,
      beforeReady: this.ready === undefined,
    });
  }

  /** Resolves once the whole group is gone or the kill timeouts pass. Safe to call twice. */
  async stop(): Promise<void> {
    if (this.finished) return;
    // A child that already died on its own is still reported as unexpected.
    if (!this.childGone) this.stopping = true;
    await this.terminate();
  }
}
