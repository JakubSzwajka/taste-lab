// Owns one `taste-lab serve --events` child: spawn, parse, log, stop.
import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
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

export type SpawnFn = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    stdio: ["ignore", "pipe", "pipe"];
    env: NodeJS.ProcessEnv;
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
  logDir?: string;
  /** Wait after SIGTERM before SIGKILL. */
  killAfterMs?: number;
};

export function serveArgs(
  bin: string,
  dataDir: string,
  lan: boolean,
): string[] {
  return [
    bin,
    "serve",
    "--dir",
    dataDir,
    "--events",
    ...(lan ? ["--lan"] : []),
  ];
}

export function defaultLogDir(): string {
  return join(tmpdir(), "taste-lab-pi");
}

export class LabProcess {
  readonly logPath: string;
  ready: ReadyEvent | undefined;
  private child: ChildLike;
  private exited = false;
  private stopping = false;
  private lastError: string | undefined;
  private token: string | undefined;
  private logFd: number | undefined;
  private exitWaiters: (() => void)[] = [];
  private readonly killAfterMs: number;
  private readonly opts: LabOptions;

  constructor(opts: LabOptions) {
    this.opts = opts;
    this.killAfterMs = opts.killAfterMs ?? 3000;
    const dir = opts.logDir ?? defaultLogDir();
    this.logPath = join(dir, `serve-${process.pid}-${Date.now()}.log`);
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      this.logFd = openSync(this.logPath, "a", 0o600);
    } catch {
      this.logFd = undefined; // no log is better than no lab
    }
    this.child = opts.spawn(
      opts.node ?? "node",
      serveArgs(opts.bin, opts.dataDir, opts.lan),
      {
        cwd: opts.cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    this.wire();
  }

  get running(): boolean {
    return !this.exited;
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
      this.finish(null, null);
    });
    // `close` follows `exit` once stdio ends. A grandchild holding the pipes can
    // delay it, so `exit` also finishes after a short grace.
    this.child.on("exit", (code, signal) => {
      setTimeout(() => this.finish(code, signal), CLOSE_GRACE_MS).unref?.();
    });
    this.child.on("close", (code, signal) => this.finish(code, signal));
  }

  private finish(code: number | null, signal: NodeJS.Signals | null) {
    if (this.exited) return;
    this.exited = true;
    this.log(`[exit] code ${code} signal ${signal}`);
    if (this.logFd !== undefined) {
      try {
        closeSync(this.logFd);
      } catch {}
      this.logFd = undefined;
    }
    for (const w of this.exitWaiters.splice(0)) w();
    this.opts.handlers.onExit({
      expected: this.stopping,
      code,
      signal,
      error: this.lastError,
      beforeReady: this.ready === undefined,
    });
  }

  private waitExit(ms: number): Promise<boolean> {
    if (this.exited) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), ms);
      this.exitWaiters.push(() => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  /** SIGTERM, then SIGKILL after `killAfterMs`. Safe to call twice. */
  async stop(): Promise<void> {
    if (this.exited) return;
    this.stopping = true;
    this.child.kill("SIGTERM");
    if (await this.waitExit(this.killAfterMs)) return;
    this.child.kill("SIGKILL");
    if (await this.waitExit(this.killAfterMs)) return;
    // The child ignored SIGKILL or never reported exit. Do not hang pi's shutdown.
    this.finish(null, "SIGKILL");
  }
}
