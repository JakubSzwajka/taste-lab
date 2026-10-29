// The data dir contract, shared by the Vite plugin and the CLI. Node only.
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export type LabConfig = { version: 1; name: string };

/** Paths inside a `.taste-lab` data dir. */
export function labPaths(dataDir: string) {
  return {
    config: join(dataDir, "config.json"),
    fixtures: join(dataDir, "fixtures", "index.ts"),
    rounds: join(dataDir, "rounds"),
    log: join(dataDir, "taste.jsonl"),
    design: join(dataDir, "DESIGN.md"),
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
