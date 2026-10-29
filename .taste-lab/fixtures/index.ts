import { lab } from "./lab";

export type {
  LabRound,
  LabState,
  Level,
  Page,
  RoundStatus,
  Tag,
} from "./types";
export { lab };

/** Keyed by `fixture` in round.json. Add a key here to add a fixture. */
export const fixtures = { lab } as const;
export type FixtureKey = keyof typeof fixtures;
export const fixtureKeys = Object.keys(fixtures) as FixtureKey[];
