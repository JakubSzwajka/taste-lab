import { describe, expect, it, vi } from "vitest";
import type { LogResponse } from "../src/lib/api";
import { answerEntry, canSubmit, submitEntry } from "../src/lib/submit";
import { type TasteEntry, validateEntry } from "../src/lib/taste";

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

function hooks() {
  const calls: string[] = [];
  return {
    calls,
    onSaved: vi.fn(() => calls.push("saved")),
    onLog: vi.fn(() => calls.push("log")),
    onRefreshError: vi.fn(() => calls.push("refreshError")),
  };
}

describe("submitEntry", () => {
  it("saves first, then applies the fresh log", async () => {
    const h = hooks();
    const log = { entries: [entry], skipped: 0 };
    const r = await submitEntry(
      async () => entry,
      async () => log,
      h,
    );
    await r.refreshed;
    expect(r.entry).toBe(entry);
    expect(h.onSaved).toHaveBeenCalledWith(entry);
    expect(h.onLog).toHaveBeenCalledWith(log);
    expect(h.calls).toEqual(["saved", "log"]);
  });

  it("resolves and has saved the entry while the refresh never resolves", async () => {
    const h = hooks();
    const never = new Promise<LogResponse>(() => {});
    const r = await submitEntry(
      async () => entry,
      () => never,
      h,
    );
    // Reaching this line proves the GET did not block the submit.
    expect(r.entry).toBe(entry);
    expect(h.onSaved).toHaveBeenCalledTimes(1);
    expect(h.onLog).not.toHaveBeenCalled();
    expect(h.onRefreshError).not.toHaveBeenCalled();
  });

  it("saves before the refresh is even called", async () => {
    const h = hooks();
    const refresh = vi.fn(async () => {
      h.calls.push("refresh-start");
      return { entries: [entry], skipped: 0 };
    });
    const r = await submitEntry(async () => entry, refresh, h);
    await r.refreshed;
    expect(h.calls).toEqual(["saved", "refresh-start", "log"]);
  });

  it("keeps the saved entry and reports a failed refresh", async () => {
    const h = hooks();
    const r = await submitEntry(
      async () => entry,
      async () => {
        throw new Error("GET /api/taste failed (500)");
      },
      h,
    );
    await r.refreshed;
    expect(h.onSaved).toHaveBeenCalledWith(entry);
    expect(h.onLog).not.toHaveBeenCalled();
    expect(h.onRefreshError).toHaveBeenCalledWith(
      "GET /api/taste failed (500)",
    );
  });

  it("rejects, and skips saving and refreshing, when the POST fails", async () => {
    const h = hooks();
    const refresh = vi.fn();
    await expect(
      submitEntry(
        async () => {
          throw new Error("POST failed (400)");
        },
        refresh,
        h,
      ),
    ).rejects.toThrow("POST failed (400)");
    expect(refresh).not.toHaveBeenCalled();
    expect(h.onSaved).not.toHaveBeenCalled();
  });
});

describe("canSubmit", () => {
  it("needs a pick", () => {
    expect(canSubmit("", "")).toBe(false);
    expect(canSubmit("a", "")).toBe(true);
    expect(canSubmit("none", "")).toBe(true);
  });

  it("Mix needs a non-blank reason", () => {
    expect(canSubmit("mix", "")).toBe(false);
    expect(canSubmit("mix", "   ")).toBe(false);
    expect(canSubmit("mix", "a's header, b's rows")).toBe(true);
  });

  it("blocks while a save runs", () => {
    expect(canSubmit("a", "ok", true)).toBe(false);
  });
});

describe("answerEntry", () => {
  const round = {
    id: "round-009",
    component: "compare-page",
    level: "layout" as const,
    variants: [{ id: "a" }, { id: "b" }, { id: "c" }],
  };

  it("builds the POST body with empty tags and a trimmed reason", () => {
    expect(
      answerEntry(
        round,
        { pick: "b", reason: "  less noise ", view: "flip" },
        "dark",
      ),
    ).toEqual({
      round: "round-009",
      component: "compare-page",
      level: "layout",
      shown: ["a", "b", "c"],
      pick: "b",
      tags: [],
      reason: "less noise",
      theme: "dark",
      view: "flip",
    });
  });

  it("the body passes the log validator", () => {
    const body = answerEntry(
      round,
      { pick: "mix", reason: "a + c", view: "columns" },
      "light",
    );
    const v = validateEntry(body);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.entry.tags).toEqual([]);
  });
});
