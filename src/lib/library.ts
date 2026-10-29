/** The library contract: `<dataDir>/library/<name>/{<Name>.tsx, examples.tsx, meta.json}`. */

export const STATUSES = ["draft", "agreed"] as const;
export type LibraryStatus = (typeof STATUSES)[number];
export const WIDTHS = ["column", "full"] as const;
export type ExampleWidth = (typeof WIDTHS)[number];

export type LibraryExample = {
  export: string;
  title: string;
  width: ExampleWidth;
};
export type Provenance = { round: string; pick: string; note: string };
export type LibraryMeta = {
  name: string;
  title: string;
  description: string;
  status: LibraryStatus;
  examples: LibraryExample[];
  provenance: Provenance[];
  rules: string[];
};

export type ModuleExports = Record<string, unknown>;
export type ModuleLoader = () => Promise<ModuleExports>;

export type LibraryEntry =
  | {
      ok: true;
      name: string;
      meta: LibraryMeta;
      loadComponent: ModuleLoader;
      loadExamples: ModuleLoader;
    }
  | { ok: false; name: string; errors: string[] };

/** Shape of the two `import.meta.glob` results. Injected so tests need no Vite. */
export type LibraryGlob = {
  /** path -> raw text of meta.json (glob with `query: "?raw"`) */
  json: Record<string, string>;
  /** path -> lazy import of a `.tsx` module in a library folder */
  modules: Record<string, ModuleLoader>;
};

/** kebab-case: lowercase words joined by single dashes, starting with a letter. */
export const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const IDENT_RE = /^[A-Za-z_$][\w$]*$/;

/** "task-card" -> "TaskCard". The component's file name and named export. */
export const pascalCase = (name: string) =>
  name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v !== "";

export const folderNameProblem = (name: string) =>
  NAME_RE.test(name)
    ? null
    : `folder name "${name}" must be kebab-case (lowercase words joined by dashes, like task-card)`;

export type MetaContext = {
  /** The folder name. `meta.name` must equal it. */
  dir: string;
  /** Base names of the `.tsx` files in the folder. */
  files: string[];
  /**
   * Known value exports per file, when they can be read statically (the CLI).
   * A file that is not in the map is not checked. The app checks at render time.
   */
  exports?: Partial<Record<string, string[]>>;
  /** Round ids that exist. When given, each provenance round must be one. */
  rounds?: string[];
};

/** Returns readable errors. An empty list means a valid entry. */
export function validateMeta(
  data: unknown,
  ctx: MetaContext,
): { meta: LibraryMeta | null; errors: string[] } {
  const errors: string[] = [];
  const nameProblem = folderNameProblem(ctx.dir);
  const nameOk = nameProblem === null;
  if (nameProblem) errors.push(nameProblem);
  const component = nameOk ? pascalCase(ctx.dir) : null;
  if (component) {
    for (const file of [`${component}.tsx`, "examples.tsx"]) {
      if (!ctx.files.includes(file)) errors.push(`${file} is missing`);
    }
    const known = ctx.exports?.[`${component}.tsx`];
    if (known && !known.includes(component)) {
      errors.push(
        `${component}.tsx must export a component named ${component}`,
      );
    }
  }
  if (!isObj(data)) {
    errors.push("meta.json must be a JSON object");
    return { meta: null, errors };
  }
  if (!isStr(data.name)) errors.push("name must be a non-empty string");
  else if (data.name !== ctx.dir) {
    errors.push(`name "${data.name}" must match its folder name "${ctx.dir}"`);
  }
  if (!isStr(data.title)) errors.push("title must be a non-empty string");
  if (!isStr(data.description)) {
    errors.push("description must be a non-empty string");
  }
  if (
    typeof data.status !== "string" ||
    !(STATUSES as readonly string[]).includes(data.status)
  ) {
    errors.push(`status must be one of ${STATUSES.join(", ")}`);
  }

  const knownExamples = ctx.exports?.["examples.tsx"];
  if (!Array.isArray(data.examples) || data.examples.length === 0) {
    errors.push("examples must be an array with at least one entry");
  } else {
    const seen = new Set<string>();
    data.examples.forEach((ex, i) => {
      const at = `examples[${i}]`;
      if (!isObj(ex)) {
        errors.push(`${at} must be an object`);
        return;
      }
      if (!isStr(ex.export) || !IDENT_RE.test(ex.export)) {
        errors.push(`${at}.export must be an export name like Default`);
      } else if (ex.export === "default") {
        errors.push(`${at}.export must be a named export, not "default"`);
      } else if (seen.has(ex.export)) {
        errors.push(`${at}.export "${ex.export}" is duplicated`);
      } else {
        seen.add(ex.export);
        if (knownExamples && !knownExamples.includes(ex.export)) {
          errors.push(
            `${at}.export "${ex.export}" is not exported by examples.tsx`,
          );
        }
      }
      if (!isStr(ex.title))
        errors.push(`${at}.title must be a non-empty string`);
      if (
        typeof ex.width !== "string" ||
        !(WIDTHS as readonly string[]).includes(ex.width)
      ) {
        errors.push(`${at}.width must be one of ${WIDTHS.join(", ")}`);
      }
    });
  }

  if (!Array.isArray(data.provenance)) {
    errors.push("provenance must be an array (it may be empty)");
  } else {
    data.provenance.forEach((p, i) => {
      const at = `provenance[${i}]`;
      if (!isObj(p)) {
        errors.push(`${at} must be an object`);
        return;
      }
      if (!isStr(p.round))
        errors.push(`${at}.round must be a non-empty string`);
      else if (ctx.rounds && !ctx.rounds.includes(p.round)) {
        errors.push(`${at}.round "${p.round}" does not exist in rounds/`);
      }
      if (!isStr(p.pick)) errors.push(`${at}.pick must be a non-empty string`);
      if (typeof p.note !== "string")
        errors.push(`${at}.note must be a string`);
    });
  }

  if (!Array.isArray(data.rules) || !data.rules.every((r) => isStr(r))) {
    errors.push(
      "rules must be an array of non-empty strings (it may be empty)",
    );
  }

  if (errors.length > 0) return { meta: null, errors };
  return { meta: data as unknown as LibraryMeta, errors };
}

const dirOf = (path: string) => path.split("/").slice(-2)[0] ?? "";
const baseOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const prefixOf = (path: string) => path.slice(0, path.lastIndexOf("/") + 1);

/** Builds the entry list from glob results. Bad entries become error entries, never throws. */
export function loadLibrary(input: LibraryGlob): LibraryEntry[] {
  // A folder with only .tsx files has no meta.json. Still show it, with an error.
  const prefixes = new Map<string, string>();
  for (const p of [...Object.keys(input.json), ...Object.keys(input.modules)]) {
    prefixes.set(prefixOf(p), dirOf(p));
  }
  const entries: LibraryEntry[] = [];
  for (const [prefix, dir] of prefixes) {
    const raw = Object.entries(input.json).find(
      ([p]) => prefixOf(p) === prefix,
    )?.[1];
    const modules: Record<string, ModuleLoader> = {};
    for (const [p, load] of Object.entries(input.modules)) {
      if (prefixOf(p) === prefix) modules[baseOf(p)] = load;
    }
    if (raw === undefined) {
      entries.push({
        ok: false,
        name: dir,
        errors: ["meta.json is missing"],
      });
      continue;
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      entries.push({
        ok: false,
        name: dir,
        errors: [`meta.json is not valid JSON: ${msg}`],
      });
      continue;
    }
    const { meta, errors } = validateMeta(data, {
      dir,
      files: Object.keys(modules),
    });
    if (!meta) {
      entries.push({ ok: false, name: dir, errors });
      continue;
    }
    const component = `${pascalCase(dir)}.tsx`;
    entries.push({
      ok: true,
      name: meta.name,
      meta,
      loadComponent: modules[component] as ModuleLoader,
      loadExamples: modules["examples.tsx"] as ModuleLoader,
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * An own export of a module, or undefined. Names come from meta.json, so
 * `__proto__`, `constructor` and `toString` must not reach the prototype chain.
 */
export const ownExport = (mod: ModuleExports, name: string): unknown =>
  Object.hasOwn(mod, name) ? mod[name] : undefined;

/** Runtime check on loaded modules. Returns one error per problem. */
export function moduleProblems(
  meta: LibraryMeta,
  component: ModuleExports,
  examples: ModuleExports,
): { component: string | null; examples: Record<string, string> } {
  const name = pascalCase(meta.name);
  const isComponent = (v: unknown) =>
    typeof v === "function" || (typeof v === "object" && v !== null);
  // Null prototype: an example named `__proto__` must stay a plain key.
  const out: Record<string, string> = Object.create(null);
  for (const ex of meta.examples) {
    if (!isComponent(ownExport(examples, ex.export))) {
      out[ex.export] = `examples.tsx does not export ${ex.export}`;
    }
  }
  return {
    component: isComponent(ownExport(component, name))
      ? null
      : `${name}.tsx does not export ${name}`,
    examples: out,
  };
}
