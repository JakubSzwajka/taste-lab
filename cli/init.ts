import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultName, dirProblem } from "../server/lab-dir.ts";

export class InitError extends Error {}

const ITEMS = `export type Item = {
  id: string;
  title: string;
  status: "open" | "in-progress" | "done";
  owner: string;
  /** ISO date, YYYY-MM-DD */
  updated: string;
};

/** Sample data. Replace with data shaped like this app's domain. */
export const items: Item[] = [
  {
    id: "ITEM-1",
    title: "Write the first round",
    status: "open",
    owner: "Ada Lovelace",
    updated: "2026-01-12",
  },
  {
    id: "ITEM-2",
    title: "Pick a direction for the list view",
    status: "in-progress",
    owner: "Grace Hopper",
    updated: "2026-01-10",
  },
  {
    id: "ITEM-3",
    title: "Distill the log into DESIGN.md",
    status: "done",
    owner: "Alan Turing",
    updated: "2026-01-08",
  },
];
`;

const INDEX = `import { items } from "./items";

export type { Item } from "./items";
export { items };

/** Keyed by \`fixture\` in round.json. Add a key here to add a fixture. */
export const fixtures = { items } as const;
export type FixtureKey = keyof typeof fixtures;
export const fixtureKeys = Object.keys(fixtures) as FixtureKey[];
`;

const design = (name: string) => `# Design rules: ${name}

Distilled from \`taste.jsonl\`. The agent rewrites this file every ~5 rounds.
Each rule cites the rounds that support it. Nothing here yet.

## Do

- (none yet)

## Don't

- (none yet)

## Tokens

| Token      | Value | Evidence |
| ---------- | ----- | -------- |
| (none yet) |       |          |

## Open questions

- (none yet)
`;

/**
 * Creates a `.taste-lab` skeleton at `dir`. Refuses when `dir` exists.
 * Returns the created files, relative to `dir`.
 */
export function initDataDir(dir: string, opts: { name?: string } = {}) {
  const bad = dirProblem(dir);
  if (bad) throw new InitError(bad);
  if (existsSync(dir)) {
    throw new InitError(`${dir} already exists. Not touching it.`);
  }
  const name = opts.name ?? defaultName(dir);
  const files: Record<string, string> = {
    "config.json": `${JSON.stringify({ version: 1, name }, null, 2)}\n`,
    "fixtures/index.ts": INDEX,
    "fixtures/items.ts": ITEMS,
    "rounds/.gitkeep": "",
    "taste.jsonl": "",
    "DESIGN.md": design(name),
  };
  mkdirSync(dirname(dir), { recursive: true });
  mkdirSync(dir); // not recursive: throws if it appeared since the check
  for (const [rel, text] of Object.entries(files)) {
    const file = join(dir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text, { flag: "wx" });
  }
  return Object.keys(files);
}
