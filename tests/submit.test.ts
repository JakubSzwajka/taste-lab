import { describe, expect, it, vi } from "vitest";
import { submitEntry } from "../src/lib/submit";
import type { TasteEntry } from "../src/lib/taste";

const entry: TasteEntry = {
  ts: "2026-01-02T03:04:05.000Z",
  round: "round-001",
  component: "card",
  level: "component",
  shown: ["a", "b"],
  pick: "a",
  tags: [],
  reason: "",
  theme: "light",
};

describe("submitEntry", () => {
  it("returns the stored entry and the fresh log", async () => {
    const log = { entries: [entry], skipped: 0 };
    const r = await submitEntry(
      async () => entry,
      async () => log,
    );
    expect(r).toEqual({ entry, log, refreshError: null });
  });

  it("keeps the saved entry when the refresh fails", async () => {
    const r = await submitEntry(
      async () => entry,
      async () => {
        throw new Error("GET /api/taste failed (500)");
      },
    );
    expect(r.entry).toBe(entry);
    expect(r.log).toBeNull();
    expect(r.refreshError).toBe("GET /api/taste failed (500)");
  });

  it("rejects, and skips the refresh, when the POST fails", async () => {
    const refresh = vi.fn();
    await expect(
      submitEntry(async () => {
        throw new Error("POST failed (400)");
      }, refresh),
    ).rejects.toThrow("POST failed (400)");
    expect(refresh).not.toHaveBeenCalled();
  });
});
