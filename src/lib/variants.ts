import { fixtureKeys } from "@/fixtures";
import { type GlobInput, loadRounds } from "./rounds";

const json = import.meta.glob("/variants/*/round.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as GlobInput["json"];

const modules = import.meta.glob("/variants/*/*.tsx") as GlobInput["modules"];

/** All rounds under variants/, sorted by id. Broken rounds carry errors. */
export const rounds = loadRounds({ json, modules }, fixtureKeys);
