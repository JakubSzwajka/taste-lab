import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCli } from "../cli/args";
import { run } from "../cli/main";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-library-cli-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: { out: (s: string) => out.push(s), err: (s: string) => err.push(s) },
  };
}
function entry(dir: string, name: string, status: "draft" | "agreed") {
  const folder = join(dir, "library", name);
  mkdirSync(folder, { recursive: true });
  const component = name
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  writeFileSync(
    join(folder, `${component}.tsx`),
    `export function ${component}() { return <div />; }`,
  );
  writeFileSync(
    join(folder, "examples.tsx"),
    "export function Default() { return <div />; }",
  );
  writeFileSync(
    join(folder, "meta.json"),
    JSON.stringify({
      name,
      title: component,
      description: `${component} component`,
      status,
      examples: [{ export: "Default", title: "Default", width: "column" }],
      provenance: [],
      rules: [],
    }),
  );
}

describe("library command", () => {
  it("lists an empty library successfully", async () => {
    mkdirSync(join(tmp, "library"), { recursive: true });
    const c = capture();
    expect(await run(["library", "--dir", tmp], c.io)).toBe(0);
    expect(c.out.join("\n")).toContain("No library entries.");
  });

  it("lists entries and filters by status", async () => {
    entry(tmp, "draft-card", "draft");
    entry(tmp, "agreed-card", "agreed");
    const c = capture();
    expect(
      await run(["library", "--dir", tmp, "--status", "draft"], c.io),
    ).toBe(0);
    expect(c.out.join("\n")).toContain("draft-card");
    expect(c.out.join("\n")).not.toContain("agreed-card");
  });

  it("reports broken entries and exits 1", async () => {
    const folder = join(tmp, "library", "broken-card");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "meta.json"), "{");
    const c = capture();
    expect(await run(["library", "--dir", tmp], c.io)).toBe(1);
    expect(c.err.join("\n")).toContain("meta.json is not valid JSON");
  });

  it("prints a JSON array with the listing fields", async () => {
    entry(tmp, "agreed-card", "agreed");
    const c = capture();
    expect(await run(["library", "--dir", tmp, "--json"], c.io)).toBe(0);
    expect(JSON.parse(c.out[0])).toEqual([
      expect.objectContaining({
        name: "agreed-card",
        status: "agreed",
        title: "AgreedCard",
        path: join(tmp, "library", "agreed-card"),
        exampleCount: 1,
        problems: [],
      }),
    ]);
  });

  it("rejects invalid filters and missing dirs as usage errors", async () => {
    expect(() =>
      parseCli(["library", "--dir", tmp, "--status", "other"]),
    ).toThrow("--status must");
    const c = capture();
    expect(await run(["library", "--status", "draft"], c.io)).toBe(2);
  });
});
