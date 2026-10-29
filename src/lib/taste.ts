// Shared by the browser and the dev-server middleware. Keep free of node imports.
export const TAGS = [
  "airy",
  "cramped",
  "loud",
  "quiet",
  "dated",
  "clean",
  "playful",
  "serious",
  "too much",
  "too little",
] as const;

export type TasteEntry = {
  ts: string;
  round: string;
  component: string;
  level: "token" | "component" | "layout";
  shown: string[];
  pick: string;
  tags: string[];
  reason: string;
  theme: "light" | "dark";
};

export type ValidationResult =
  | { ok: true; entry: TasteEntry }
  | { ok: false; error: string };

const LEVELS = ["token", "component", "layout"];
const THEMES = ["light", "dark"];

const isString = (v: unknown): v is string => typeof v === "string";

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const isIsoTimestamp = (v: string) =>
  ISO_TS.test(v) && !Number.isNaN(Date.parse(v));

/** Validates an untrusted POST body. `ts` is filled by the server when absent. */
export function validateEntry(
  input: unknown,
  now: () => Date = () => new Date(),
): ValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const o = input as Record<string, unknown>;
  for (const key of ["round", "component"] as const) {
    if (!isString(o[key]) || o[key].trim() === "") {
      return { ok: false, error: `${key} must be a non-empty string` };
    }
  }
  if (!isString(o.level) || !LEVELS.includes(o.level)) {
    return { ok: false, error: `level must be one of ${LEVELS.join(", ")}` };
  }
  if (!isString(o.theme) || !THEMES.includes(o.theme)) {
    return { ok: false, error: `theme must be one of ${THEMES.join(", ")}` };
  }
  if (
    !Array.isArray(o.shown) ||
    o.shown.length < 2 ||
    o.shown.length > 4 ||
    !o.shown.every((s) => isString(s) && s !== "")
  ) {
    return { ok: false, error: "shown must be 2 to 4 variant ids" };
  }
  const shown = o.shown as string[];
  if (!isString(o.pick) || o.pick === "") {
    return { ok: false, error: "pick must be a variant id, none or mix" };
  }
  if (o.pick !== "none" && o.pick !== "mix" && !shown.includes(o.pick)) {
    return { ok: false, error: "pick must be one of shown, none or mix" };
  }
  const tags = o.tags ?? [];
  if (!Array.isArray(tags) || !tags.every(isString)) {
    return { ok: false, error: "tags must be an array of strings" };
  }
  const unknownTag = tags.find((t) => !(TAGS as readonly string[]).includes(t));
  if (unknownTag !== undefined) {
    return {
      ok: false,
      error: `unknown tag "${unknownTag}". Allowed: ${TAGS.join(", ")}`,
    };
  }
  const reason = o.reason ?? "";
  if (!isString(reason)) {
    return { ok: false, error: "reason must be a string" };
  }
  if (o.pick === "mix" && reason.trim() === "") {
    return { ok: false, error: "mix needs a reason that says which parts" };
  }
  let ts: string;
  if (o.ts === undefined) {
    ts = now().toISOString();
  } else if (isString(o.ts) && isIsoTimestamp(o.ts)) {
    ts = o.ts;
  } else {
    return { ok: false, error: "ts must be an ISO date string" };
  }
  return {
    ok: true,
    entry: {
      ts,
      round: o.round as string,
      component: o.component as string,
      level: o.level as TasteEntry["level"],
      shown,
      pick: o.pick,
      tags: tags as string[],
      reason,
      theme: o.theme as TasteEntry["theme"],
    },
  };
}

/** Parses JSONL text. Bad lines are skipped and reported, never thrown. */
export function parseLog(text: string): {
  entries: TasteEntry[];
  skipped: number;
} {
  const entries: TasteEntry[] = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const res = validateEntry(JSON.parse(line));
      if (res.ok) entries.push(res.entry);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return { entries, skipped };
}
