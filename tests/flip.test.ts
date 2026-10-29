import { describe, expect, it } from "vitest";
import { flipIndex, flipState, resolveActive } from "../src/lib/flip";

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

describe("flipState (tab and visible variant share one state)", () => {
  const ids = ["a", "b", "c"];

  it("selects exactly the tab whose panel is visible", () => {
    for (const active of ids) {
      const s = flipState(ids, active);
      expect(s.selected.filter(Boolean)).toHaveLength(1);
      expect(s.selected.map((x) => !x)).toEqual(s.hidden);
      expect(ids[s.selected.indexOf(true)]).toBe(active);
    }
  });

  it("stays in sync through clicks, arrows and number keys", () => {
    // Every input path ends in one setActive(id), so replay them as ids.
    let active = "a";
    const steps = [
      () => "c", // click tab C
      () => ids[flipIndex(ids.indexOf(active), 1, 3)] as string, // →
      () => ids[flipIndex(ids.indexOf(active), -1, 3)] as string, // ←
      () => ids[1] as string, // key 2
      () => ids[0] as string, // key 1
    ];
    for (const step of steps) {
      active = step();
      const s = flipState(ids, active);
      expect(ids[s.selected.indexOf(true)]).toBe(ids[s.hidden.indexOf(false)]);
      expect(s.active).toBe(active);
    }
  });

  it("falls back to the first variant when active is not in this round", () => {
    const s = flipState(["a", "b"], "c");
    expect(s.active).toBe("a");
    expect(s.selected).toEqual([true, false]);
    expect(s.hidden).toEqual([false, true]);
  });

  it("handles an empty round", () => {
    expect(flipState([], "a").selected).toEqual([]);
    expect(resolveActive([], "a")).toBe("");
  });
});
