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
} from "../lib/messages.ts";
import type { TasteCtx, TastePi, TasteUi, Truncate } from "../lib/pi-api.ts";
import {
  labName,
  lineComponent,
  progressText,
  themedStatus,
  transcriptComponent,
  widgetLines,
} from "../lib/presentation.ts";
import { qrComponent } from "../lib/qr.ts";

export const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const KEY = "taste-lab";

/** Runs `taste-lab init`. An abort of `signal` kills the init child. */
export type InitFn = (
  bin: string,
  dataDir: string,
  signal: AbortSignal,
) => Promise<{ ok: boolean; output: string }>;

export type TasteDeps = {
  truncate: Truncate;
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

export function createTasteExtension(
  overrides: Partial<TasteDeps> & Pick<TasteDeps, "truncate">,
) {
  const deps: TasteDeps = {
    spawn: spawn as unknown as SpawnFn,
    init: runInit,
    bin: join(PACKAGE_ROOT, "bin/taste-lab.mjs"),
    node: "node",
    ...overrides,
  };

  return function taste(pi: TastePi) {
    for (const type of ["taste-lab", "taste-lab-answer"]) {
      pi.registerMessageRenderer(type, (message, _options, theme) =>
        transcriptComponent(message, theme, deps.truncate),
      );
    }
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
        target.notify("taste.lab is starting…", "info");
        return;
      }
      target.notify(linkLines(lab.ready).join("\n"), "info");
    };

    const onExit = (proc: LabProcess, exit: LabExit) => {
      if (lab === proc) lab = undefined;
      clearUi();
      if (exit.expected) {
        ui?.notify("taste.lab stopped", "info");
        return;
      }
      const how = exit.signal
        ? `signal ${exit.signal}`
        : `exit code ${exit.code}`;
      const why = exit.error ? `: ${exit.error}` : "";
      const phase = exit.beforeReady ? "failed to start" : "stopped";
      ui?.notify(
        `taste.lab ${phase} (${how})${why}. Log: ${proc.logPath || "none"}`,
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
        ctx.ui.notify(
          `taste.lab: ${dataDir} is not a directory. Log: none (server not started)`,
          "error",
        );
        return;
      }
      if (state === "missing") {
        if (!ctx.hasUI) {
          ctx.ui.notify(
            `taste.lab: ${dataDir} does not exist. Log: none (server not started)`,
            "error",
          );
          return;
        }
        const yes = await ctx.ui.confirm(
          "Create a taste.lab data dir?",
          `${dataDir} does not exist. Run taste-lab init there?`,
          { signal },
        );
        if (!yes || cancelled()) return;
        const result = await deps.init(deps.bin, dataDir, signal);
        if (cancelled()) return;
        if (!result.ok) {
          ctx.ui.notify(
            `taste.lab init failed: ${result.output}. Log: none (server not started)`,
            "error",
          );
          return;
        }
        ctx.ui.notify(`taste.lab created ${dataDir}`, "info");
      }
      if (lab) return showLinks(ctx.ui);

      const liveAnswers = new Set<string>();
      const refreshWidget = (proc: LabProcess) => {
        if (lab !== proc || !proc.ready || ctx.mode !== "tui" || !ui) return;
        const target = ui;
        const ready = proc.ready;
        const name = labName(dataDir);
        const progress = progressText(dataDir, liveAnswers);
        let lastStatus: string | undefined;
        const updateStatus = () => {
          const status = themedStatus(ready, target.theme);
          if (status !== lastStatus) {
            lastStatus = status;
            target.setStatus(KEY, status);
          }
        };
        updateStatus();
        target.setWidget(
          KEY,
          (_tui, theme) =>
            lineComponent(
              () => widgetLines(ready, name, progress, theme),
              deps.truncate,
              updateStatus,
            ),
          { placement: "belowEditor" },
        );
      };
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
            refreshWidget(proc);
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
            liveAnswers.add(entry.round);
            refreshWidget(proc);
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
            ui?.notify(
              `taste.lab: ${message}. Log: ${proc.logPath || "none"}`,
              "error",
            );
          },
          onExit(exit) {
            onExit(proc, exit);
          },
        },
      });
      lab = proc;
      ctx.ui.notify(`taste.lab starting for ${dataDir}…`, "info");
    };

    pi.registerCommand("taste", {
      description:
        "Run taste.lab for this repo (/taste [local] [--dir <path>] | status | qr | stop)",
      getArgumentCompletions: completeTasteArgs,
      handler: async (args, ctx) => {
        ui = ctx.ui;
        const cmd = parseTasteArgs(args, ctx.cwd);
        switch (cmd.action) {
          case "error":
            ctx.ui.notify(
              `taste.lab: ${cmd.message}. ${TASTE_USAGE}. Log: ${lab?.logPath || "none"}`,
              "error",
            );
            return;
          case "status":
            if (lab || pending) showLinks(ctx.ui);
            else
              ctx.ui.notify(
                "taste.lab is not running. Start it with /taste",
                "info",
              );
            return;
          case "qr":
            if (!lab?.ready) {
              ctx.ui.notify(
                lab || pending
                  ? "taste.lab is starting…"
                  : "taste.lab is not running. Start it with /taste",
                "info",
              );
            } else if (!lab.ready.lan) {
              ctx.ui.notify(
                "taste.lab is local only. No LAN QR code. Stop it and run /taste to enable LAN.",
                "info",
              );
            } else if (ctx.mode !== "tui") {
              ctx.ui.notify("taste.lab QR needs pi's terminal UI", "info");
            } else {
              const link = lab.ready.lan;
              try {
                await ctx.ui.custom((_tui, theme, keys, done) =>
                  qrComponent(link, theme, deps.truncate, (data) => {
                    if (
                      keys.matches(data, "tui.select.confirm") ||
                      keys.matches(data, "tui.select.cancel")
                    )
                      done();
                  }),
                );
              } catch {
                ctx.ui.notify(
                  `taste.lab could not show the QR code. Log: ${lab?.logPath || "none"}`,
                  "error",
                );
              }
            }
            return;
          case "stop":
            if (await cancelPending()) {
              ctx.ui.notify("taste.lab start cancelled", "info");
            } else if (lab) await lab.stop();
            else ctx.ui.notify("taste.lab is not running", "info");
            return;
          case "start":
            if (closed) return;
            if (lab) showLinks(ctx.ui);
            else if (pending) ctx.ui.notify("taste.lab is starting…", "info");
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

// Pi supplies this module at runtime. Keep it out of the package dependency tree.
// A variable import lets unit tests exercise the extension without installing pi.
const TUI_MODULE = "@earendil-works/pi-tui";
export default async function taste(pi: TastePi) {
  const { truncateToWidth } = await import(TUI_MODULE);
  createTasteExtension({ truncate: truncateToWidth })(pi);
}
