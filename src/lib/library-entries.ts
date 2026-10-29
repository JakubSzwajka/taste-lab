import { type LibraryGlob, loadLibrary } from "./library";

// `@lab` is the served data dir (see vite.config.ts). Vite resolves aliases in globs.
const json = import.meta.glob("@lab/library/*/meta.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as LibraryGlob["json"];

const modules = import.meta.glob(
  "@lab/library/*/*.tsx",
) as LibraryGlob["modules"];

/** All entries under `<dataDir>/library/`, sorted by name. Broken entries carry errors. */
export const library = loadLibrary({ json, modules });
