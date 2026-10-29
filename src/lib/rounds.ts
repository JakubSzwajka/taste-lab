import type { ComponentType } from "react";

export type Level = "token" | "component" | "layout";

export type VariantSpec = {
  id: string;
  file: string;
  label: string;
  changes: string;
  tokens?: Record<string, string>;
};

export type RoundSpec = {
  id: string;
  level: Level;
  component: string;
  question: string;
  fixture: string;
  basedOn: { round: string; pick: string } | null;
  variants: VariantSpec[];
};

export type VariantLoader = () => Promise<{ default: ComponentType }>;

export type LoadedRound =
  | {
      ok: true;
      id: string;
      spec: RoundSpec;
      loaders: Record<string, VariantLoader>;
    }
  | { ok: false; id: string; errors: string[] };

/** Shape of the two `import.meta.glob` results. Injected so tests need no Vite. */
export type GlobInput = {
  /** path -> raw text of round.json (glob with `query: "?raw"`) */
  json: Record<string, string>;
  /** path -> lazy import of a variant module */
  modules: Record<string, VariantLoader>;
};

const LEVELS = ["token", "component", "layout"];
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v !== "";

/** Returns a list of readable errors. Empty list means valid. */
export function validateRound(
  data: unknown,
  ctx: { dir: string; files: string[]; fixtureKeys: string[] },
): { spec: RoundSpec | null; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(data)) {
    return { spec: null, errors: ["round.json must be a JSON object"] };
  }
  if (!isStr(data.id)) errors.push("id must be a non-empty string");
  else if (data.id !== ctx.dir) {
    errors.push(`id "${data.id}" must match its folder name "${ctx.dir}"`);
  }
  if (typeof data.level !== "string" || !LEVELS.includes(data.level)) {
    errors.push(`level must be one of ${LEVELS.join(", ")}`);
  }
  if (!isStr(data.component))
    errors.push("component must be a non-empty string");
  if (!isStr(data.question)) errors.push("question must be a non-empty string");
  if (!isStr(data.fixture)) errors.push("fixture must be a non-empty string");
  else if (!ctx.fixtureKeys.includes(data.fixture)) {
    errors.push(
      `fixture "${data.fixture}" is unknown. Known: ${ctx.fixtureKeys.join(", ")}`,
    );
  }
  if (data.basedOn !== null && data.basedOn !== undefined) {
    if (
      !isObj(data.basedOn) ||
      !isStr(data.basedOn.round) ||
      !isStr(data.basedOn.pick)
    ) {
      errors.push(
        'basedOn must be null or { "round": string, "pick": string }',
      );
    }
  }
  const variants = data.variants;
  if (!Array.isArray(variants)) {
    errors.push("variants must be an array");
  } else {
    if (variants.length < 2 || variants.length > 4) {
      errors.push(
        `variants must have 2 to 4 entries, found ${variants.length}`,
      );
    }
    const seen = new Set<string>();
    variants.forEach((v, i) => {
      const at = `variants[${i}]`;
      if (!isObj(v)) {
        errors.push(`${at} must be an object`);
        return;
      }
      if (!isStr(v.id)) errors.push(`${at}.id must be a non-empty string`);
      else if (v.id === "none" || v.id === "mix") {
        errors.push(`${at}.id must not be "${v.id}" (reserved)`);
      } else if (seen.has(v.id))
        errors.push(`${at}.id "${v.id}" is duplicated`);
      else seen.add(v.id);
      if (!isStr(v.label))
        errors.push(`${at}.label must be a non-empty string`);
      if (!isStr(v.changes))
        errors.push(`${at}.changes must be a non-empty string`);
      if (!isStr(v.file)) errors.push(`${at}.file must be a non-empty string`);
      else if (!ctx.files.includes(v.file)) {
        errors.push(`${at}.file "${v.file}" not found in ${ctx.dir}/`);
      }
      if (v.tokens !== undefined) {
        if (!isObj(v.tokens)) errors.push(`${at}.tokens must be an object`);
        else {
          for (const [k, val] of Object.entries(v.tokens)) {
            if (!/^--[\w-]+$/.test(k)) {
              errors.push(
                `${at}.tokens key "${k}" must be a CSS variable like --radius`,
              );
            }
            if (typeof val !== "string") {
              errors.push(`${at}.tokens "${k}" must be a string`);
            }
          }
        }
      }
    });
  }
  if (errors.length > 0) return { spec: null, errors };
  const d = data as unknown as RoundSpec;
  return { spec: { ...d, basedOn: d.basedOn ?? null }, errors };
}

const dirOf = (path: string) => {
  const parts = path.split("/");
  return parts[parts.length - 2] ?? "";
};
const baseOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** Builds the round list from glob results. Bad rounds become error entries, never throws. */
export function loadRounds(
  input: GlobInput,
  fixtureKeys: string[],
): LoadedRound[] {
  const rounds: LoadedRound[] = [];
  for (const [path, raw] of Object.entries(input.json)) {
    const dir = dirOf(path);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rounds.push({
        ok: false,
        id: dir,
        errors: [`round.json is not valid JSON: ${msg}`],
      });
      continue;
    }
    const prefix = path.slice(0, path.lastIndexOf("/") + 1);
    const loaders: Record<string, VariantLoader> = {};
    const files: string[] = [];
    for (const [p, load] of Object.entries(input.modules)) {
      if (p.startsWith(prefix) && !baseOf(p).includes("/")) {
        files.push(baseOf(p));
        loaders[baseOf(p)] = load;
      }
    }
    const { spec, errors } = validateRound(data, { dir, files, fixtureKeys });
    if (!spec) {
      rounds.push({ ok: false, id: dir, errors });
      continue;
    }
    const byId: Record<string, VariantLoader> = {};
    for (const v of spec.variants)
      byId[v.id] = loaders[v.file] as VariantLoader;
    rounds.push({ ok: true, id: spec.id, spec, loaders: byId });
  }
  return rounds.sort((a, b) => a.id.localeCompare(b.id));
}
