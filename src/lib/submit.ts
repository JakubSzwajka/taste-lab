import type { LogResponse } from "./api";
import type { TasteEntry } from "./taste";

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
