import type { LogResponse } from "./api";
import type { TasteEntry } from "./taste";

export type SubmitResult = {
  /** The entry the server stored. Use it right away, do not wait for a refetch. */
  entry: TasteEntry;
  /** The fresh log, or null when the refresh failed. */
  log: LogResponse | null;
  /** Set when the POST worked but the follow-up GET failed. Non-blocking. */
  refreshError: string | null;
};

/**
 * POSTs an entry, then refreshes the log.
 * A POST failure rejects. A refresh failure does not: the entry is already saved.
 */
export async function submitEntry(
  post: () => Promise<TasteEntry>,
  refresh: () => Promise<LogResponse>,
): Promise<SubmitResult> {
  const entry = await post();
  try {
    return { entry, log: await refresh(), refreshError: null };
  } catch (e) {
    return {
      entry,
      log: null,
      refreshError: e instanceof Error ? e.message : String(e),
    };
  }
}
