import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMeta } from "../src/lib/library";

const sample = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "fixtures/library/task-chip/meta.json"),
    "utf8",
  ),
);
const ctx = { dir: "task-chip", files: ["TaskChip.tsx", "examples.tsx"] };

describe("screen metadata", () => {
  it("preserves omitted kind and accepts explicit kinds and authored missing references", () => {
    expect(validateMeta(sample, ctx).meta).toEqual(sample);
    for (const kind of ["component", "screen"]) {
      expect(
        validateMeta({ ...sample, kind, uses: ["missing-entry"] }, ctx).errors,
      ).toEqual([]);
    }
  });
  it.each([null, "", "page", 1, {}, []])("rejects invalid kind %j", (kind) => {
    expect(validateMeta({ ...sample, kind }, ctx).errors).toContain(
      "kind must be component or screen",
    );
  });
  it.each([
    null,
    "task-card",
    [""],
    [1],
    ["../task"],
    ["TaskCard"],
    ["task--card"],
    ["task-card", "task-card"],
    ["task-chip"],
  ])("rejects malformed authored uses %j", (uses) => {
    expect(validateMeta({ ...sample, uses }, ctx).errors.join(" ")).toContain(
      "uses",
    );
  });
  it("accepts empty authored uses", () => {
    expect(validateMeta({ ...sample, uses: [] }, ctx).errors).toEqual([]);
  });
});
