// /taste: run the lab for this repo's .taste-lab and wake the agent on each answer.
// The taste_lab tool drives the same lab, so an agent can start it too.
// Links (the LAN one holds a token) go to pi's UI only. The model gets text
// from pi/lib/messages.ts and pi/lib/tool.ts, which never read `ready.lan`.
import { execFile, spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  completeTasteArgs,
  parseTasteArgs,
  resolveDataDir,
  TASTE_USAGE,
} from "../lib/args.ts";
import { type LabExit, LabProcess, type SpawnFn } from "../lib/lab-process.ts";
import {
  answerDetails,
  answerText,
  type LabInfo,
  lanToken,
  linkLines,
  modelMessage,
  scrubSecrets,
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
import {
  NOT_RUNNING_TEXT,
  runningText,
  type StringEnumFn,
  startingText,
  type TasteToolDetails,
  type TasteToolParams,
  TOOL_DESCRIPTION,
  TOOL_GUIDELINES,
  TOOL_NAME,
  type TypeBuilder,
  toolParameters,
} from "../lib/tool.ts";

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
  /** TypeBox schema of the taste_lab tool. Without one, no tool registers. */
  toolParameters?: unknown;
  /** How long a taste_lab start waits for `ready`. */
  readyTimeoutMs?: number;
};

/** How a start ended, for the tool. */
type LabOutcome = { ok: true; info: LabInfo } | { ok: false; message: string };

/** What to do when the data dir is missing. */
type MissingDir = "confirm" | "create" | "refuse";

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
    /** What the model may know about `lab` once it is ready. */
    let labInfo: LabInfo | undefined;
    /** Settles when `lab` is ready or exits. */
    let labOutcome: Promise<LabOutcome> | undefined;
    /** The data dir `lab` serves. */
    let labDir: string | undefined;
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

    const onExit = (
      proc: LabProcess,
      exit: LabExit,
      settle: (o: LabOutcome) => void,
    ) => {
      if (lab === proc) {
        lab = undefined;
        labInfo = undefined;
        labOutcome = undefined;
        labDir = undefined;
      }
      clearUi();
      if (exit.expected) {
        settle({ ok: false, message: "taste.lab stopped" });
        ui?.notify("taste.lab stopped", "info");
        return;
      }
      const how = exit.signal
        ? `signal ${exit.signal}`
        : `exit code ${exit.code}`;
      const why = exit.error ? `: ${exit.error}` : "";
      const phase = exit.beforeReady ? "failed to start" : "stopped";
      const message = `taste.lab ${phase} (${how})${why}. Log: ${proc.logPath || "none"}`;
      settle({ ok: false, message });
      ui?.notify(message, "error");
    };

    type StartOptions = { missing: MissingDir; announce: boolean };

    /** Resolves to an error message, or undefined once spawned (or already running). */
    const start = (
      ctx: TasteCtx,
      dataDir: string,
      lan: boolean,
      opts: StartOptions,
    ) => {
      const abort = new AbortController();
      const done = startSteps(ctx, dataDir, lan, opts, abort.signal).finally(
        () => {
          if (pending?.abort === abort) pending = undefined;
        },
      );
      pending = { abort, done: done.then(() => undefined) };
      return done;
    };

    const startSteps = async (
      ctx: TasteCtx,
      dataDir: string,
      lan: boolean,
      opts: StartOptions,
      signal: AbortSignal,
    ): Promise<string | undefined> => {
      // Every await below can outlive a /taste stop or a shutdown.
      const cancelled = () => signal.aborted || closed;
      const CANCELLED = "taste.lab start cancelled";
      const fail = (message: string) => {
        ctx.ui.notify(message, "error");
        return message;
      };
      const state = await dirState(dataDir);
      if (cancelled()) return CANCELLED;
      if (state === "other") {
        return fail(
          `taste.lab: ${dataDir} is not a directory. Log: none (server not started)`,
        );
      }
      if (state === "missing") {
        const missing =
          opts.missing === "confirm" && !ctx.hasUI ? "refuse" : opts.missing;
        if (missing === "refuse") {
          const hint =
            opts.missing === "confirm"
              ? ""
              : " Start with create: true to init it.";
          return fail(
            `taste.lab: ${dataDir} does not exist.${hint} Log: none (server not started)`,
          );
        }
        if (missing === "confirm") {
          const yes = await ctx.ui.confirm(
            "Create a taste.lab data dir?",
            `${dataDir} does not exist. Run taste-lab init there?`,
            { signal },
          );
          if (!yes)
            return "taste.lab: the operator declined to create the data dir";
          if (cancelled()) return CANCELLED;
        }
        const result = await deps.init(deps.bin, dataDir, signal);
        if (cancelled()) return CANCELLED;
        if (!result.ok) {
          return fail(
            `taste.lab init failed: ${result.output}. Log: none (server not started)`,
          );
        }
        ctx.ui.notify(`taste.lab created ${dataDir}`, "info");
      }
      if (lab) {
        showLinks(ctx.ui);
        return undefined;
      }

      let settle: (o: LabOutcome) => void = () => {};
      const outcome = new Promise<LabOutcome>((resolve) => {
        settle = resolve;
      });

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
            labInfo = info;
            settle({ ok: true, info });
            // A tool start reports this in its own result.
            if (!opts.announce) return;
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
            onExit(proc, exit, settle);
          },
        },
      });
      lab = proc;
      labInfo = undefined;
      labOutcome = outcome;
      labDir = dataDir;
      ctx.ui.notify(`taste.lab starting for ${dataDir}…`, "info");
      return undefined;
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
            else
              await start(ctx, cmd.dir, cmd.lan, {
                missing: "confirm",
                announce: true,
              });
            return;
        }
      },
    });

    const readyTimeoutMs = deps.readyTimeoutMs ?? 60_000;

    /** Waits for the current lab's outcome, a timeout or an abort. */
    const awaitOutcome = async (
      signal: AbortSignal | undefined,
    ): Promise<LabOutcome> => {
      const outcome = labOutcome;
      if (!outcome) return { ok: false, message: "taste.lab did not start" };
      let timer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      const stopWaiting = new Promise<LabOutcome>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              ok: false,
              message: `taste.lab is still starting after ${Math.round(readyTimeoutMs / 1000)} s. Check again with action status. Log: ${lab?.logPath || "none"}`,
            }),
          readyTimeoutMs,
        );
        onAbort = () =>
          resolve({
            ok: false,
            message:
              "Stopped waiting: the tool call was aborted. The lab may still start.",
          });
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });
      });
      try {
        return await Promise.race([outcome, stopWaiting]);
      } finally {
        clearTimeout(timer);
        if (onAbort) signal?.removeEventListener("abort", onAbort);
      }
    };

    /** Model text, scrubbed of the current LAN token and any `k=` link. */
    const toolResult = (
      text: string,
      details: TasteToolDetails,
    ): {
      content: { type: "text"; text: string }[];
      details: TasteToolDetails;
    } => {
      const token = lanToken(lab?.ready?.lan ?? null);
      return {
        content: [
          { type: "text", text: scrubSecrets(text, token ? [token] : []) },
        ],
        details,
      };
    };
    const toolError = (message: string) => {
      const token = lanToken(lab?.ready?.lan ?? null);
      return new Error(scrubSecrets(message, token ? [token] : []));
    };
    const runningDetails = (
      action: TasteToolParams["action"],
      info: LabInfo,
    ): TasteToolDetails => ({ action, state: "running", ...info });

    if (deps.toolParameters !== undefined) {
      pi.registerTool({
        name: TOOL_NAME,
        label: "taste.lab",
        description: TOOL_DESCRIPTION,
        promptSnippet: "Start, check or stop taste.lab",
        promptGuidelines: TOOL_GUIDELINES,
        parameters: deps.toolParameters,
        executionMode: "sequential",
        async execute(
          _toolCallId,
          params: TasteToolParams,
          signal,
          _onUpdate,
          ctx,
        ) {
          ui = ctx.ui;
          const { action } = params;
          if (action === "status") {
            if (lab?.ready && labInfo) {
              showLinks(ctx.ui);
              return toolResult(
                runningText(labInfo),
                runningDetails(action, labInfo),
              );
            }
            if (lab || pending) {
              return toolResult(
                labDir ? startingText(labDir) : "taste-lab is starting.",
                { action, state: "starting" },
              );
            }
            return toolResult(NOT_RUNNING_TEXT, { action, state: "stopped" });
          }
          if (action === "stop") {
            if (await cancelPending()) {
              return toolResult("taste-lab start cancelled.", {
                action,
                state: "stopped",
              });
            }
            if (!lab) {
              return toolResult(NOT_RUNNING_TEXT, { action, state: "stopped" });
            }
            await lab.stop();
            return toolResult("taste-lab stopped.", {
              action,
              state: "stopped",
            });
          }
          // start
          if (closed)
            throw toolError("taste.lab: this session is shutting down");
          const dataDir = resolveDataDir(params.dir, ctx.cwd);
          // A /taste start in flight: wait for it, then report what it made.
          if (!lab && pending) await pending.done;
          if (!lab) {
            const failure = await start(ctx, dataDir, !params.local, {
              missing: params.create ? "create" : "refuse",
              announce: false,
            });
            if (failure) throw toolError(failure);
          }
          const outcome = await awaitOutcome(signal);
          if (!outcome.ok) throw toolError(outcome.message);
          return toolResult(
            runningText(outcome.info, dataDir),
            runningDetails(action, outcome.info),
          );
        },
      });
    }

    pi.on("session_shutdown", async () => {
      closed = true;
      const proc = lab;
      lab = undefined;
      labInfo = undefined;
      labOutcome = undefined;
      labDir = undefined;
      clearUi();
      ui = undefined; // the old context is invalid after shutdown
      await Promise.all([cancelPending(), proc?.stop()]);
    });
  };
}

// Pi supplies this module at runtime. Keep it out of the package dependency tree.
// A variable import lets unit tests exercise the extension without installing pi.
const TUI_MODULE = "@earendil-works/pi-tui";
const AI_MODULE = "@earendil-works/pi-ai";
const TYPEBOX_MODULE = "typebox";
export default async function taste(pi: TastePi) {
  const [{ truncateToWidth }, { StringEnum }, { Type }] = await Promise.all([
    import(TUI_MODULE),
    import(AI_MODULE) as Promise<{ StringEnum: StringEnumFn }>,
    import(TYPEBOX_MODULE) as Promise<{ Type: TypeBuilder }>,
  ]);
  createTasteExtension({
    truncate: truncateToWidth,
    toolParameters: toolParameters(Type, StringEnum),
  })(pi);
}
