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
