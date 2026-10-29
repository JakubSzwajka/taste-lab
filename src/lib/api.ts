import type { TasteEntry } from "./taste";

export type LogResponse = { entries: TasteEntry[]; skipped: number };

export async function fetchLog(): Promise<LogResponse> {
  const res = await fetch("/api/taste");
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
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `POST failed (${res.status})`);
  return body.entry;
}
