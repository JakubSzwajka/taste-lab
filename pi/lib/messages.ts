// Text for the operator (UI only) and for the model (custom messages).
// Model text is built from named fields only and never from `ready.lan`.
// Everything the model sees passes through `modelMessage`, which scrubs
// content and details alike.
import type { TasteEntry } from "../../src/lib/taste.ts";
import type { ReadyEvent } from "./events.ts";
import type { CustomMessageIn } from "./pi-api.ts";

export const LINK_REDACTED = "[link redacted]";
export const SECRET_REDACTED = "[redacted]";

/** A word that holds a `k=` parameter, URL or not. `pick=a` has no `\b` before `k`. */
const K_PARAM = /[^\s"'<>]*\bk=[^\s"'<>]*/g;

/**
 * Replaces each known secret, then every word with a `k=` parameter (the whole
 * link, so no literal `k=` is left). Scrub before any truncation: a cut token
 * no longer matches.
 */
export function scrubSecrets(
  text: string,
  secrets: readonly string[] = [],
): string {
  let out = text;
  for (const s of secrets) {
    if (s.length >= 8) out = out.split(s).join(SECRET_REDACTED);
  }
  return out.replace(K_PARAM, LINK_REDACTED);
}

/** Scrubs every string in a JSON-like value. */
export function scrubDeep(value: unknown, secrets: readonly string[]): unknown {
  if (typeof value === "string") return scrubSecrets(value, secrets);
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, secrets));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        scrubSecrets(k, secrets),
        scrubDeep(v, secrets),
      ]),
    );
  }
  return value;
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
  const lines = [`taste.lab local  ${ready.local}`];
  if (ready.lan) lines.push(`taste.lab LAN    ${ready.lan}`);
  return lines;
}

export function statusText(ready: ReadyEvent): string {
  return `taste.lab :${ready.port}${ready.lan ? " LAN" : ""}`;
}

/** What the model may learn about a running lab. `lan` is a flag, not the link. */
export type LabInfo = { port: number; dataDir: string; lan: boolean };

const secretsOf = (token?: string) => (token ? [token] : []);

/** Tells the agent the lab runs. No link, no token. */
export function startedText(info: LabInfo, token?: string): string {
  const where = info.lan ? "local and LAN" : "local only";
  const text =
    `taste-lab is running (${where}) for ${info.dataDir} on port ${info.port}. ` +
    "The operator has the links. Each answer arrives as a message; " +
    "on one, load the taste skill and follow it.";
  return scrubSecrets(text, secretsOf(token));
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
  const secrets = secretsOf(token);
  // Scrub each free-text field first, then cap it.
  const field = (s: string, max: number) =>
    oneLine(scrubSecrets(s, secrets), max);
  const parts = [`pick ${field(entry.pick, 40)}`];
  parts.push(`tags ${entry.tags.length > 0 ? entry.tags.join(", ") : "none"}`);
  parts.push(
    `reason ${entry.reason ? JSON.stringify(field(entry.reason, 400)) : "none"}`,
  );
  parts.push(`theme ${entry.theme}`);
  if (entry.view) parts.push(`view ${entry.view}`);
  const text =
    `answered ${field(entry.round, 40)} (${field(entry.component, 60)}, ${entry.level}): ${parts.join("; ")}. ` +
    `Data dir ${dataDir}. Load the taste skill and write the next round.`;
  return scrubSecrets(text, secrets);
}

const ROUND_ID = /^round-\d{3}$/;
const PICK = /^[a-z]{1,12}$/; // a variant id, none or mix

/** Details for the started message, from values the extension owns or checked. */
export function startedDetails(info: LabInfo): {
  dataDir: string;
  port: number;
} {
  return { dataDir: info.dataDir, port: info.port };
}

/** Details for an answer. A round or pick outside the expected shape is null. */
export function answerDetails(
  entry: TasteEntry,
  dataDir: string,
): { dataDir: string; round: string | null; pick: string | null } {
  return {
    dataDir,
    round: ROUND_ID.test(entry.round) ? entry.round : null,
    pick: PICK.test(entry.pick) ? entry.pick : null,
  };
}

/** The last step before pi.sendMessage: scrubs content and details. */
export function modelMessage(
  message: CustomMessageIn,
  token?: string,
): CustomMessageIn {
  const secrets = secretsOf(token);
  return {
    customType: message.customType,
    content: scrubSecrets(message.content, secrets),
    display: message.display,
    ...(message.details !== undefined && {
      details: scrubDeep(message.details, secrets),
    }),
  };
}
