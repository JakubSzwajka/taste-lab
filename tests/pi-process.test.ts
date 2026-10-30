// LabProcess against real child processes: it owns and stops the whole tree.
import { spawn } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initDataDir } from "../cli/init";
import type { ReadyEvent } from "../pi/lib/events";
import { type LabExit, LabProcess, type SpawnFn } from "../pi/lib/lab-process";
import { freePort } from "./free-port";

const bin = resolve(import.meta.dirname, "../bin/taste-lab.mjs");
const posix = process.platform !== "win32";

/** True when something accepts TCP on 127.0.0.1:port. */
const listening = (port: number) =>
  new Promise<boolean>((ok) => {
    const s = connect(port, "127.0.0.1");
    s.once("connect", () => {
      s.destroy();
      ok(true);
    });
    s.once("error", () => ok(false));
  });

function groupAlive(pgid: number): boolean {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Pids whose process group is `pgid`, from /proc (Linux). */
function groupMembers(pgid: number): number[] {
  const out: number[] = [];
  for (const name of readdirSync("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const stat = readFileSync(`/proc/${name}/stat`, "utf8");
      // fields after the ")" of comm: state ppid pgrp ...
      const rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      if (Number(rest[2]) === pgid) out.push(Number(name));
    } catch {}
  }
  return out;
}

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-pi-proc-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function startLab(opts: {
  bin: string;
  dataDir: string;
  killAfterMs: number;
  port: number;
}) {
  let pid: number | undefined;
  const realSpawn: SpawnFn = (command, args, options) => {
    const child = spawn(command, args, options);
    pid = child.pid;
    return child;
  };
  let exit: LabExit | undefined;
  let started: LabProcess | undefined;
  const ready = new Promise<ReadyEvent>((ok, fail) => {
    const lab = new LabProcess({
      spawn: realSpawn,
      bin: opts.bin,
      node: process.execPath,
      cwd: tmp,
      dataDir: opts.dataDir,
      lan: false,
      logDir: join(tmp, "logs"),
      killAfterMs: opts.killAfterMs,
      port: opts.port,
      handlers: {
        onReady: ok,
        onAnswer() {},
        onError: (m) => fail(new Error(m)),
        onExit(e) {
          exit = e;
          fail(new Error(`exited before ready: ${JSON.stringify(e)}`));
        },
      },
    });
    started = lab;
  });
  return {
    ready,
    lab: () => started as LabProcess,
    pid: () => pid as number,
    exit: () => exit,
  };
}

describe.skipIf(!posix)("LabProcess process tree", () => {
  it("stop() kills a grandchild that ignores SIGTERM before it resolves", async () => {
    const port = await freePort();
    // The "server" spawns a grandchild that holds the port and ignores SIGTERM.
    const fake = join(tmp, "fake-serve.mjs");
    const grandchild = `const s=require("net").createServer().listen(${port},"127.0.0.1");process.on("SIGTERM",()=>{});setInterval(()=>{},1e3);`;
    const script = `
      import { spawn } from "node:child_process";
      import { connect } from "node:net";
      spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore" });
      const tryReady = () => {
        const s = connect(${port}, "127.0.0.1");
        s.once("connect", () => {
          s.destroy();
          console.log(JSON.stringify({ event: "ready", port: ${port}, dataDir: "/d", local: "http://127.0.0.1:${port}/", lan: null }));
        });
        s.once("error", () => setTimeout(tryReady, 20));
      };
      tryReady();
      setInterval(() => {}, 1e3);
    `;
    writeFileSync(fake, script);
    const run = startLab({ bin: fake, dataDir: "/d", killAfterMs: 300, port });
    await run.ready;
    const pgid = run.pid();
    expect(await listening(port)).toBe(true);
    expect(groupMembers(pgid).length).toBe(2);

    await run.lab().stop();
    expect(groupAlive(pgid)).toBe(false);
    expect(await listening(port)).toBe(false);
    expect(run.exit()?.expected).toBe(true);
    expect(run.lab().running).toBe(false);
  }, 20_000);

  it("a real `serve --events` leaves nothing listening after stop()", async () => {
    const dataDir = join(tmp, ".taste-lab");
    initDataDir(dataDir);
    const port = await freePort();
    const run = startLab({ bin, dataDir, killAfterMs: 3000, port });
    const ready = await run.ready;
    expect(ready.port).toBe(port);
    const pgid = run.pid();
    expect(ready.lan).toBeNull();
    expect([3000, 3326, 5173, 5310]).not.toContain(ready.port);
    expect(await listening(ready.port)).toBe(true);
    const members = groupMembers(pgid);
    expect(members).toContain(pgid);

    await run.lab().stop();
    expect(groupAlive(pgid)).toBe(false);
    for (const p of members) expect(groupMembers(pgid)).not.toContain(p);
    expect(await listening(ready.port)).toBe(false);
    expect(run.exit()).toMatchObject({ expected: true, beforeReady: false });
    console.log(
      `real serve: port ${ready.port}, group ${pgid} had ${members.length} process(es), none left, port closed`,
    );
  }, 30_000);
});
