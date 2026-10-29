import { describe, expect, it } from "vitest";
import { flipIndex } from "../src/lib/flip";

describe("flipIndex", () => {
  it("moves forward and back", () => {
    expect(flipIndex(0, 1, 3)).toBe(1);
    expect(flipIndex(2, -1, 3)).toBe(1);
  });

  it("wraps at both ends", () => {
    expect(flipIndex(2, 1, 3)).toBe(0);
    expect(flipIndex(0, -1, 3)).toBe(2);
    expect(flipIndex(0, -1, 2)).toBe(1);
  });

  it("wraps large steps", () => {
    expect(flipIndex(1, 7, 3)).toBe(2);
    expect(flipIndex(1, -7, 3)).toBe(0);
  });

  it("falls back to the first variant for an unknown current index", () => {
    expect(flipIndex(-1, 1, 3)).toBe(1);
    expect(flipIndex(9, 1, 3)).toBe(1);
  });

  it("returns 0 for an empty list and stays put for one variant", () => {
    expect(flipIndex(0, 1, 0)).toBe(0);
    expect(flipIndex(0, 1, 1)).toBe(0);
    expect(flipIndex(0, -1, 1)).toBe(0);
  });
});
