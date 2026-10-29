import { fixtureKeys } from "@/fixtures";
import { type GlobInput, loadRounds } from "./rounds";

// `@lab` is the served data dir (see vite.config.ts). Vite resolves aliases in globs.
const json = import.meta.glob("@lab/rounds/*/round.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as GlobInput["json"];

const modules = import.meta.glob("@lab/rounds/*/*.tsx") as GlobInput["modules"];

/** All rounds under `<dataDir>/rounds/`, sorted by id. Broken rounds carry errors. */
export const rounds = loadRounds({ json, modules }, fixtureKeys);
