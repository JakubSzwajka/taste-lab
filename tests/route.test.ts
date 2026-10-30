import { describe, expect, it } from "vitest";
import { hrefFor, parseHash } from "../src/lib/route";

describe("parseHash", () => {
  it("parses the three pages", () => {
    expect(parseHash("")).toEqual({ page: "current" });
    expect(parseHash("#/history")).toEqual({ page: "history" });
    expect(parseHash("#/round/round-002")).toEqual({
      page: "round",
      id: "round-002",
    });
  });

  it("parses the library pages", () => {
    expect(parseHash("#/library")).toEqual({ page: "library" });
    expect(parseHash("#/library/task-card")).toEqual({
      page: "library-entry",
      name: "task-card",
    });
    expect(parseHash(hrefFor({ page: "library-entry", name: "a b" }))).toEqual({
      page: "library-entry",
      name: "a b",
    });
    expect(parseHash("#/library/%")).toEqual({ page: "library" });
    expect(parseHash("#/library/")).toEqual({ page: "current" });
    expect(hrefFor({ page: "library" })).toBe("#/library");
  });

  it("parses a library example and round-trips it", () => {
    expect(parseHash("#/library/task-card/ManyTags")).toEqual({
      page: "library-entry",
      name: "task-card",
      example: "ManyTags",
    });
    const r = { page: "library-entry", name: "a/b", example: "c d" } as const;
    expect(hrefFor(r)).toBe("#/library/a%2Fb/c%20d");
    expect(parseHash(hrefFor(r))).toEqual(r);
    expect(parseHash("#/library/task-card/")).toEqual({ page: "library" });
    expect(parseHash("#/library/a/b/c")).toEqual({ page: "library" });
    expect(parseHash("#/library/a/%")).toEqual({ page: "library" });
  });

  it("decodes escaped ids and round-trips hrefFor", () => {
    const r = parseHash(hrefFor({ page: "round", id: "a b" }));
    expect(r).toEqual({ page: "round", id: "a b" });
  });

  it.each(["#/round/%", "#/round/%E0%A4%A", "#/round/100%"])(
    "falls back to the current round for the malformed hash %s",
    (hash) => {
      expect(parseHash(hash)).toEqual({ page: "current" });
    },
  );
});
