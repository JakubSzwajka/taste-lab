import { readdirSync } from "node:fs";
import { join } from "node:path";
import { dirProblem } from "../server/lab-dir.ts";
import { checkLibrary } from "./check-library.ts";
import { kindOf, readText } from "./fs-util.ts";

export type LibraryListing = {
  name: string;
  status: string | null;
  title: string | null;
  path: string;
  exampleCount: number;
  problems: string[];
};

/** Lists entries while delegating schema and source validation to checkLibrary. */
export function listLibrary(
  dir: string,
  options: { status?: "draft" | "agreed" } = {},
): { entries: LibraryListing[]; problems: string[] } {
  const unsafe = dirProblem(dir);
  if (unsafe) return { entries: [], problems: [unsafe] };
  if (kindOf(dir) !== "dir")
    return { entries: [], problems: [`${dir} is not a directory`] };

  const root = join(dir, "library");
  const rootKind = kindOf(root);
  if (rootKind === "missing") return { entries: [], problems: [] };
  if (rootKind !== "dir") {
    return { entries: [], problems: ["library/ is not a readable directory"] };
  }
  let names: string[];
  try {
    names = readdirSync(root)
      .filter(
        (name) => !name.startsWith(".") && kindOf(join(root, name)) === "dir",
      )
      .sort();
  } catch {
    return { entries: [], problems: ["library/ cannot be read"] };
  }

  const roundsRoot = join(dir, "rounds");
  let rounds: string[] = [];
  try {
    if (kindOf(roundsRoot) === "dir") {
      rounds = readdirSync(roundsRoot).filter(
        (name) => kindOf(join(roundsRoot, name)) === "dir",
      );
    }
  } catch {
    // Library validation still reports provenance against the available rounds.
  }
  const validation = checkLibrary(dir, rounds);
  const entries = names
    .map((name): LibraryListing => {
      const prefix = `library/${name}: `;
      const problems = validation
        .filter((problem) => problem.startsWith(prefix))
        .map((problem) => problem.slice(prefix.length));
      const metaFile = readText(
        join(root, name, "meta.json"),
        `library/${name}/meta.json`,
      );
      let meta: Record<string, unknown> = {};
      if (!("error" in metaFile)) {
        try {
          const parsed: unknown = JSON.parse(metaFile.text);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed)
          ) {
            meta = parsed as Record<string, unknown>;
          }
        } catch {
          // The shared validator supplies the useful parse error.
        }
      }
      return {
        name,
        status: typeof meta.status === "string" ? meta.status : null,
        title: typeof meta.title === "string" ? meta.title : null,
        path: join(root, name),
        exampleCount: Array.isArray(meta.examples) ? meta.examples.length : 0,
        problems,
      };
    })
    .filter(
      (entry) =>
        options.status === undefined || entry.status === options.status,
    );
  const problems = validation.filter(
    (problem) => !names.some((name) => problem.startsWith(`library/${name}:`)),
  );
  return { entries, problems };
}
