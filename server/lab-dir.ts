// The data dir contract, shared by the Vite plugin and the CLI. Node only.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";

export type LabConfig = { version: 1; name: string };

/** Paths inside a `.taste-lab` data dir. */
export function labPaths(dataDir: string) {
  return {
    config: join(dataDir, "config.json"),
    fixtures: join(dataDir, "fixtures", "index.ts"),
    rounds: join(dataDir, "rounds"),
    library: join(dataDir, "library"),
    log: join(dataDir, "taste.jsonl"),
    design: join(dataDir, "DESIGN.md"),
    theme: join(dataDir, "theme.css"),
  };
}

/** `<repo>/.taste-lab` -> "repo". */
export const defaultName = (dataDir: string) =>
  basename(dirname(dataDir)) || "taste-lab";

/** Problems with config.json. A missing file is fine: the name defaults. */
export function configProblems(data: unknown): string[] {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["config.json must be a JSON object"];
  }
  const o = data as Record<string, unknown>;
  const out: string[] = [];
  if (o.version !== 1) out.push("config.json: version must be 1");
  if (o.name !== undefined && (typeof o.name !== "string" || o.name === "")) {
    out.push("config.json: name must be a non-empty string");
  }
  return out;
}

/** Reads config.json. Falls back to defaults when it is missing or broken. */
export function readLabConfig(dataDir: string): LabConfig {
  const file = labPaths(dataDir).config;
  const fallback: LabConfig = { version: 1, name: defaultName(dataDir) };
  if (!existsSync(file)) return fallback;
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    if (configProblems(data).length > 0) return fallback;
    return { version: 1, name: data.name ?? fallback.name };
  } catch {
    return fallback;
  }
}

/**
 * Why Tailwind's `@source "<dir>"` cannot carry `dir` literally, or null when it can.
 * Tailwind reads the quoted text raw: no escape decoding, and the text is a glob.
 * So a line break ends the string, a quote can end it early (and inject rules),
 * a backslash is ambiguous, and `*`, `{` and `}` turn into glob syntax.
 * `serve`, `init` and `check` reject such dirs up front with this message.
 */
export function unsafeDirReason(dir: string): string | null {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control chars are the point
  if (/[\u0000-\u001f\u007f\u0085\u2028\u2029]/.test(dir)) {
    return "contains a control or line-break character";
  }
  if (dir.includes("\\")) return "contains a backslash";
  if (/[*{}]/.test(dir)) return "contains a glob character (* { })";
  if (dir.includes('"') && dir.includes("'")) {
    return "contains both a single and a double quote";
  }
  return null;
}

/** The `@source` rule for `dir`: raw text in a quote the path does not contain. */
export function tailwindSource(dir: string): string {
  const reason = unsafeDirReason(dir);
  if (reason) throw new Error(`${dir} ${reason}. Tailwind cannot scan it.`);
  const q = dir.includes('"') ? "'" : '"';
  return `@source ${q}${dir}${q};`;
}

/** The lab's own folder (this file sits in `<lab>/server/`). */
const LAB_ROOT = resolve(import.meta.dirname, "..");

/** Real path of `p`, also when its tail does not exist yet (`init`): follows symlinks of the part that does. */
function realpathLoose(p: string): string {
  const abs = resolve(p);
  const tail: string[] = [];
  let cur = abs;
  for (;;) {
    try {
      return join(realpathSync(cur), ...tail.reverse());
    } catch {
      const up = dirname(cur);
      if (up === cur) return abs;
      tail.push(basename(cur));
      cur = up;
    }
  }
}

/**
 * Defense in depth: the lab sets `publicDir: false`, so nothing is served from
 * `<lab>/public/`. Were it served, Vite would skip its `fs.deny` list there and
 * `taste.jsonl` would be readable. Null when `dir` is outside it. Symlinks are followed.
 */
export function publicDirReason(dir: string): string | null {
  const pub = realpathLoose(join(LAB_ROOT, "public"));
  const rel = relative(pub, realpathLoose(dir));
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return `is inside the lab's public/ folder (${pub}), which Vite serves as static files. Move the data dir out of it.`;
  }
  return null;
}

/** Same message for every command. Null when the path is fine. */
export function dirProblem(dir: string): string | null {
  const reason = unsafeDirReason(dir);
  if (reason) {
    return `${JSON.stringify(dir)} ${reason}. Tailwind cannot scan such a path. Move the data dir to a path without it.`;
  }
  const pub = publicDirReason(dir);
  return pub ? `${JSON.stringify(dir)} ${pub}` : null;
}
