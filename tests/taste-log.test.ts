import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendEntry,
  isLoopbackAddress,
  isLoopbackHost,
  parseLog,
  readLog,
  validateEntry,
} from "../server/taste-log";
import { TAGS } from "../src/lib/taste";

const valid = {
  round: "round-001",
  component: "card",
  level: "component",
  shown: ["a", "b", "c"],
  pick: "b",
  tags: ["airy", "clean"],
  reason: "less noise",
  theme: "dark",
};

let dir: string;
let file: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "taste-"));
  file = join(dir, "nested", "taste.jsonl");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("validateEntry", () => {
  it("accepts a valid entry and fills ts", () => {
    const r = validateEntry(valid, () => new Date("2026-01-02T03:04:05Z"));
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.entry.ts).toBe("2026-01-02T03:04:05.000Z");
  });

  it("accepts an ISO ts and every allowed tag", () => {
    const r = validateEntry({
      ...valid,
      ts: "2026-01-02T03:04:05.123Z",
      tags: [...TAGS],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts none and mix with a reason", () => {
    expect(validateEntry({ ...valid, pick: "none" }).ok).toBe(true);
    expect(
      validateEntry({ ...valid, pick: "mix", reason: "a header, b body" }).ok,
    ).toBe(true);
  });

  it("accepts view columns or flip and keeps it", () => {
    for (const view of ["columns", "flip"]) {
      const r = validateEntry({ ...valid, view });
      expect(r.ok && r.entry.view).toBe(view);
    }
  });

  it("leaves view out when absent, so old lines stay valid", () => {
    const r = validateEntry(valid);
    expect(r.ok && "view" in r.entry).toBe(false);
    const line = JSON.stringify({ ...valid, ts: "2026-01-02T03:04:05Z" });
    expect(parseLog(line).entries).toHaveLength(1);
  });

  it.each([
    ["unknown view", "grid"],
    ["numeric view", 1],
    ["null view", null],
  ])("rejects %s", (_n, view) => {
    expect(validateEntry({ ...valid, view }).ok).toBe(false);
  });

  it("rejects mix without a reason", () => {
    const r = validateEntry({ ...valid, pick: "mix", reason: " " });
    expect(r.ok).toBe(false);
  });

  it("rejects a pick that was not shown", () => {
    expect(validateEntry({ ...valid, pick: "z" }).ok).toBe(false);
  });

  it.each([
    ["non-object", "x"],
    ["array", []],
    ["bad level", { ...valid, level: "page" }],
    ["bad theme", { ...valid, theme: "blue" }],
    ["one variant", { ...valid, shown: ["a"] }],
    ["five variants", { ...valid, shown: ["a", "b", "c", "d", "e"] }],
    ["tags not strings", { ...valid, tags: [1] }],
    ["empty round", { ...valid, round: "" }],
    ["bad ts", { ...valid, ts: "yesterday" }],
    ["numeric ts", { ...valid, ts: "1" }],
    ["date-only ts", { ...valid, ts: "2026-01-02" }],
    ["unknown tag", { ...valid, tags: ["airy", "spicy"] }],
  ])("rejects %s", (_n, body) => {
    expect(validateEntry(body).ok).toBe(false);
  });
});

describe("append and read", () => {
  it("creates the file and appends exactly one line per entry", () => {
    const a = validateEntry(valid);
    const b = validateEntry({ ...valid, round: "round-002", pick: "none" });
    if (!a.ok || !b.ok) throw new Error("fixture invalid");
    appendEntry(file, a.entry);
    appendEntry(file, b.entry);
    const lines = readFileSync(file, "utf8").split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("");
    expect(JSON.parse(lines[0] as string).pick).toBe("b");
    expect(readLog(file).entries.map((e) => e.round)).toEqual([
      "round-001",
      "round-002",
    ]);
  });

  it("starts a new line when the file lacks a trailing newline", () => {
    const a = validateEntry(valid);
    if (!a.ok) throw new Error("fixture invalid");
    appendEntry(file, a.entry);
    writeFileSync(file, readFileSync(file, "utf8").trimEnd());
    appendEntry(file, a.entry);
    expect(readFileSync(file, "utf8").trimEnd().split("\n")).toHaveLength(2);
  });

  it("returns an empty log for a missing file", () => {
    expect(readLog(join(dir, "none.jsonl"))).toEqual({
      entries: [],
      skipped: 0,
    });
  });

  it("skips bad lines and counts them", () => {
    const a = validateEntry(valid);
    if (!a.ok) throw new Error("fixture invalid");
    const text = `${JSON.stringify(a.entry)}\nnot json\n{"round":1}\n\n`;
    const r = parseLog(text);
    expect(r.entries).toHaveLength(1);
    expect(r.skipped).toBe(2);
  });
});

describe("loopback guards", () => {
  it("accepts loopback addresses only", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("192.168.1.5")).toBe(false);
    expect(isLoopbackAddress(undefined)).toBe(false);
  });

  it("accepts loopback host headers only", () => {
    expect(isLoopbackHost("127.0.0.1:5173")).toBe(true);
    expect(isLoopbackHost("localhost:5173")).toBe(true);
    expect(isLoopbackHost("[::1]:5173")).toBe(true);
    expect(isLoopbackHost("evil.example:5173")).toBe(false);
    expect(isLoopbackHost(undefined)).toBe(false);
  });
});
