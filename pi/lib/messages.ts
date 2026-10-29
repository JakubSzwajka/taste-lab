// Text for the operator (UI only) and for the model (custom messages).
// Model text is built from named fields only and never from `ready.lan`.
import type { TasteEntry } from "../../src/lib/taste.ts";
import type { ReadyEvent } from "./events.ts";

/** Replaces `?k=<token>` / `&k=<token>` and any known secret with a marker. */
export function scrubSecrets(
  text: string,
  secrets: readonly string[] = [],
): string {
  let out = text.replace(/([?&]k=)[^\s&#"'<>]+/g, "$1[redacted]");
  for (const s of secrets) {
    if (s.length >= 8) out = out.split(s).join("[redacted]");
  }
  return out;
}

/** The token in a LAN link, used to scrub logs. */
export function lanToken(lan: string | null): string | undefined {
  if (!lan) return undefined;
  try {
    return new URL(lan).searchParams.get("k") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Links for the operator: notification, widget. Never sent to the model. */
export function linkLines(ready: ReadyEvent): string[] {
  const lines = [`taste-lab local  ${ready.local}`];
  if (ready.lan) lines.push(`taste-lab LAN    ${ready.lan}`);
  return lines;
}

export function statusText(ready: ReadyEvent): string {
  return `taste :${ready.port}${ready.lan ? " +LAN" : ""}`;
}

/** Tells the agent the lab runs. No link, no token. */
export function startedText(ready: ReadyEvent, token?: string): string {
  const where = ready.lan ? "local and LAN" : "local only";
  const text =
    `taste-lab is running (${where}) for ${ready.dataDir} on port ${ready.port}. ` +
    "The operator has the links. Each answer arrives as a message; " +
    "on one, load the taste skill and follow it.";
  return scrubSecrets(text, token ? [token] : []);
}

function oneLine(s: string, max: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** One compact line per answer. Wakes the agent. */
export function answerText(
  entry: TasteEntry,
  dataDir: string,
  token?: string,
): string {
  const parts = [`pick ${entry.pick}`];
  parts.push(`tags ${entry.tags.length > 0 ? entry.tags.join(", ") : "none"}`);
  parts.push(
    `reason ${entry.reason ? JSON.stringify(oneLine(entry.reason, 400)) : "none"}`,
  );
  parts.push(`theme ${entry.theme}`);
  if (entry.view) parts.push(`view ${entry.view}`);
  const text =
    `answered ${entry.round} (${entry.component}, ${entry.level}): ${parts.join("; ")}. ` +
    `Data dir ${dataDir}. Load the taste skill and write the next round.`;
  return scrubSecrets(text, token ? [token] : []);
}
