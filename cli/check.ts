import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { configProblems, labPaths } from "../server/lab-dir.ts";
import { type GlobInput, loadRounds } from "../src/lib/rounds.ts";
import { scanVariants } from "./scan-variants.ts";

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();

/** Loads `fixtures/index.ts` with Vite and returns the keys of its `fixtures` map. */
async function loadFixtureKeys(
  file: string,
  root: string,
): Promise<{ keys: string[] } | { error: string }> {
  try {
    const { runnerImport } = await import("vite");
    const { module } = await runnerImport<{ fixtures?: unknown }>(file, {
      root,
      logLevel: "silent",
    });
    const map = module.fixtures;
    if (typeof map !== "object" || map === null || Array.isArray(map)) {
      return { error: "fixtures/index.ts must export a `fixtures` object" };
    }
    return { keys: Object.keys(map) };
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return { error: `fixtures/index.ts could not be loaded: ${msg}` };
  }
}

/**
 * Validates a `.taste-lab` dir the way the app and `pnpm test` do: config.json,
 * fixtures, every round.json, and the variant scanner on rounds/.
 * Returns readable problems. Empty means clean.
 */
export async function checkDataDir(dir: string): Promise<string[]> {
  if (!isDir(dir)) return [`${dir} is not a directory`];
  const paths = labPaths(dir);
  const problems: string[] = [];

  if (existsSync(paths.config)) {
    try {
      problems.push(
        ...configProblems(JSON.parse(readFileSync(paths.config, "utf8"))),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      problems.push(`config.json is not valid JSON: ${msg}`);
    }
  }

  let fixtureKeys: string[] = [];
  if (!existsSync(paths.fixtures)) {
    problems.push("fixtures/index.ts is missing");
  } else {
    const r = await loadFixtureKeys(paths.fixtures, dir);
    if ("error" in r) problems.push(r.error);
    else fixtureKeys = r.keys;
  }

  if (!isDir(paths.rounds)) {
    problems.push("rounds/ is missing");
    return problems;
  }
  // Same input shape as the app's import.meta.glob, so the same validator runs.
  const input: GlobInput = { json: {}, modules: {} };
  const stub = async () => ({ default: () => null });
  for (const name of readdirSync(paths.rounds).sort()) {
    const roundDir = join(paths.rounds, name);
    if (!isDir(roundDir)) continue;
    const json = join(roundDir, "round.json");
    if (!existsSync(json)) {
      problems.push(`rounds/${name}: round.json is missing`);
      continue;
    }
    input.json[`/rounds/${name}/round.json`] = readFileSync(json, "utf8");
    for (const f of readdirSync(roundDir)) {
      if (f.endsWith(".tsx")) input.modules[`/rounds/${name}/${f}`] = stub;
    }
  }
  for (const r of loadRounds(input, fixtureKeys)) {
    if (!r.ok) for (const e of r.errors) problems.push(`rounds/${r.id}: ${e}`);
  }
  for (const v of scanVariants(paths.rounds)) {
    problems.push(`rounds/${v.file}:${v.line}: ${v.message}`);
  }
  return problems;
}
