// Drives the /taste extension through its entry point against a fake child.
import { EventEmitter } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
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
  MessageRenderer,
  SendOptions,
  TasteCtx,
  TastePi,
  TasteUi,
  WidgetFactory,
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
let renderers: Map<string, MessageRenderer>;
let widget: ReturnType<WidgetFactory> | undefined;
let qrScreen: string[];
const theme = { fg: (_color: string, text: string) => text };
const truncate = (text: string, width: number) => text.slice(0, width);
function fakeUi() {
  return {
    theme,
    custom: vi.fn<TasteUi["custom"]>(async (factory) => {
      const component = factory(
        { requestRender() {} },
        theme,
        {
          matches: (data, action) =>
            data === (action === "tui.select.confirm" ? "\r" : "\x1b"),
        },
        () => {},
      );
      qrScreen = component.render(120);
      component.handleInput?.("\r");
    }),
    notify: vi.fn<(message: string, type?: string) => void>(),
    confirm: vi.fn(async (_title: string, _message: string) => true),
    setStatus: vi.fn<(key: string, text: string | undefined) => void>(),
    setWidget: vi.fn<
      (
        key: string,
        content: string[] | WidgetFactory | undefined,
        options?: object,
      ) => void
    >((_key, content) => {
      widget =
        typeof content === "function"
          ? content({ requestRender() {} }, theme)
          : undefined;
    }),
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
    registerMessageRenderer: (type, renderer) => renderers.set(type, renderer),
    registerCommand: (name, opts) => commands.set(name, opts.handler),
    on: (_event, handler) => {
      shutdown = () =>
        handler({ type: "session_shutdown", reason: "quit" }, ctx);
    },
    sendMessage: (message, options) => sent.push({ message, options }),
  };
  createTasteExtension({
    truncate,
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
  renderers = new Map();
  widget = undefined;
  qrScreen = [];
  nextIgnore = [];
  ctx = { cwd: tmp, hasUI: true, mode: "tui", ui: fakeUi() };
});
afterEach(async () => {
  await shutdown?.();
  rmSync(tmp, { recursive: true, force: true });
});

describe("/taste lifecycle", () => {
  it("registers compact transcript renderers without changing safe messages", async () => {
    load();
    expect([...renderers.keys()]).toEqual(["taste-lab", "taste-lab-answer"]);
    await taste();
    children[0].send(ready());
    children[0].send({ event: "answer", entry });
    await flush();
    const lines = sent.flatMap(
      ({ message }) =>
        renderers
          .get(message.customType)?.(message, { expanded: false }, theme)
          .render(200) ?? [],
    );
    expect(lines[0]).toContain(`· taste.lab started ${dataDir} :5301`);
    expect(lines[1]).toBe('· taste.lab round-004 card · a "calmer"');
    assertModelNeverSawSecrets();
  });

  it("updates named widget progress on each answer, counts repeated answers once and sees new rounds", async () => {
    writeFileSync(
      join(dataDir, "config.json"),
      JSON.stringify({ version: 1, name: "My app" }),
    );
    const round = (id: string) => {
      mkdirSync(join(dataDir, "rounds", id), { recursive: true });
      writeFileSync(join(dataDir, "rounds", id, "round.json"), "{}");
    };
    round("round-004");
    round("round-005");
    writeFileSync(join(dataDir, "taste.jsonl"), `${JSON.stringify(entry)}\n`);
    load();
    await taste();
    children[0].send(ready());
    await flush();
    expect(widget?.render(120)[0]).toBe("taste.lab · My app");
    expect(widget?.render(120).at(-1)).toBe("round-005 open · 1 of 2 answered");
    children[0].send({ event: "answer", entry });
    await flush();
    expect(widget?.render(120).at(-1)).toContain("1 of 2 answered");
    children[0].send({
      event: "answer",
      entry: { ...entry, round: "round-005", pick: "none" },
    });
    await flush();
    expect(widget?.render(120).at(-1)).toBe("all answered");
    round("round-006");
    children[0].send({ event: "answer", entry });
    await flush();
    expect(widget?.render(120).at(-1)).toContain(
      "round-006 open · 2 of 3 answered",
    );
  });

  it("shows QR only in terminal UI, not messages or logs", async () => {
    load();
    await taste("qr");
    expect(notes().at(-1)).toContain("not running");
    await taste();
    await taste("qr");
    expect(notes().at(-1)).toContain("starting");
    children[0].send(ready());
    await flush();
    const before = sent.length;
    await taste("qr");
    expect(ctx.ui.custom).toHaveBeenCalledOnce();
    expect(qrScreen.join("\n")).toMatch(/[▀▄]/);
    expect(qrScreen[0]).toContain("scan to open on your LAN");
    expect(sent).toHaveLength(before);
    expect(qrScreen.join("\n")).not.toContain(TOKEN);
    assertModelNeverSawSecrets();
    const dir = join(tmp, "logs", readdirSync(join(tmp, "logs"))[0]);
    expect(readFileSync(join(dir, readdirSync(dir)[0]), "utf8")).not.toContain(
      TOKEN,
    );
    ctx.mode = "rpc";
    await taste("qr");
    expect(ctx.ui.custom).toHaveBeenCalledOnce();
    expect(notes().at(-1)).toContain("terminal UI");
  });

  it("refreshes themed status on widget invalidation", async () => {
    load();
    await taste();
    children[0].send(ready());
    await flush();
    ctx.ui.theme = { fg: (_color, text) => `new-theme:${text}` };
    widget?.invalidate();
    expect(ctx.ui.setStatus).toHaveBeenLastCalledWith(
      "taste-lab",
      "new-theme:taste.lab new-theme::5301 LAN",
    );
    const calls = ctx.ui.setStatus.mock.calls.length;
    widget?.invalidate();
    expect(ctx.ui.setStatus).toHaveBeenCalledTimes(calls);
  });

  it("reports QR failure with the log path, not the exception's link", async () => {
    load();
    await taste();
    children[0].send(ready());
    await flush();
    ctx.ui.custom.mockRejectedValueOnce(new Error(ready().lan as string));
    await taste("qr");
    expect(notes().at(-1)).toMatch(
      /^taste\.lab could not show the QR code\. Log: .*\.log$/,
    );
    expect(notes().at(-1)).not.toContain(TOKEN);
    assertModelNeverSawSecrets();
  });

  it("explains why local-only mode has no QR", async () => {
    load();
    await taste("local");
    children[0].send(ready(null));
    await flush();
    expect(widget?.render(120)).toHaveLength(3);
    expect(ctx.ui.setStatus).toHaveBeenCalledWith(
      "taste-lab",
      "taste.lab :5301",
    );
    await taste("qr");
    expect(notes().at(-1)).toContain("local only. No LAN QR code");
    expect(ctx.ui.custom).not.toHaveBeenCalled();
    assertModelNeverSawSecrets();
  });
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
      expect.any(Function),
      { placement: "belowEditor" },
    );
    expect(widget?.render(120)).toEqual([
      `taste.lab · ${tmp.split("/").at(-1)}`,
      "local http://127.0.0.1:5301/",
      `LAN   http://192.168.1.23:5301/?k=${TOKEN}`,
      "rounds unavailable",
    ]);
    expect(ctx.ui.setStatus).toHaveBeenCalledWith(
      "taste-lab",
      "taste.lab :5301 LAN",
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

    // stderr went to a log in a private dir, with the token scrubbed
    const dirs = readdirSync(join(tmp, "logs"));
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toMatch(/^taste-lab-pi-/);
    const logDir = join(tmp, "logs", dirs[0]);
    const files = readdirSync(logDir);
    expect(files).toHaveLength(1);
    const logPath = join(logDir, files[0]);
    expect(statSync(logDir).mode & 0o777).toBe(0o700);
    expect(statSync(logPath).mode & 0o777).toBe(0o600);
    const log = readFileSync(logPath, "utf8");
    expect(log).toContain("LAN link: [link redacted]");
    expect(log).not.toContain(TOKEN);
    expect(log).not.toContain("k=");
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
      notes().filter((n) => n === "taste.lab local  http://127.0.0.1:5301/"),
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
    expect(notes()).toContain("taste.lab stopped");
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
      /^taste\.lab stopped \(exit code 1\)\. Log: .*serve-.*\.log$/,
    );
    expect(ctx.ui.setWidget).toHaveBeenLastCalledWith("taste-lab", undefined);

    await taste("--dir .taste-lab");
    children[1].send({ event: "error", message: "port 5301 is in use" });
    children[1].die(2);
    await flush();
    expect(
      notes().some((n) =>
        /^taste\.lab: port 5301 is in use\. Log: .*\.log$/.test(n),
      ),
    ).toBe(true);
    expect(notes().at(-1)).toContain(
      "taste.lab failed to start (exit code 2): port 5301 is in use",
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
      expect.any(AbortSignal),
    );
    expect(spawnCalls).toHaveLength(1);
  });

  it("builds details from checked values, so hostile events leak nothing", async () => {
    load();
    await taste();
    const child = children[0];
    child.send({ ...ready(), dataDir: `/evil/${TOKEN}/?k=${TOKEN}` });
    child.send({
      event: "answer",
      entry: {
        ...entry,
        round: `round-004?k=${TOKEN}`,
        component: `card ${TOKEN}`,
        shown: ["a", `k=${TOKEN}`],
        pick: `k=${TOKEN}`,
        reason: `${"x".repeat(378)}${TOKEN}`,
      },
    });
    await flush();
    expect(sent).toHaveLength(2);
    assertModelNeverSawSecrets();
    expect(sent[0].message.details).toEqual({ dataDir, port: 5301 });
    expect(sent[0].message.content).toContain(`for ${dataDir} on port 5301`);
    expect(sent[1].message.details).toEqual({
      dataDir,
      round: null,
      pick: null,
    });
  });

  it("shutdown during a slow init kills init and never spawns", async () => {
    let finishInit: (() => void) | undefined;
    let initSignal: AbortSignal | undefined;
    const init = vi.fn(
      (_bin: string, dir: string, signal: AbortSignal) =>
        new Promise<{ ok: boolean; output: string }>((resolve) => {
          initSignal = signal;
          finishInit = () => {
            mkdirSync(dir);
            resolve({ ok: true, output: "" });
          };
        }),
    );
    load({ init });
    const started = taste("--dir new-lab");
    await flush();
    expect(init).toHaveBeenCalledTimes(1);
    // a second /taste while starting does not start another
    await taste("--dir new-lab");
    expect(notes().at(-1)).toBe("taste.lab is starting…");
    const down = shutdown?.();
    expect(initSignal?.aborted).toBe(true);
    finishInit?.();
    await down;
    await started;
    await flush();
    expect(spawnCalls).toHaveLength(0);
    // this runtime is closed: a later /taste does nothing
    await taste();
    expect(spawnCalls).toHaveLength(0);
  });

  it("/taste stop cancels a pending start, during the dialog or init", async () => {
    let confirmSignal: AbortSignal | undefined;
    ctx.ui.confirm.mockImplementationOnce(
      (_t: string, _m: string, opts?: { signal?: AbortSignal }) =>
        new Promise<boolean>((resolve) => {
          confirmSignal = opts?.signal;
          opts?.signal?.addEventListener("abort", () => resolve(false));
        }),
    );
    let finishInit: (() => void) | undefined;
    const init = vi.fn(
      (_bin: string, dir: string, _signal: AbortSignal) =>
        new Promise<{ ok: boolean; output: string }>((resolve) => {
          finishInit = () => {
            mkdirSync(dir, { recursive: true });
            resolve({ ok: true, output: "" });
          };
        }),
    );
    load({ init });
    const first = taste("--dir a-lab");
    await flush();
    await taste("stop");
    expect(confirmSignal?.aborted).toBe(true);
    await first;
    expect(notes().at(-1)).toBe("taste.lab start cancelled");
    expect(init).not.toHaveBeenCalled();

    const second = taste("--dir b-lab");
    await flush();
    expect(init).toHaveBeenCalledTimes(1);
    const stopping = taste("stop");
    finishInit?.();
    await stopping;
    await second;
    await flush();
    expect(notes().at(-1)).toBe("taste.lab start cancelled");
    expect(spawnCalls).toHaveLength(0);

    // the runtime still works: the dir now exists, so /taste spawns
    await taste("--dir b-lab");
    expect(spawnCalls).toHaveLength(1);
  });

  it("does not spawn when init fails or the path is a file", async () => {
    load({ init: async () => ({ ok: false, output: "refusing" }) });
    await taste("--dir missing");
    expect(notes().at(-1)).toBe(
      "taste.lab init failed: refusing. Log: none (server not started)",
    );
    writeFileSync(join(tmp, "a-file"), "");
    await taste(`--dir ${join(tmp, "a-file")}`);
    expect(notes().at(-1)).toContain("is not a directory");
    expect(spawnCalls).toHaveLength(0);
  });
});
