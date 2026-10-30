import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDataDir } from "../cli/check";
import { valueExports } from "../cli/check-library";
import { initDataDir } from "../cli/init";
import { run } from "../cli/main";
import { importAllowed, scanVariants } from "../cli/scan-variants";
import {
  type LibraryGlob,
  loadLibrary,
  moduleProblems,
  ownExport,
  pascalCase,
  validateMeta,
} from "../src/lib/library";
import { freePort } from "./free-port";

const sample = resolve(import.meta.dirname, "fixtures/library/task-chip");
const meta = () => JSON.parse(readFileSync(join(sample, "meta.json"), "utf8"));

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-lib-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

/** Glob input for the sample entry, as `import.meta.glob` would give it. */
function globFor(dir: string, override: Record<string, string> = {}) {
  const input: LibraryGlob = { json: {}, modules: {} };
  const stub = async () => ({});
  for (const f of readdirSync(sample)) {
    const path = `/x/library/${dir}/${f}`;
    const text = override[f] ?? readFileSync(join(sample, f), "utf8");
    if (f === "meta.json") input.json[path] = text;
    else input.modules[path] = stub;
  }
  return input;
}

describe("pascalCase", () => {
  it("turns a folder name into the component name", () => {
    expect(pascalCase("task-card")).toBe("TaskCard");
    expect(pascalCase("button")).toBe("Button");
    expect(pascalCase("table-2")).toBe("Table2");
  });
});

describe("loadLibrary", () => {
  it("loads a good entry", () => {
    const [e] = loadLibrary(globFor("task-chip"));
    expect(e?.ok).toBe(true);
    if (!e?.ok) return;
    expect(e.name).toBe("task-chip");
    expect(e.meta.examples.map((x) => x.export)).toEqual([
      "Default",
      "Compact",
    ]);
    expect(e.meta.status).toBe("agreed");
  });

  it("sorts entries and keeps good ones next to a broken one", () => {
    const good = globFor("task-chip");
    const bad = globFor("zz-bad", { "meta.json": "{ nope" });
    const out = loadLibrary({
      json: { ...bad.json, ...good.json },
      modules: { ...bad.modules, ...good.modules },
    });
    expect(out.map((e) => [e.name, e.ok])).toEqual([
      ["task-chip", true],
      ["zz-bad", false],
    ]);
    const broken = out[1];
    expect(broken && !broken.ok && broken.errors[0]).toMatch(
      /^meta\.json is not valid JSON/,
    );
  });

  it("shows an entry that has files but no meta.json", () => {
    const g = globFor("task-chip");
    g.json = {};
    expect(loadLibrary(g)).toEqual([
      { ok: false, name: "task-chip", errors: ["meta.json is missing"] },
    ]);
  });

  it("reports a bad meta schema with readable errors", () => {
    const m = { ...meta(), status: "final", examples: [], rules: "x" };
    const [e] = loadLibrary(
      globFor("task-chip", { "meta.json": JSON.stringify(m) }),
    );
    expect(e && !e.ok && e.errors).toEqual([
      "status must be one of draft, agreed",
      "examples must be an array with at least one entry",
      "rules must be an array of non-empty strings (it may be empty)",
    ]);
  });

  it("rejects a folder name that is not kebab-case", () => {
    for (const dir of ["TaskChip", "task_chip", "-task", "task--chip"]) {
      const [e] = loadLibrary(globFor(dir));
      expect(e?.ok).toBe(false);
      expect(e && !e.ok && e.errors[0]).toContain("must be kebab-case");
    }
  });

  it("requires the name to match the folder and the two source files", () => {
    const [e] = loadLibrary(globFor("other-name"));
    expect(e && !e.ok && e.errors).toEqual([
      "OtherName.tsx is missing",
      'name "task-chip" must match its folder name "other-name"',
    ]);
  });
});

describe("validateMeta", () => {
  const ctx = {
    dir: "task-chip",
    files: ["TaskChip.tsx", "examples.tsx"],
    rounds: ["round-001"],
  };

  it("accepts the sample", () => {
    expect(validateMeta(meta(), ctx).errors).toEqual([]);
  });

  it("flags an example export that examples.tsx lacks", () => {
    const r = validateMeta(meta(), {
      ...ctx,
      exports: { "examples.tsx": ["Default"], "TaskChip.tsx": ["TaskChip"] },
    });
    expect(r.errors).toEqual([
      'examples[1].export "Compact" is not exported by examples.tsx',
    ]);
  });

  it("flags a component file without the named export", () => {
    const r = validateMeta(meta(), {
      ...ctx,
      exports: { "TaskChip.tsx": ["Other"] },
    });
    expect(r.errors).toEqual([
      "TaskChip.tsx must export a component named TaskChip",
    ]);
  });

  it("flags a provenance round that does not exist", () => {
    const m = meta();
    m.provenance[0].round = "round-009";
    expect(validateMeta(m, ctx).errors).toEqual([
      'provenance[0].round "round-009" does not exist in rounds/',
    ]);
  });

  it("flags bad example entries", () => {
    const m = meta();
    m.examples = [
      { export: "default", title: "x", width: "column" },
      { export: "A", title: "", width: "wide" },
      { export: "A", title: "dup", width: "full" },
    ];
    expect(validateMeta(m, ctx).errors).toEqual([
      'examples[0].export must be a named export, not "default"',
      "examples[1].title must be a non-empty string",
      "examples[1].width must be one of column, full",
      'examples[2].export "A" is duplicated',
    ]);
  });
});

describe("moduleProblems", () => {
  it("finds a missing component or example export at render time", () => {
    const m = meta();
    const fn = () => null;
    expect(
      moduleProblems(m, { TaskChip: fn }, { Default: fn, Compact: fn }),
    ).toEqual({ component: null, examples: {} });
    expect(moduleProblems(m, {}, { Default: fn })).toEqual({
      component: "TaskChip.tsx does not export TaskChip",
      examples: { Compact: "examples.tsx does not export Compact" },
    });
  });
});

describe("export names that match Object.prototype", () => {
  const fn = () => null;
  const withNames = (...names: string[]) => {
    const m = meta();
    m.examples = names.map((n) => ({ export: n, title: n, width: "column" }));
    return m;
  };

  it("reports a missing __proto__ example as an error, not as the prototype", () => {
    const r = moduleProblems(withNames("__proto__"), { TaskChip: fn }, {});
    expect(Object.hasOwn(r.examples, "__proto__")).toBe(true);
    expect(Object.entries(r.examples)).toEqual([
      ["__proto__", "examples.tsx does not export __proto__"],
    ]);
    expect(ownExport({}, "__proto__")).toBeUndefined();
  });

  it("does not count inherited names as exports", () => {
    for (const n of ["constructor", "toString", "hasOwnProperty"]) {
      const r = moduleProblems(withNames(n), { TaskChip: fn }, {});
      expect(r.examples[n]).toBe(`examples.tsx does not export ${n}`);
    }
  });

  it("accepts a real export named constructor", () => {
    const r = moduleProblems(
      withNames("constructor"),
      { TaskChip: fn },
      { constructor: fn },
    );
    expect(r.examples).toEqual({});
    expect(ownExport({ constructor: fn }, "constructor")).toBe(fn);
  });
});

describe("valueExports", () => {
  it("lists value exports and skips types", () => {
    const src = `export const A = 1;
export function B() {}
export class C {}
const D = 1;
export { D, D as E };
export type T = string;
export interface I {}
export type { X } from "y";
export default function () {}`;
    expect(valueExports(src)).toEqual({
      names: ["A", "B", "C", "D", "E"],
      unverifiable: null,
    });
  });

  it("marks export * and destructured exports as unverifiable", () => {
    expect(valueExports('export * from "./x";')?.unverifiable).toMatch(
      /export \*/,
    );
    expect(
      valueExports("export const { unused } = { unused: 1 };")?.unverifiable,
    ).toMatch(/destructured/);
    expect(valueExports("export const [a] = [1];")?.unverifiable).toMatch(
      /destructured/,
    );
    expect(valueExports('export * as ns from "./x";')).toEqual({
      names: ["ns"],
      unverifiable: null,
    });
    expect(valueExports('export type * from "./x";')?.unverifiable).toBeNull();
  });

  it("gives up on files that do not parse", () => {
    expect(valueExports("export function X( {")).toBeNull();
  });
});

describe("scanner with the library rules", () => {
  const scanText = (name: string, text: string, library: boolean) => {
    const dir = mkdtempSync(join(tmp, "scan-"));
    writeFileSync(join(dir, name), text);
    return scanVariants(dir, { library }).map((v) => v.message);
  };

  it("passes the sample entry", () => {
    expect(scanVariants(sample, { library: true })).toEqual([]);
  });

  it("allows sibling imports only in library files, and cva in both", () => {
    const src = `import { cva } from "class-variance-authority";
import { X } from "./X";
export const a = cva(""); export { X };
`;
    expect(scanText("X.tsx", src, true)).toEqual([]);
    expect(scanText("X.tsx", src, false)).toEqual([
      'import "./X" is not allowed',
    ]);
  });

  it("allows class-variance-authority in round variants", () => {
    const src = `import { cva } from "class-variance-authority";
export default function V() { return <div className={cva("p-2")()} />; }
`;
    expect(scanText("v.tsx", src, false)).toEqual([]);
    expect(importAllowed("class-variance-authority")).toBe(true);
    expect(importAllowed("class-variance-authority/x")).toBe(false);
  });

  it("still rejects parent, nested and extension imports in the library", () => {
    for (const spec of [
      "../Other",
      "./a/b",
      "./X.tsx",
      "./",
      "../../src/lib/api",
    ]) {
      expect(importAllowed(spec, { library: true })).toBe(false);
    }
  });

  it("allows @/fixtures values only in examples.tsx, types anywhere", () => {
    const value =
      'import { tasks } from "@/fixtures";\nexport const t = tasks;\n';
    const type =
      'import type { Task } from "@/fixtures";\nexport type T = Task;\n';
    expect(scanText("examples.tsx", value, true)).toEqual([]);
    expect(scanText("Card.tsx", type, true)).toEqual([]);
    expect(scanText("Card.tsx", value, true)).toEqual([
      'import "@/fixtures" is only allowed in examples.tsx (components take data as props; `import type` is fine)',
    ]);
    expect(
      scanText(
        "Card.tsx",
        'import { type Task } from "@/fixtures";\nexport const a = 1;\n',
        true,
      ),
    ).toHaveLength(1);
    // round variants keep full access to @/fixtures
    expect(scanText("a.tsx", value, false)).toEqual([]);
  });

  it("applies the color and style rules to library files", () => {
    const msgs = scanText(
      "Card.tsx",
      'export const A = () => <div style={{ margin: 1 }} className="bg-blue-500" />;\n',
      true,
    );
    expect(msgs).toContain(
      "style prop is not allowed (put tokens in round.json)",
    );
    expect(msgs).toContain(
      "palette color class (use semantic tokens like bg-card)",
    );
  });

  it("lets round variants import library components, nothing looser", () => {
    for (const ok of [
      "@/library/task-card/TaskCard",
      "@/library/a1/A1",
      "@/library/table-2/Table2",
    ]) {
      expect(importAllowed(ok)).toBe(true);
    }
    for (const no of [
      "@/library/task-card",
      "@/library/task-card/",
      "@/library/task-card/TaskCard/x",
      "@/library/../lib/api",
      "@/library/Task_Card/TaskCard",
      "@/library//TaskCard",
      "@/library/task-card/../x",
      // the file must be the PascalCase of the folder, not any helper
      "@/library/task-card/examples",
      "@/library/task-card/Other",
      "@/library/task-card/Helper",
      "@/library/task-card/taskCard",
      // the folder must pass the kebab name rule
      "@/library/1x/1x",
      "@/library/task--card/TaskCard",
      "@/library/-a/A",
    ]) {
      expect(importAllowed(no)).toBe(false);
    }
  });
});

describe("sibling imports resolve to scanned files only", () => {
  const scanDir = (files: Record<string, string>, target = "Card.tsx") => {
    const dir = mkdtempSync(join(tmp, "sib-"));
    for (const [f, text] of Object.entries(files)) {
      mkdirSync(join(dir, f, ".."), { recursive: true });
      writeFileSync(join(dir, f), text);
    }
    return scanVariants(dir, { library: true })
      .filter((v) => v.file === target)
      .map((v) => v.message);
  };
  const card = 'import { H } from "./Helper";\nexport const C = H;\n';
  const helper = "export const H = 1;\n";

  it("accepts a .ts or .tsx sibling", () => {
    expect(scanDir({ "Card.tsx": card, "Helper.ts": helper })).toEqual([]);
    expect(scanDir({ "Card.tsx": card, "Helper.tsx": helper })).toEqual([]);
  });

  it("rejects a .js or .jsx sibling that the scanner never reads", () => {
    for (const ext of ["js", "jsx", "mjs", "json"]) {
      const msgs = scanDir({ "Card.tsx": card, [`Helper.${ext}`]: helper });
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toContain(`Helper.${ext}`);
    }
  });

  it("rejects a .js file that would win over a .ts file", () => {
    const msgs = scanDir({
      "Card.tsx": card,
      "Helper.ts": helper,
      "Helper.js": "export const H = 2;\n",
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("Helper.js");
  });

  it("rejects a missing sibling and a folder with an index file", () => {
    expect(scanDir({ "Card.tsx": card })).toEqual([
      'import "./Helper" does not match a .ts or .tsx file',
    ]);
    expect(scanDir({ "Card.tsx": card, "Helper/index.ts": helper })).toEqual([
      'import "./Helper" must point to a .ts or .tsx file in this folder',
    ]);
  });

  it("rejects a directory named Helper.ts or Helper.tsx", () => {
    for (const ext of ["ts", "tsx"]) {
      const msgs = scanDir({
        "Card.tsx": card,
        [`Helper.${ext}/index.ts`]: helper,
      });
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toContain(`Helper.${ext} is not a file`);
    }
  });
});

describe("style rule is scoped to props", () => {
  const scanText = (text: string) => {
    const dir = mkdtempSync(join(tmp, "style-"));
    writeFileSync(join(dir, "v.tsx"), text);
    return scanVariants(dir).map((v) => v.message);
  };
  const STYLE = "style prop is not allowed (put tokens in round.json)";
  const ACCESS = "style access is not allowed (put tokens in round.json)";

  it("allows Intl.NumberFormat with style: currency", () => {
    expect(
      scanText(
        `const f = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export default function V() { return <p>{f.format(1)}</p>; }
`,
      ),
    ).toEqual([]);
    expect(scanText('export const o = { style: "percent" };\n')).toEqual([]);
  });

  it("still flags style on JSX, spread objects and DOM mutation", () => {
    const jsx = "export default () => <div style={{ margin: 1 }} />;\n";
    expect(scanText(jsx)).toContain(STYLE);
    const inline =
      "export default () => <div {...{ style: { margin: 1 } }} />;\n";
    expect(scanText(inline)).toEqual([STYLE]);
    const bound = `const p = { className: "p-2", style: { margin: 1 } };
export default () => <div {...p} />;
`;
    expect(scanText(bound)).toEqual([STYLE]);
    const chained = `const a = { style: { margin: 1 } };
const b = { ...a };
export default () => <div {...b} />;
`;
    expect(scanText(chained)).toEqual([STYLE]);
    const fnProps = `function props() { return { style: { margin: 1 } }; }
export default () => <div {...props()} />;
`;
    expect(scanText(fnProps)).toEqual([STYLE]);
    const dom =
      "export const f = (el: HTMLElement) => { el.style.margin = '1px'; };\n";
    expect(scanText(dom)).toEqual([ACCESS]);
  });

  it("bans element factories, aliased, namespaced and destructured", () => {
    const FACTORY =
      "element factories (createElement, cloneElement, jsx, jsxs, jsxDEV) are not allowed, use JSX";
    const cases = [
      'import { createElement } from "react";\nexport default () => createElement("div");\n',
      'import { createElement as h } from "react";\nexport default () => h("div", { style: { margin: 1 } });\n',
      'import { cloneElement as c } from "react";\nexport const x = c;\n',
      'import React from "react";\nexport default () => React.createElement("div");\n',
      'import * as R from "react";\nexport const x = R.cloneElement;\n',
      'import * as R from "react";\nexport const x = R["createElement"];\n',
      'import * as R from "react";\nexport const { createElement: h } = R;\n',
      'import { jsx } from "react/jsx-runtime";\nexport const x = jsx;\n',
      'import { jsxs as j } from "react/jsx-runtime";\nexport const x = j;\n',
    ];
    for (const src of cases) {
      expect(scanText(src), src).toContain(FACTORY);
    }
    // Plain JSX and unrelated names stay fine.
    expect(
      scanText(
        'import { useState } from "react";\nexport default () => <div>{String(useState)}</div>;\n',
      ),
    ).toEqual([]);
  });

  it("does not scan factory children as props", () => {
    const src = `export default () => (
  <p>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1)}</p>
);
`;
    expect(scanText(src)).toEqual([]);
  });

  it("does not flag a style object that never reaches JSX", () => {
    const src = `const p = { style: "currency" };
export default () => <div {...{ className: "p-2" }}>{JSON.stringify(p)}</div>;
`;
    expect(scanText(src)).toEqual([]);
  });
});

const round = {
  id: "round-001",
  level: "component",
  component: "chip",
  question: "Which chip?",
  fixture: "items",
  basedOn: null,
  variants: [
    { id: "a", file: "a.tsx", label: "A", changes: "plain" },
    { id: "b", file: "b.tsx", label: "B", changes: "plain too" },
  ],
};

/** A data dir with one round and the sample entry copied in. */
function dirWithEntry(name = "app") {
  const dir = join(tmp, name, ".taste-lab");
  initDataDir(dir);
  const r = join(dir, "rounds/round-001");
  mkdirSync(r, { recursive: true });
  writeFileSync(join(r, "round.json"), JSON.stringify(round));
  const v = `import { TaskChip } from "@/library/task-chip/TaskChip";
import { items } from "@/fixtures";
export default function A() {
  return <TaskChip task={items[0] as never} density="compact" />;
}
`;
  writeFileSync(join(r, "a.tsx"), v);
  writeFileSync(join(r, "b.tsx"), v);
  cpSync(sample, join(dir, "library/task-chip"), { recursive: true });
  return dir;
}

describe("check: library", () => {
  const setMeta = (dir: string, fn: (m: Record<string, unknown>) => void) => {
    const f = join(dir, "library/task-chip/meta.json");
    const m = JSON.parse(readFileSync(f, "utf8"));
    fn(m);
    writeFileSync(f, JSON.stringify(m));
  };

  it("passes a good entry and a variant that imports it", async () => {
    expect(await checkDataDir(dirWithEntry())).toEqual([]);
  });

  it("passes with an empty library/ (only .gitkeep) or none", async () => {
    const dir = join(tmp, "empty", ".taste-lab");
    initDataDir(dir);
    expect(await checkDataDir(dir)).toEqual([]);
    rmSync(join(dir, "library"), { recursive: true });
    expect(await checkDataDir(dir)).toEqual([]);
  });

  it("reports a bad meta.json", async () => {
    const dir = dirWithEntry();
    setMeta(dir, (m) => {
      m.status = "final";
    });
    expect(await checkDataDir(dir)).toEqual([
      "library/task-chip: status must be one of draft, agreed",
    ]);
    writeFileSync(join(dir, "library/task-chip/meta.json"), "{ nope");
    const [p] = await checkDataDir(dir);
    expect(p).toMatch(/^library\/task-chip: meta\.json is not valid JSON/);
  });

  it("reports a missing meta.json and missing files", async () => {
    const dir = dirWithEntry();
    rmSync(join(dir, "library/task-chip/meta.json"));
    rmSync(join(dir, "library/task-chip/examples.tsx"));
    expect(await checkDataDir(dir)).toEqual([
      "library/task-chip: meta.json is missing",
    ]);
    writeFileSync(
      join(dir, "library/task-chip/meta.json"),
      JSON.stringify(meta()),
    );
    expect(await checkDataDir(dir)).toEqual([
      "library/task-chip: examples.tsx is missing",
    ]);
  });

  it("reports an example export that is not in examples.tsx", async () => {
    const dir = dirWithEntry();
    setMeta(dir, (m) => {
      (m.examples as unknown[]).push({
        export: "Nope",
        title: "x",
        width: "full",
      });
    });
    expect(await checkDataDir(dir)).toEqual([
      'library/task-chip: examples[2].export "Nope" is not exported by examples.tsx',
    ]);
  });

  it("reports a component file that lacks its named export", async () => {
    const dir = dirWithEntry();
    writeFileSync(
      join(dir, "library/task-chip/TaskChip.tsx"),
      "export default function TaskChip() { return null; }\n",
    );
    expect(await checkDataDir(dir)).toEqual([
      "library/task-chip: TaskChip.tsx must export a component named TaskChip",
    ]);
  });

  it("reports exports it cannot verify in the component and examples", async () => {
    const dir = dirWithEntry();
    const ex = join(dir, "library/task-chip/examples.tsx");
    writeFileSync(
      ex,
      `${readFileSync(ex, "utf8")}export const { unused } = { unused: 1 };\n`,
    );
    setMeta(dir, (m) => {
      (m.examples as { export: string }[])[1] = {
        export: "Nope",
        title: "x",
        width: "full",
      } as never;
    });
    expect(await checkDataDir(dir)).toEqual([
      "library/task-chip: examples.tsx uses a destructured export, so its exports cannot be checked (export each name directly)",
    ]);
    writeFileSync(ex, 'export * from "./TaskChip";\n');
    expect(await checkDataDir(dir)).toEqual([
      "library/task-chip: examples.tsx uses `export *`, so its exports cannot be checked (export each name directly)",
    ]);
  });

  it("does not count a folder named like a required file", async () => {
    const dir = dirWithEntry();
    const ex = join(dir, "library/task-chip/examples.tsx");
    rmSync(ex);
    mkdirSync(ex);
    const problems = await checkDataDir(dir);
    expect(problems).toContain(
      "library/task-chip: examples.tsx is a directory, not a file",
    );
    expect(problems).not.toEqual([]);
    rmSync(ex, { recursive: true });
    symlinkSync(join(dir, "nowhere.tsx"), ex);
    expect(await checkDataDir(dir)).toContain(
      "library/task-chip: examples.tsx is a dangling symlink",
    );
  });

  it("reports a provenance round that does not exist", async () => {
    const dir = dirWithEntry();
    setMeta(dir, (m) => {
      m.provenance = [{ round: "round-042", pick: "a", note: "x" }];
    });
    expect(await checkDataDir(dir)).toEqual([
      'library/task-chip: provenance[0].round "round-042" does not exist in rounds/',
    ]);
  });

  it("reports a folder name that is not kebab-case", async () => {
    const dir = dirWithEntry();
    cpSync(join(dir, "library/task-chip"), join(dir, "library/TaskChip"), {
      recursive: true,
    });
    const problems = await checkDataDir(dir);
    expect(problems).toContain(
      'library/TaskChip: folder name "TaskChip" must be kebab-case (lowercase words joined by dashes, like task-card)',
    );
    expect(problems.some((p) => p.startsWith("library/task-chip"))).toBe(false);
  });

  it("scans library files with the library rules", async () => {
    const dir = dirWithEntry();
    writeFileSync(
      join(dir, "library/task-chip/TaskChip.tsx"),
      `import { tasks } from "@/fixtures";
import { clsx } from "clsx";
export const TaskChip = () => <div className="bg-red-500">{tasks.length}{clsx()}</div>;
`,
    );
    expect(await checkDataDir(dir)).toEqual([
      'library/task-chip/TaskChip.tsx:1: import "@/fixtures" is only allowed in examples.tsx (components take data as props; `import type` is fine)',
      'library/task-chip/TaskChip.tsx:2: import "clsx" is not allowed',
      "library/task-chip/TaskChip.tsx:3: palette color class (use semantic tokens like bg-card)",
    ]);
  });

  it("exits 1 from the CLI with the same lines", async () => {
    const dir = dirWithEntry();
    setMeta(dir, (m) => {
      m.title = "";
    });
    const out: string[] = [];
    const err: string[] = [];
    const code = await run(["check", "--dir", dir], {
      out: (s) => out.push(s),
      err: (s) => err.push(s),
    });
    expect(code).toBe(1);
    expect(`${out.join("\n")}${err.join("\n")}`).toContain(
      "library/task-chip: title must be a non-empty string",
    );
  });
});

describe("@/library alias", () => {
  it("resolves @/library/<name>/<Name> to the data dir, also with $& in the path", async () => {
    const { serve } = await import("../cli/serve");
    const dir = dirWithEntry("tl app$&");
    const port = await freePort();
    const before = process.env.TASTE_LAB_DIR;
    const { server, url } = await serve(dir, port);
    try {
      const variant = await (
        await fetch(`${url}@fs${dir}/rounds/round-001/a.tsx`)
      ).text();
      const m = variant.match(
        /from "(\/@fs[^"]*library\/task-chip\/TaskChip\.tsx[^"]*)"/,
      );
      expect(m).not.toBeNull();
      const res = await fetch(`${url}${(m as RegExpMatchArray)[1]?.slice(1)}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("taskChipVariants");
      // The app's glob sees the entry.
      const entries = await (
        await fetch(`${url}src/lib/library-entries.ts`)
      ).text();
      expect(entries).toContain("library/task-chip/meta.json");
      expect(entries).toContain("tl app$&");
    } finally {
      await server.close();
      if (before === undefined) delete process.env.TASTE_LAB_DIR;
      else process.env.TASTE_LAB_DIR = before;
    }
  }, 30_000);
});
