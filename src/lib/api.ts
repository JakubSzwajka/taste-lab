import type { TasteEntry } from "./taste";

export type LogResponse = { entries: TasteEntry[]; skipped: number };

/**
 * `serve --lan` answers 401 when the link token cookie is missing or stale, as
 * after a restart (the token changes on every run). The browser sends the
 * cookie itself. The app never sees the token.
 */
export const UNAUTHORIZED_MESSAGE =
  "Open the link printed by `taste-lab serve --lan`";

export async function fetchLog(): Promise<LogResponse> {
  const res = await fetch("/api/taste");
  if (res.status === 401) throw new Error(UNAUTHORIZED_MESSAGE);
  if (!res.ok) throw new Error(`GET /api/taste failed (${res.status})`);
  return res.json();
}

export async function postEntry(
  entry: Omit<TasteEntry, "ts">,
): Promise<TasteEntry> {
  const res = await fetch("/api/taste", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (res.status === 401) throw new Error(UNAUTHORIZED_MESSAGE);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `POST failed (${res.status})`);
  return body.entry;
}
