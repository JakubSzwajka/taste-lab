// Drives the /taste extension through its entry point against a fake child.
import { EventEmitter } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTasteExtension, type TasteDeps } from "../pi/extensions/taste";
import type { ChildLike, SpawnFn } from "../pi/lib/lab-process";
import type {
  CustomMessageIn,
  SendOptions,
  TasteCtx,
  TastePi,
} from "../pi/lib/pi-api";

const TOKEN = "Zx9_Qw-8rT5yU3iO1pLk2j";

class FakeChild extends EventEmitter implements ChildLike {
  stdout = new PassThrough();
  stderr = new PassThrough();
  signals: string[] = [];
  /** Signals the fake obeys. SIGKILL always works unless listed in `ignore`. */
  constructor(private ignore: string[] = []) {
    super();
  }
  kill(signal: NodeJS.Signals = "SIGTERM") {
    this.signals.push(signal);
    if (!this.ignore.includes(signal))
      setImmediate(() => this.die(null, signal));
    return true;
  }
  die(code: number | null, signal: NodeJS.Signals | null = null) {
    this.stdout.end();
    this.stderr.end();
    this.emit("exit", code, signal);
    setImmediate(() => this.emit("close", code, signal));
  }
  send(obj: unknown) {
    this.stdout.write(`${JSON.stringify(obj)}\n`);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 5));

let tmp: string;
let dataDir: string;
let children: FakeChild[];
let spawnCalls: { command: string; args: string[] }[];
let sent: { message: CustomMessageIn; options?: SendOptions }[];
let commands: Map<string, (args: string, ctx: TasteCtx) => Promise<void>>;
let shutdown: (() => Promise<void> | void) | undefined;
function fakeUi() {
  return {
    notify: vi.fn<(message: string, type?: string) => void>(),
    confirm: vi.fn(async (_title: string, _message: string) => true),
    setStatus: vi.fn<(key: string, text: string | undefined) => void>(),
    setWidget:
      vi.fn<
        (key: string, content: string[] | undefined, options?: object) => void
      >(),
  };
}
let ctx: TasteCtx & { ui: ReturnType<typeof fakeUi> };
let nextIgnore: string[];

function load(overrides: Partial<TasteDeps> = {}) {
  const spawn: SpawnFn = (command, args) => {
    spawnCalls.push({ command, args });
    const child = new FakeChild(nextIgnore);
    children.push(child);
    return child;
  };
  const pi: TastePi = {
    registerCommand: (name, opts) => commands.set(name, opts.handler),
    on: (_event, handler) => {
      shutdown = () =>
        handler({ type: "session_shutdown", reason: "quit" }, ctx);
    },
    sendMessage: (message, options) => sent.push({ message, options }),
  };
  createTasteExtension({
    spawn,
    bin: "/lab/bin/taste-lab.mjs",
    logDir: join(tmp, "logs"),
    killAfterMs: 30,
    ...overrides,
  })(pi);
}

const taste = (args = "") => {
  const handler = commands.get("taste");
  if (!handler) throw new Error("no /taste");
  return handler(args, ctx);
};

const ready = (
  lan: string | null = `http://192.168.1.23:5301/?k=${TOKEN}`,
) => ({
  event: "ready",
  port: 5301,
  dataDir,
  local: "http://127.0.0.1:5301/",
  lan,
});
const entry = {
  ts: "2026-10-29T10:00:00.000Z",
  round: "round-004",
  component: "card",
  level: "component",
  shown: ["a", "b"],
  pick: "a",
  tags: ["quiet"],
  reason: "calmer",
  theme: "light",
  view: "columns",
};
const notes = () => ctx.ui.notify.mock.calls.map((c) => String(c[0]));

function assertModelNeverSawSecrets() {
  for (const { message } of sent) {
    const all = JSON.stringify(message);
    expect(all).not.toContain(TOKEN);
    expect(all).not.toContain("k=");
    expect(all).not.toContain("192.168.1.23");
  }
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-pi-"));
  dataDir = join(tmp, ".taste-lab");
  mkdirSync(dataDir);
  children = [];
  spawnCalls = [];
  sent = [];
  commands = new Map();
  shutdown = undefined;
  nextIgnore = [];
  ctx = { cwd: tmp, hasUI: true, ui: fakeUi() };
});
afterEach(async () => {
  await shutdown?.();
  rmSync(tmp, { recursive: true, force: true });
});

describe("/taste lifecycle", () => {
  it("spawns serve --events --lan, shows links in the UI only, wakes the agent on answers", async () => {
    load();
    await taste();
    expect(spawnCalls).toEqual([
      {
        command: "node",
        args: [
          "/lab/bin/taste-lab.mjs",
          "serve",
          "--dir",
          dataDir,
          "--events",
          "--lan",
        ],
      },
    ]);
    const child = children[0];
    child.stderr.write(`LAN link: http://192.168.1.23:5301/?k=${TOKEN}\n`);
    // ready arrives in two chunks
    const line = `${JSON.stringify(ready())}\n`;
    child.stdout.write(line.slice(0, 20));
    await flush();
    expect(sent).toHaveLength(0);
    child.stdout.write(line.slice(20));
    await flush();

    expect(
      notes().some(
        (n) => n.includes("http://127.0.0.1:5301/") && n.includes(`k=${TOKEN}`),
      ),
    ).toBe(true);
    expect(ctx.ui.setWidget).toHaveBeenCalledWith(
      "taste-lab",
      [
        "taste-lab local  http://127.0.0.1:5301/",
        `taste-lab LAN    http://192.168.1.23:5301/?k=${TOKEN}`,
      ],
      { placement: "belowEditor" },
    );
    expect(ctx.ui.setStatus).toHaveBeenCalledWith(
      "taste-lab",
      "taste :5301 +LAN",
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].message.content).toContain("taste-lab is running");
    expect(sent[0].options?.triggerTurn).toBeUndefined();

    child.send({ event: "answer", entry });
    child.send({
      event: "answer",
      entry: {
        ...entry,
        round: "round-005",
        pick: "mix",
        reason: "a header, b body",
      },
    });
    await flush();
    expect(sent).toHaveLength(3);
    expect(sent[1].message.customType).toBe("taste-lab-answer");
    expect(sent[1].message.content).toMatch(
      /^answered round-004 \(card, component\): pick a; tags quiet;/,
    );
    expect(sent[1].options).toEqual({
      triggerTurn: true,
      deliverAs: "followUp",
    });
    expect(sent[2].message.content).toContain("answered round-005");
    assertModelNeverSawSecrets();

    // stderr went to a log under the temp dir, with the token scrubbed
    const logs = readdirSync(join(tmp, "logs"));
    expect(logs).toHaveLength(1);
    const log = readFileSync(join(tmp, "logs", logs[0]), "utf8");
    expect(log).toContain("LAN link: http://192.168.1.23:5301/?k=[redacted]");
    expect(log).not.toContain(TOKEN);
  });

  it("local passes no --lan and a second /taste only shows the links", async () => {
    load();
    await taste("local");
    expect(spawnCalls[0].args).not.toContain("--lan");
    children[0].send(ready(null));
    await flush();
    await taste();
    await taste("status");
    expect(spawnCalls).toHaveLength(1);
    expect(
      notes().filter((n) => n === "taste-lab local  http://127.0.0.1:5301/"),
    ).toHaveLength(3);
  });

  it("/taste stop sends SIGTERM and clears the UI", async () => {
    load();
    await taste();
    children[0].send(ready());
    await flush();
    await taste("stop");
    expect(children[0].signals).toEqual(["SIGTERM"]);
    await flush();
    expect(notes()).toContain("taste-lab stopped");
    expect(ctx.ui.setWidget).toHaveBeenLastCalledWith("taste-lab", undefined);
    expect(ctx.ui.setStatus).toHaveBeenLastCalledWith("taste-lab", undefined);
    await taste("status");
    expect(notes().at(-1)).toContain("not running");
    // a new /taste starts a new server
    await taste();
    expect(spawnCalls).toHaveLength(2);
  });

  it("session_shutdown escalates to SIGKILL when SIGTERM is ignored", async () => {
    nextIgnore = ["SIGTERM"];
    load();
    await taste();
    children[0].send(ready());
    await flush();
    await shutdown?.();
    expect(children[0].signals).toEqual(["SIGTERM", "SIGKILL"]);
    await shutdown?.(); // idempotent
    expect(children[0].signals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  it("tells the operator when the server dies or fails to start", async () => {
    load();
    await taste();
    children[0].send(ready());
    await flush();
    children[0].die(1);
    await flush();
    expect(notes().at(-1)).toMatch(
      /^taste-lab stopped \(exit code 1\)\. Log: .*serve-.*\.log$/,
    );
    expect(ctx.ui.setWidget).toHaveBeenLastCalledWith("taste-lab", undefined);

    await taste("--dir .taste-lab");
    children[1].send({ event: "error", message: "port 5301 is in use" });
    children[1].die(2);
    await flush();
    expect(notes()).toContain("taste-lab: port 5301 is in use");
    expect(notes().at(-1)).toContain(
      "taste-lab failed to start (exit code 2): port 5301 is in use",
    );
    assertModelNeverSawSecrets();
  });

  it("asks before init when the data dir is missing", async () => {
    const init = vi.fn(async (_bin: string, dir: string) => {
      mkdirSync(dir);
      return { ok: true, output: "" };
    });
    load({ init });
    ctx.ui.confirm.mockResolvedValueOnce(false);
    await taste("--dir new/.taste-lab");
    expect(init).not.toHaveBeenCalled();
    expect(spawnCalls).toHaveLength(0);

    mkdirSync(join(tmp, "new"));
    await taste("--dir new/.taste-lab");
    expect(init).toHaveBeenCalledWith(
      "/lab/bin/taste-lab.mjs",
      join(tmp, "new/.taste-lab"),
    );
    expect(spawnCalls).toHaveLength(1);
  });

  it("does not spawn when init fails or the path is a file", async () => {
    load({ init: async () => ({ ok: false, output: "refusing" }) });
    await taste("--dir missing");
    expect(notes().at(-1)).toBe("taste-lab init failed: refusing");
    writeFileSync(join(tmp, "a-file"), "");
    await taste(`--dir ${join(tmp, "a-file")}`);
    expect(notes().at(-1)).toContain("is not a directory");
    expect(spawnCalls).toHaveLength(0);
  });
});
