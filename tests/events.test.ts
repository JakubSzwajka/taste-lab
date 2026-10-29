import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, request } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initDataDir } from "../cli/init";
import { pickPort } from "../cli/port";
import { cookieName } from "../server/lan";

const bin = resolve(import.meta.dirname, "../bin/taste-lab.mjs");

type Reply = { status: number; headers: IncomingHttpHeaders; body: string };

function http(
  port: number,
  path: string,
  headers: Record<string, string>,
  opts: { method?: string; body?: string; address?: string } = {},
): Promise<Reply> {
  return new Promise((ok, fail) => {
    const req = request(
      {
        host: opts.address ?? "127.0.0.1",
        port,
        path,
        method: opts.method ?? "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () =>
          ok({ status: res.statusCode ?? 0, headers: res.headers, body }),
        );
      },
    );
    req.on("error", fail);
    req.end(opts.body);
  });
}

/** A running `taste-lab serve`, its output split into lines as it arrives. */
type Run = {
  child: ChildProcess;
  stdout: () => string;
  stderr: () => string;
  /** Resolves with the first stdout JSON line that matches, or rejects on exit. */
  event: (
    match: (e: Record<string, unknown>) => boolean,
  ) => Promise<Record<string, unknown>>;
  exited: Promise<number | null>;
};

function start(args: string[], env: Record<string, string> = {}): Run {
  const child = spawn(process.execPath, [bin, "serve", ...args], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  let err = "";
  const waiters: (() => void)[] = [];
  const poke = () => {
    for (const w of [...waiters]) w();
  };
  child.stdout?.setEncoding("utf8").on("data", (c: string) => {
    out += c;
    poke();
  });
  child.stderr?.setEncoding("utf8").on("data", (c: string) => {
    err += c;
  });
  const exited = new Promise<number | null>((r) =>
    child.on("exit", (code) => {
      poke();
      r(code);
    }),
  );
  const lines = () =>
    out
      .split("\n")
      .filter((l) => l !== "")
      .map((l) => JSON.parse(l) as Record<string, unknown>);
  const event: Run["event"] = (match) =>
    new Promise((ok, fail) => {
      const check = () => {
        const hit = lines().find(match);
        if (hit) {
          waiters.splice(waiters.indexOf(check), 1);
          ok(hit);
        } else if (child.exitCode !== null) {
          waiters.splice(waiters.indexOf(check), 1);
          fail(new Error(`exited ${child.exitCode}\n${out}\n${err}`));
        }
      };
      waiters.push(check);
      check();
    });
  return { child, stdout: () => out, stderr: () => err, event, exited };
}

async function stop(run: Run): Promise<number | null> {
  if (run.child.exitCode === null) run.child.kill("SIGTERM");
  return run.exited;
}

const entry = (reason: string) =>
  JSON.stringify({
    round: "round-001",
    component: "card",
    level: "component",
    shown: ["a", "b"],
    pick: "b",
    tags: ["airy"],
    reason,
    theme: "dark",
    view: "flip",
  });

/** Every stdout line is one JSON object with a known event. */
function jsonOnly(stdout: string): Record<string, unknown>[] {
  expect(stdout.endsWith("\n")).toBe(true);
  const lines = stdout.slice(0, -1).split("\n");
  return lines.map((l) => {
    const e = JSON.parse(l) as Record<string, unknown>;
    expect(["ready", "answer", "error"]).toContain(e.event);
    return e;
  });
}

let tmp: string;
let dir: string;
const runs: Run[] = [];
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-events-"));
  dir = join(tmp, ".taste-lab");
  initDataDir(dir);
});
afterEach(async () => {
  for (const r of runs.splice(0)) await stop(r);
  rmSync(tmp, { recursive: true, force: true });
});

describe("serve --lan --events", () => {
  it("ready, one answer per POST from either listener, JSON-only stdout, token only in ready.lan", async () => {
    const port = await pickPort({ start: 5480 });
    // Every Vite debug channel on: the token must still appear only in ready.lan.
    const run = start(
      [
        "--dir",
        dir,
        "--lan",
        "--host",
        "127.0.0.2",
        "--port",
        String(port),
        "--events",
      ],
      { DEBUG: "vite:*" },
    );
    runs.push(run);
    const ready = await run.event((e) => e.event === "ready");
    expect(Object.keys(ready)).toEqual([
      "event",
      "port",
      "dataDir",
      "local",
      "lan",
    ]);
    expect(ready).toMatchObject({
      port,
      dataDir: dir,
      local: `http://127.0.0.1:${port}/`,
    });
    const lan = ready.lan as string;
    expect(lan).toMatch(
      new RegExp(`^http://127\\.0\\.0\\.2:${port}/\\?k=[A-Za-z0-9_-]{22}$`),
    );
    const token = new URL(lan).searchParams.get("k") as string;

    const at = { address: "127.0.0.2" };
    const lanHost = { host: `127.0.0.2:${port}` };
    const loopHost = { host: `127.0.0.1:${port}` };
    const json = { "content-type": "application/json" };
    // Open the LAN link: cookie and redirect. Then load the app on both sides.
    const link = await http(port, `/?k=${token}`, lanHost, at);
    expect(link.status).toBe(302);
    const cookie = { cookie: `${cookieName(port)}=${token}` };
    expect((await http(port, "/", { ...lanHost, ...cookie }, at)).status).toBe(
      200,
    );
    expect((await http(port, "/", loopHost)).status).toBe(200);
    expect((await http(port, "/", lanHost, at)).status).toBe(401);
    // A token sent to the loopback side is dropped before Vite logs the URL.
    expect(
      (await http(port, `/src/main.tsx?k=${token}`, loopHost)).status,
    ).toBe(302);

    const fromLoop = await http(
      port,
      "/api/taste",
      { ...loopHost, ...json },
      {
        method: "POST",
        body: entry("loopback answer"),
      },
    );
    expect(fromLoop.status).toBe(201);
    const a1 = await run.event((e) => e.event === "answer");
    expect(a1.entry).toEqual(JSON.parse(fromLoop.body).entry);

    // Rejected posts write nothing and emit nothing.
    expect(
      (
        await http(
          port,
          "/api/taste",
          { ...lanHost, ...json },
          {
            ...at,
            method: "POST",
            body: entry("no cookie"),
          },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await http(
          port,
          "/api/taste",
          { ...loopHost, ...json },
          {
            method: "POST",
            body: JSON.stringify({ pick: "zzz" }),
          },
        )
      ).status,
    ).toBe(400);

    const fromLan = await http(
      port,
      "/api/taste",
      { ...lanHost, ...cookie, ...json, origin: `http://127.0.0.2:${port}` },
      { ...at, method: "POST", body: entry("lan answer") },
    );
    expect(fromLan.status).toBe(201);
    await run.event(
      (e) =>
        e.event === "answer" &&
        (e.entry as { reason?: string }).reason === "lan answer",
    );

    expect(await stop(run)).toBe(0);
    const events = jsonOnly(run.stdout());
    expect(events.map((e) => e.event)).toEqual(["ready", "answer", "answer"]);
    const log = readFileSync(join(dir, "taste.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    // The exact entries as appended, in order.
    expect(events.slice(1).map((e) => e.entry)).toEqual(log);

    // DEBUG grep: the token is in the ready line and nowhere else.
    const all = run.stdout() + run.stderr();
    expect(run.stderr()).toContain("vite:");
    expect(all.split(token).length - 1).toBe(1);
    const readyLine = run.stdout().split("\n")[0] as string;
    expect(readyLine).toContain(token);
    expect(JSON.parse(readyLine).lan).toBe(lan);
  }, 60_000);
});

describe("serve --events without --lan", () => {
  it("ready has lan: null, answers still stream", async () => {
    const port = await pickPort({ start: 5490 });
    const run = start(["--dir", dir, "--port", String(port), "--events"]);
    runs.push(run);
    const ready = await run.event((e) => e.event === "ready");
    expect(ready).toEqual({
      event: "ready",
      port,
      dataDir: dir,
      local: `http://127.0.0.1:${port}/`,
      lan: null,
    });
    const r = await http(
      port,
      "/api/taste",
      { host: `localhost:${port}`, "content-type": "application/json" },
      { method: "POST", body: entry("local only") },
    );
    expect(r.status).toBe(201);
    await run.event((e) => e.event === "answer");
    expect(await stop(run)).toBe(0);
    expect(jsonOnly(run.stdout()).map((e) => e.event)).toEqual([
      "ready",
      "answer",
    ]);
    expect(run.stderr()).toContain("taste-lab: serving");
  }, 60_000);
});

describe("serve --events errors", () => {
  it("a busy explicit --port: one error event and exit 2", async () => {
    const port = await pickPort({ start: 5495 });
    const squat = createServer();
    await new Promise<void>((r) => squat.listen(port, "127.0.0.1", r));
    try {
      const run = start([
        "--dir",
        dir,
        "--lan",
        "--host",
        "127.0.0.2",
        "--port",
        String(port),
        "--events",
      ]);
      expect(await run.exited).toBe(2);
      expect(jsonOnly(run.stdout())).toEqual([
        {
          event: "error",
          message: `port ${port} is in use on 127.0.0.1. Pick another --port, or leave it out to take a free one.`,
        },
      ]);
      expect(run.stderr()).toContain(`port ${port} is in use`);
    } finally {
      await new Promise<void>((r) => squat.close(() => r()));
    }
  }, 30_000);

  it("a usage error is an error event too, exit 2", async () => {
    const run = start(["--dir", dir, "--host", "192.168.1.23", "--events"]);
    expect(await run.exited).toBe(2);
    expect(jsonOnly(run.stdout())).toEqual([
      { event: "error", message: "--host needs --lan" },
    ]);
  }, 30_000);

  it("a broken data dir: error event, exit 1", async () => {
    const run = start(["--dir", join(tmp, "missing"), "--events"]);
    expect(await run.exited).toBe(1);
    const [e] = jsonOnly(run.stdout());
    expect(e?.event).toBe("error");
    expect(String(e?.message)).toContain("missing");
  }, 30_000);
});
