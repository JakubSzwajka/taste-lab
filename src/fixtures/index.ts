import { rows } from "./rows";
import { tasks } from "./tasks";

export { formatCurrency, formatDate } from "./format";
export type { Person, Row, Task } from "./types";
export { rows, tasks };

/** Keyed by `fixture` in round.json. Add a key here to add a fixture. */
export const fixtures = { tasks, rows } as const;
export type FixtureKey = keyof typeof fixtures;
export const fixtureKeys = Object.keys(fixtures) as FixtureKey[];
