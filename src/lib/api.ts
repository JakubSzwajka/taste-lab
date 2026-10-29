import type { TasteEntry } from "./taste";
import { tokenHeaders, UNAUTHORIZED_MESSAGE } from "./token";

export type LogResponse = { entries: TasteEntry[]; skipped: number };

const headers = () => tokenHeaders(localStorage);

export async function fetchLog(): Promise<LogResponse> {
  const res = await fetch("/api/taste", { headers: headers() });
  if (res.status === 401) throw new Error(UNAUTHORIZED_MESSAGE);
  if (!res.ok) throw new Error(`GET /api/taste failed (${res.status})`);
  return res.json();
}

export async function postEntry(
  entry: Omit<TasteEntry, "ts">,
): Promise<TasteEntry> {
  const res = await fetch("/api/taste", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers() },
    body: JSON.stringify(entry),
  });
  if (res.status === 401) throw new Error(UNAUTHORIZED_MESSAGE);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `POST failed (${res.status})`);
  return body.entry;
}
