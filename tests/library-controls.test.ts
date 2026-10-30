import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDataDir } from "../cli/check";
import { initDataDir } from "../cli/init";
import { validateMeta } from "../src/lib/library";
import {
  initialValues,
  parseNumber,
  validateArgs,
  validateControls,
  withValue,
} from "../src/lib/library-controls";

const sample = resolve(import.meta.dirname, "fixtures/library/task-chip");
const meta = () => JSON.parse(readFileSync(join(sample, "meta.json"), "utf8"));
const ctx = {
  dir: "task-chip",
  files: ["TaskChip.tsx", "examples.tsx"],
  rounds: ["round-001"],
};

const CONTROLS = [
  { prop: "dense", kind: "boolean", default: false, label: "Dense rows" },
  { prop: "status", kind: "select", options: ["todo", "done"] },
  { prop: "title", kind: "text" },
  { prop: "count", kind: "number", default: 3 },
];

describe("controls and args in meta.json", () => {
  it("accepts an entry without controls, as before", () => {
    expect(validateMeta(meta(), ctx).errors).toEqual([]);
  });

  it("accepts valid controls and args", () => {
    const m = meta();
    m.controls = CONTROLS;
    m.examples[0].args = { dense: true, status: "done", title: "x", count: 0 };
    m.examples[1].args = {};
    const r = validateMeta(m, ctx);
    expect(r.errors).toEqual([]);
    expect(r.meta?.controls).toHaveLength(4);
  });

  it("rejects an invalid kind", () => {
    const m = meta();
    m.controls = [{ prop: "size", kind: "range" }];
    expect(validateMeta(m, ctx).errors).toEqual([
      "controls[0].kind must be one of boolean, select, text, number",
    ]);
  });

  it("rejects a select without options and options on other kinds", () => {
    const m = meta();
    m.controls = [
      { prop: "a", kind: "select" },
      { prop: "b", kind: "select", options: [] },
      { prop: "c", kind: "select", options: ["x", "x"] },
      { prop: "d", kind: "text", options: ["x"] },
    ];
    expect(validateMeta(m, ctx).errors).toEqual([
      "controls[0].options must be a non-empty array of distinct non-empty strings for kind select",
      "controls[1].options must be a non-empty array of distinct non-empty strings for kind select",
      "controls[2].options must be a non-empty array of distinct non-empty strings for kind select",
      "controls[3].options is only allowed for kind select",
    ]);
  });

  it("rejects an args key that is not a declared prop", () => {
    const m = meta();
    m.controls = CONTROLS;
    m.examples[1].args = { colour: "red" };
    expect(validateMeta(m, ctx).errors).toEqual([
      "examples[1].args.colour is not a declared control prop",
    ]);
  });

  it("rejects args on an entry with no controls", () => {
    const m = meta();
    m.examples[0].args = { dense: true };
    expect(validateMeta(m, ctx).errors).toEqual([
      "examples[0].args.dense is not a declared control prop",
    ]);
  });

  it("rejects args values that do not match the kind", () => {
    const m = meta();
    m.controls = CONTROLS;
    m.examples[0].args = {
      dense: "yes",
      status: "blocked",
      title: 4,
      count: "3",
    };
    expect(validateMeta(m, ctx).errors).toEqual([
      "examples[0].args.dense must be true or false",
      "examples[0].args.status must be one of its options (todo, done)",
      "examples[0].args.title must be a string",
      "examples[0].args.count must be a finite number",
    ]);
  });

  it("rejects bad control shapes, defaults and labels", () => {
    const m = meta();
    m.controls = [
      "dense",
      { prop: "1x", kind: "text" },
      { prop: "key", kind: "text" },
      { prop: "a", kind: "number", default: "1" },
      { prop: "a", kind: "text" },
      { prop: "b", kind: "select", options: ["x"], default: "y" },
      { prop: "c", kind: "boolean", label: "" },
    ];
    m.examples[0].args = [];
    expect(validateMeta(m, ctx).errors).toEqual([
      "controls[0] must be an object",
      "controls[1].prop must be a prop name like status",
      'controls[2].prop "key" is reserved',
      "controls[3].default must be a finite number",
      'controls[4].prop "a" is duplicated',
      "controls[5].default must be one of its options (x)",
      "controls[6].label must be a non-empty string",
      "examples[0].args must be a JSON object",
    ]);
  });

  it("rejects controls that are not an array", () => {
    const m = meta();
    m.controls = {};
    expect(validateMeta(m, ctx).errors).toEqual([
      "controls must be an array (or left out)",
    ]);
  });

  it("does not report args twice for a control that is already broken", () => {
    const controls = validateControls([{ prop: "a", kind: "nope" }]);
    expect(validateArgs({ a: 1 }, controls, "examples[0]")).toEqual([]);
  });
});

describe("control values", () => {
  const controls = validateControls(CONTROLS).valid;
  const list = [...controls.values()];

  it("starts from args, then defaults, and leaves the rest unset", () => {
    expect(initialValues(list, undefined)).toEqual({ dense: false, count: 3 });
    expect(initialValues(list, { count: 0, status: "todo" })).toEqual({
      dense: false,
      status: "todo",
      count: 0,
    });
    expect(initialValues(undefined, { a: 1 })).toEqual({});
  });

  it("sets and clears one value without touching the others", () => {
    const v = withValue({ a: 1, b: true }, "a", undefined);
    expect(v).toEqual({ b: true });
    expect(withValue(v, "c", "x")).toEqual({ b: true, c: "x" });
  });

  it("keeps a prop named like Object.prototype as an own key", () => {
    const v = withValue({}, "constructor", "x");
    expect(Object.hasOwn(v, "constructor")).toBe(true);
  });

  it("parses number fields, empty means unset", () => {
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber("-")).toBeUndefined();
    expect(parseNumber("2.5")).toBe(2.5);
  });
});

describe("check --dir validates controls", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "taste-controls-"));
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  async function withEntry(edit: (m: Record<string, unknown>) => void) {
    const dir = join(mkdtempSync(join(tmp, "app-")), ".taste-lab");
    initDataDir(dir);
    const round = join(dir, "rounds/round-001");
    mkdirSync(round, { recursive: true });
    writeFileSync(
      join(round, "round.json"),
      JSON.stringify({
        id: "round-001",
        level: "component",
        component: "chip",
        question: "Which chip?",
        fixture: "items",
        basedOn: null,
        variants: ["a", "b"].map((id) => ({
          id,
          file: `${id}.tsx`,
          label: id,
          changes: "plain",
        })),
      }),
    );
    for (const id of ["a", "b"]) {
      writeFileSync(
        join(round, `${id}.tsx`),
        "export default function V() {\n  return <p>v</p>;\n}\n",
      );
    }
    const lib = join(dir, "library/task-chip");
    cpSync(sample, lib, { recursive: true });
    const m = meta();
    edit(m);
    writeFileSync(join(lib, "meta.json"), JSON.stringify(m));
    return checkDataDir(dir);
  }

  it("passes valid controls and reports a bad args key", async () => {
    const ok = await withEntry((m) => {
      m.controls = CONTROLS;
    });
    expect(ok.filter((p) => p.includes("library/"))).toEqual([]);
    const bad = await withEntry((m) => {
      m.controls = CONTROLS;
      (m.examples as { args?: unknown }[])[0].args = { nope: 1 };
    });
    expect(bad).toContain(
      "library/task-chip: examples[0].args.nope is not a declared control prop",
    );
  });
});
