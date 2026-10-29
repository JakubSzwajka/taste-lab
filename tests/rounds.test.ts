import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureKeys } from "@/fixtures";
import { type GlobInput, loadRounds, validateRound } from "@/lib/rounds";

const dir = resolve(import.meta.dirname, "fixtures/rounds");
const stub = async () => ({ default: () => null });

/** Builds the glob result Vite would give, from a fixture folder. */
function globFor(...names: string[]): GlobInput {
  const input: GlobInput = { json: {}, modules: {} };
  for (const n of names) {
    input.json[`/variants/${n}/round.json`] = readFileSync(
      `${dir}/${n}/round.json`,
      "utf8",
    );
    for (const f of readdirSync(`${dir}/${n}`).filter((f) =>
      f.endsWith(".tsx"),
    )) {
      input.modules[`/variants/${n}/${f}`] = stub;
    }
  }
  return input;
}

describe("loadRounds", () => {
  it("returns nothing for an empty glob", () => {
    expect(loadRounds({ json: {}, modules: {} }, fixtureKeys)).toEqual([]);
  });

  it("loads a valid round and maps loaders by variant id", () => {
    const [r] = loadRounds(globFor("valid-round"), fixtureKeys);
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    expect(r.spec.variants.map((v) => v.id)).toEqual(["a", "b"]);
    expect(Object.keys(r.loaders)).toEqual(["a", "b"]);
    expect(r.spec.variants[1]?.tokens).toEqual({ "--radius": "0.25rem" });
  });

  it("reports every problem of an invalid round without throwing", () => {
    const [r] = loadRounds(globFor("invalid-round"), fixtureKeys);
    expect(r?.ok).toBe(false);
    if (r?.ok !== false) return;
    const text = r.errors.join("\n");
    expect(text).toContain("level must be one of");
    expect(text).toContain("question must be a non-empty string");
    expect(text).toContain('fixture "nope" is unknown');
    expect(text).toContain("2 to 4 entries");
    expect(text).toContain('"missing.tsx" not found');
  });

  it("turns corrupt JSON into an error entry and keeps other rounds", () => {
    const g = globFor("valid-round");
    g.json["/variants/round-002/round.json"] = "{ not json";
    const rounds = loadRounds(g, fixtureKeys);
    expect(rounds.map((r) => [r.id, r.ok])).toEqual([
      ["round-002", false],
      ["valid-round", true],
    ]);
  });

  it("sorts by id", () => {
    const g = globFor("valid-round", "invalid-round");
    expect(loadRounds(g, fixtureKeys).map((r) => r.id)).toEqual([
      "invalid-round",
      "valid-round",
    ]);
  });

  it("rejects an id that does not match its folder", () => {
    const g = globFor("valid-round");
    g.json["/variants/other/round.json"] = g.json[
      "/variants/valid-round/round.json"
    ] as string;
    const other = loadRounds(g, fixtureKeys).find((r) => r.id === "other");
    expect(other?.ok).toBe(false);
  });
});

describe("validateRound", () => {
  const base = JSON.parse(
    readFileSync(`${dir}/valid-round/round.json`, "utf8"),
  );
  const ctx = {
    dir: "valid-round",
    files: ["a.tsx", "b.tsx"],
    fixtureKeys: ["tasks"],
  };

  it("accepts the sample", () => {
    expect(validateRound(base, ctx).errors).toEqual([]);
  });

  it("defaults preview to columns and accepts both modes", () => {
    expect(validateRound(base, ctx).spec?.preview).toBe("columns");
    for (const preview of ["columns", "flip"]) {
      const r = validateRound({ ...base, preview }, ctx);
      expect(r.errors).toEqual([]);
      expect(r.spec?.preview).toBe(preview);
    }
  });

  it.each([
    ["unknown string", "grid"],
    ["number", 1],
    ["null", null],
    ["empty", ""],
  ])("rejects a preview that is a %s with a readable error", (_n, preview) => {
    const r = validateRound({ ...base, preview }, ctx);
    expect(r.spec).toBeNull();
    expect(r.errors.join()).toContain(
      'preview must be one of "columns", "flip"',
    );
  });

  it("rejects duplicate ids and reserved ids", () => {
    const v = {
      ...base,
      variants: [base.variants[0], { ...base.variants[1], id: "a" }],
    };
    expect(validateRound(v, ctx).errors.join()).toContain("duplicated");
    const r = {
      ...base,
      variants: [base.variants[0], { ...base.variants[1], id: "none" }],
    };
    expect(validateRound(r, ctx).errors.join()).toContain("reserved");
  });

  it("rejects token keys that are not CSS variables", () => {
    const v = {
      ...base,
      variants: [
        base.variants[0],
        { ...base.variants[1], tokens: { radius: "1px" } },
      ],
    };
    expect(validateRound(v, ctx).errors.join()).toContain("CSS variable");
  });

  it("rejects non-objects", () => {
    expect(validateRound([], ctx).spec).toBeNull();
  });
});
