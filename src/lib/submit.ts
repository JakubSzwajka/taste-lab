import type { LogResponse } from "./api";
import type { PreviewMode } from "./flip";
import type { TasteEntry } from "./taste";
import type { Theme } from "./theme";

/** What the answer bar hands up. No tags: round-009 dropped them from the UI. */
export type Answer = { pick: string; reason: string; view: PreviewMode };

/** A pick is set, Mix has a reason, and no save is running. */
export function canSubmit(pick: string, reason: string, submitting = false) {
  if (submitting || pick === "") return false;
  return !(pick === "mix" && reason.trim() === "");
}

/**
 * The POST body for an answer. `tags` stays in the log contract but the UI
 * no longer asks for it, so new entries carry `[]`.
 */
export function answerEntry(
  round: {
    id: string;
    component: string;
    level: TasteEntry["level"];
    variants: readonly { id: string }[];
  },
  answer: Answer,
  theme: Theme,
): Omit<TasteEntry, "ts"> {
  return {
    round: round.id,
    component: round.component,
    level: round.level,
    shown: round.variants.map((v) => v.id),
    pick: answer.pick,
    tags: [],
    reason: answer.reason.trim(),
    theme,
    view: answer.view,
  };
}

export type SubmitHooks = {
  /** Called once, right after the POST succeeds and before any refresh. */
  onSaved: (entry: TasteEntry) => void;
  /** Called with the fresh log when the follow-up GET works. */
  onLog: (log: LogResponse) => void;
  /** Called with a message when the follow-up GET fails. Non-blocking. */
  onRefreshError: (message: string) => void;
};

export type SubmitResult = {
  /** The entry the server stored. */
  entry: TasteEntry;
  /** Settles when the refresh is done. It never rejects. Callers need not await it. */
  refreshed: Promise<void>;
};

/**
 * POSTs an entry. On success it calls `onSaved` at once, then starts the log
 * refresh in the background. The returned promise resolves after the POST, so a
 * stalled or failed GET can never hold up the UI. A POST failure rejects.
 */
export async function submitEntry(
  post: () => Promise<TasteEntry>,
  refresh: () => Promise<LogResponse>,
  hooks: SubmitHooks,
): Promise<SubmitResult> {
  const entry = await post();
  hooks.onSaved(entry);
  const refreshed = (async () => {
    try {
      hooks.onLog(await refresh());
    } catch (e) {
      hooks.onRefreshError(e instanceof Error ? e.message : String(e));
    }
  })();
  return { entry, refreshed };
}
