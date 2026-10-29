// /taste: run the lab for this repo's .taste-lab and wake the agent on each answer.
// Links (the LAN one holds a token) go to pi's UI only. The model gets text
// from pi/lib/messages.ts, which never reads `ready.lan`.
import { execFile, spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { completeTasteArgs, parseTasteArgs, TASTE_USAGE } from "../lib/args.ts";
import { type LabExit, LabProcess, type SpawnFn } from "../lib/lab-process.ts";
import {
  answerDetails,
  answerText,
  lanToken,
  linkLines,
  modelMessage,
  startedDetails,
  startedText,
  statusText,
} from "../lib/messages.ts";
import type { TasteCtx, TastePi, TasteUi } from "../lib/pi-api.ts";

export const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const KEY = "taste-lab";

/** Runs `taste-lab init`. An abort of `signal` kills the init child. */
export type InitFn = (
  bin: string,
  dataDir: string,
  signal: AbortSignal,
) => Promise<{ ok: boolean; output: string }>;

export type TasteDeps = {
  spawn: SpawnFn;
  init: InitFn;
  bin: string;
  node: string;
  logDir?: string;
  killAfterMs?: number;
};

const runInit: InitFn = (bin, dataDir, signal) =>
  new Promise((resolve) => {
    execFile(
      "node",
      [bin, "init", "--dir", dataDir],
      { signal },
      (err, stdout, stderr) => {
        resolve({ ok: !err, output: `${stdout}${stderr}`.trim() });
      },
    );
  });

const delay = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms).unref?.());

async function dirState(p: string): Promise<"dir" | "missing" | "other"> {
  try {
    return (await stat(p)).isDirectory() ? "dir" : "other";
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "other";
  }
}

export function createTasteExtension(overrides: Partial<TasteDeps> = {}) {
  const deps: TasteDeps = {
    spawn: spawn as unknown as SpawnFn,
    init: runInit,
    bin: join(PACKAGE_ROOT, "bin/taste-lab.mjs"),
    node: "node",
    ...overrides,
  };

  return function taste(pi: TastePi) {
    let lab: LabProcess | undefined;
    let ui: TasteUi | undefined;
    /** A /taste start between its first await and the spawn (dialog, init). */
    let pending: { abort: AbortController; done: Promise<void> } | undefined;
    /** After session_shutdown this runtime never spawns again. */
    let closed = false;
    const killAfterMs = deps.killAfterMs ?? 3000;

    /** Aborts a pending start and its init child. Waits a bounded time for it. */
    const cancelPending = async () => {
      const p = pending;
      pending = undefined;
      if (!p) return false;
      p.abort.abort();
      await Promise.race([p.done, delay(killAfterMs)]);
      return true;
    };

    const clearUi = () => {
      ui?.setWidget(KEY, undefined);
      ui?.setStatus(KEY, undefined);
    };

    const showLinks = (target: TasteUi) => {
      if (!lab?.ready) {
        target.notify("taste-lab is starting…", "info");
        return;
      }
      target.notify(linkLines(lab.ready).join("\n"), "info");
    };

    const onExit = (proc: LabProcess, exit: LabExit) => {
      if (lab === proc) lab = undefined;
      clearUi();
      if (exit.expected) {
        ui?.notify("taste-lab stopped", "info");
        return;
      }
      const how = exit.signal
        ? `signal ${exit.signal}`
        : `exit code ${exit.code}`;
      const why = exit.error ? `: ${exit.error}` : "";
      const phase = exit.beforeReady ? "failed to start" : "stopped";
      ui?.notify(
        `taste-lab ${phase} (${how})${why}. Log: ${proc.logPath || "none"}`,
        "error",
      );
    };

    const start = (ctx: TasteCtx, dataDir: string, lan: boolean) => {
      const abort = new AbortController();
      const done = startSteps(ctx, dataDir, lan, abort.signal).finally(() => {
        if (pending?.abort === abort) pending = undefined;
      });
      pending = { abort, done };
      return done;
    };

    const startSteps = async (
      ctx: TasteCtx,
      dataDir: string,
      lan: boolean,
      signal: AbortSignal,
    ) => {
      // Every await below can outlive a /taste stop or a shutdown.
      const cancelled = () => signal.aborted || closed;
      const state = await dirState(dataDir);
      if (cancelled()) return;
      if (state === "other") {
        ctx.ui.notify(`taste-lab: ${dataDir} is not a directory`, "error");
        return;
      }
      if (state === "missing") {
        if (!ctx.hasUI) {
          ctx.ui.notify(`taste-lab: ${dataDir} does not exist`, "error");
          return;
        }
        const yes = await ctx.ui.confirm(
          "Create a taste-lab data dir?",
          `${dataDir} does not exist. Run taste-lab init there?`,
          { signal },
        );
        if (!yes || cancelled()) return;
        const result = await deps.init(deps.bin, dataDir, signal);
        if (cancelled()) return;
        if (!result.ok) {
          ctx.ui.notify(`taste-lab init failed: ${result.output}`, "error");
          return;
        }
        ctx.ui.notify(`Created ${dataDir}`, "info");
      }
      if (lab) return showLinks(ctx.ui);

      const proc: LabProcess = new LabProcess({
        spawn: deps.spawn,
        bin: deps.bin,
        node: deps.node,
        cwd: ctx.cwd,
        dataDir,
        lan,
        logDir: deps.logDir,
        killAfterMs: deps.killAfterMs,
        handlers: {
          onReady(ready) {
            if (lab !== proc) return;
            const lines = linkLines(ready);
            ui?.notify(lines.join("\n"), "info");
            ui?.setWidget(KEY, lines, { placement: "belowEditor" });
            ui?.setStatus(KEY, statusText(ready));
            // Model-visible: the dataDir we spawned with, never the event's.
            const info = { port: ready.port, dataDir, lan: ready.lan !== null };
            const token = lanToken(ready.lan);
            pi.sendMessage(
              modelMessage(
                {
                  customType: "taste-lab",
                  content: startedText(info, token),
                  display: true,
                  details: startedDetails(info),
                },
                token,
              ),
            );
          },
          onAnswer({ entry }) {
            if (lab !== proc || !proc.ready) return;
            const token = lanToken(proc.ready.lan);
            // followUp: if the agent is busy, the answer waits for the current
            // run to end instead of steering it mid-task. Idle: a new turn starts.
            pi.sendMessage(
              modelMessage(
                {
                  customType: "taste-lab-answer",
                  content: answerText(entry, dataDir, token),
                  display: true,
                  details: answerDetails(entry, dataDir),
                },
                token,
              ),
              { triggerTurn: true, deliverAs: "followUp" },
            );
          },
          onError(message) {
            ui?.notify(`taste-lab: ${message}`, "error");
          },
          onExit(exit) {
            onExit(proc, exit);
          },
        },
      });
      lab = proc;
      ctx.ui.notify(`Starting taste-lab for ${dataDir}…`, "info");
    };

    pi.registerCommand("taste", {
      description:
        "Run taste-lab for this repo (/taste [local] [--dir <path>] | status | stop)",
      getArgumentCompletions: completeTasteArgs,
      handler: async (args, ctx) => {
        ui = ctx.ui;
        const cmd = parseTasteArgs(args, ctx.cwd);
        switch (cmd.action) {
          case "error":
            ctx.ui.notify(`${cmd.message}. ${TASTE_USAGE}`, "error");
            return;
          case "status":
            if (lab || pending) showLinks(ctx.ui);
            else
              ctx.ui.notify(
                "taste-lab is not running. Start it with /taste",
                "info",
              );
            return;
          case "stop":
            if (await cancelPending()) {
              ctx.ui.notify("taste-lab start cancelled", "info");
            } else if (lab) await lab.stop();
            else ctx.ui.notify("taste-lab is not running", "info");
            return;
          case "start":
            if (closed) return;
            if (lab) showLinks(ctx.ui);
            else if (pending) ctx.ui.notify("taste-lab is starting…", "info");
            else await start(ctx, cmd.dir, cmd.lan);
            return;
        }
      },
    });

    pi.on("session_shutdown", async () => {
      closed = true;
      const proc = lab;
      lab = undefined;
      clearUi();
      ui = undefined; // the old context is invalid after shutdown
      await Promise.all([cancelPending(), proc?.stop()]);
    });
  };
}

export default createTasteExtension();
