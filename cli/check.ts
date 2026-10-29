import { readdirSync } from "node:fs";
import { join } from "node:path";
import { configProblems, dirProblem, labPaths } from "../server/lab-dir.ts";
import { loadTheme } from "../server/theme-file.ts";
import { type GlobInput, loadRounds } from "../src/lib/rounds.ts";
import { checkLibrary } from "./check-library.ts";
import { errMsg, kindOf, readText } from "./fs-util.ts";
import { scanVariants } from "./scan-variants.ts";

/** The lab's stock tokens: theme.css may set exactly the variables defined here. */
const STOCK_CSS = join(import.meta.dirname, "../src/index.css");

/**
 * Loads `fixtures/index.ts` with Vite and checks the two exports the app uses:
 * `fixtures` (key -> data) and `fixtureKeys` (the keys, as the app reads them).
 * Returns the keys, or readable problems.
 */
async function loadFixtureKeys(
  file: string,
  root: string,
): Promise<{ keys: string[] } | { errors: string[] }> {
  let module: { fixtures?: unknown; fixtureKeys?: unknown };
  try {
    const { runnerImport } = await import("vite");
    ({ module } = await runnerImport<typeof module>(file, {
      root,
      logLevel: "silent",
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return { errors: [`fixtures/index.ts could not be loaded: ${msg}`] };
  }
  const { fixtures, fixtureKeys } = module;
  const errors: string[] = [];
  const mapOk =
    typeof fixtures === "object" &&
    fixtures !== null &&
    !Array.isArray(fixtures);
  if (!mapOk) errors.push("fixtures/index.ts must export a `fixtures` object");
  const keysOk =
    Array.isArray(fixtureKeys) &&
    fixtureKeys.every((k) => typeof k === "string");
  if (!keysOk) {
    errors.push(
      "fixtures/index.ts must export `fixtureKeys`, an array of strings",
    );
  }
  if (!mapOk || !keysOk) return { errors };
  const mapKeys = Object.keys(fixtures as object);
  const listed = fixtureKeys as string[];
  const missing = mapKeys.filter((k) => !listed.includes(k));
  const extra = [...new Set(listed.filter((k) => !mapKeys.includes(k)))];
  if (missing.length > 0) {
    errors.push(`fixtureKeys lacks fixtures: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    errors.push(
      `fixtureKeys names keys that are not in fixtures: ${extra.join(", ")}`,
    );
  }
  if (new Set(listed).size !== listed.length) {
    errors.push("fixtureKeys has duplicate entries");
  }
  if (errors.length > 0) return { errors };
  return { keys: mapKeys };
}

/**
 * Validates a `.taste-lab` dir the way the app and `pnpm test` do: config.json,
 * fixtures, every round.json, and the variant scanner on rounds/.
 * Returns readable problems. Empty means clean.
 */
export async function checkDataDir(dir: string): Promise<string[]> {
  if (kindOf(dir) !== "dir") return [`${dir} is not a directory`];
  const bad = dirProblem(dir);
  if (bad) return [bad];
  const paths = labPaths(dir);
  const problems: string[] = [];

  if (kindOf(paths.config) !== "missing") {
    const r = readText(paths.config, "config.json");
    if ("error" in r) problems.push(r.error);
    else {
      try {
        problems.push(...configProblems(JSON.parse(r.text)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        problems.push(`config.json is not valid JSON: ${msg}`);
      }
    }
  }

  // theme.css: a missing file is fine. Each problem carries its line number.
  for (const p of loadTheme(dir, STOCK_CSS).problems) {
    problems.push(p.line > 0 ? `theme.css:${p.line}: ${p.message}` : p.message);
  }

  let fixtureKeys: string[] = [];
  const fixturesKind = kindOf(paths.fixtures);
  if (fixturesKind === "missing") {
    problems.push("fixtures/index.ts is missing");
  } else if (fixturesKind !== "file") {
    problems.push(
      `fixtures/index.ts is ${fixturesKind === "dir" ? "a directory, not a file" : "not readable (dangling or looping symlink?)"}`,
    );
  } else {
    const r = await loadFixtureKeys(paths.fixtures, dir);
    if ("errors" in r) problems.push(...r.errors);
    else fixtureKeys = r.keys;
  }

  const roundsKind = kindOf(paths.rounds);
  if (roundsKind !== "dir") {
    problems.push(
      roundsKind === "missing"
        ? "rounds/ is missing"
        : "rounds/ is not a readable directory",
    );
    problems.push(...checkLibrary(dir, []));
    return problems;
  }
  // Same input shape as the app's import.meta.glob, so the same validator runs.
  const input: GlobInput = { json: {}, modules: {} };
  const stub = async () => ({ default: () => null });
  let names: string[] = [];
  try {
    names = readdirSync(paths.rounds).sort();
  } catch (e) {
    problems.push(`rounds/ cannot be read (${errMsg(e)})`);
  }
  for (const name of names) {
    const roundDir = join(paths.rounds, name);
    const kind = kindOf(roundDir);
    if (kind === "dangling") {
      problems.push(`rounds/${name}: dangling symlink`);
      continue;
    }
    if (kind !== "dir") continue;
    const r = readText(
      join(roundDir, "round.json"),
      `rounds/${name}/round.json`,
    );
    if ("error" in r) {
      problems.push(
        r.error.endsWith("is missing")
          ? `rounds/${name}: round.json is missing`
          : r.error,
      );
      continue;
    }
    input.json[`/rounds/${name}/round.json`] = r.text;
    try {
      for (const f of readdirSync(roundDir)) {
        if (f.endsWith(".tsx")) input.modules[`/rounds/${name}/${f}`] = stub;
      }
    } catch (e) {
      problems.push(`rounds/${name}: cannot list files (${errMsg(e)})`);
    }
  }
  for (const r of loadRounds(input, fixtureKeys)) {
    if (!r.ok) for (const e of r.errors) problems.push(`rounds/${r.id}: ${e}`);
  }
  for (const v of scanVariants(paths.rounds)) {
    const at = `rounds/${v.file}`;
    if (v.line === 0) {
      // Skip a filesystem problem already reported above for the same path.
      const seen = problems.some(
        (p) => p.startsWith(`${at}:`) || p.startsWith(`${at} `),
      );
      if (!seen) problems.push(`${at}: ${v.message}`);
    } else problems.push(`${at}:${v.line}: ${v.message}`);
  }
  const roundIds = names.filter((n) => kindOf(join(paths.rounds, n)) === "dir");
  problems.push(...checkLibrary(dir, roundIds));
  return problems;
}
