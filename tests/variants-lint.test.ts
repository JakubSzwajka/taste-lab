import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { importAllowed, scanVariants } from "../cli/scan-variants";

const fx = (p: string) =>
  resolve(import.meta.dirname, "fixtures/variant-scan", p);
const repo = (p: string) => resolve(import.meta.dirname, "..", p);

describe("variant scanner", () => {
  it("passes a compliant file", () => {
    expect(scanVariants(fx("good"))).toEqual([]);
  });

  it("flags imports outside the allowlist", () => {
    const msgs = scanVariants(fx("bad"))
      .filter((v) => v.file === "bad-import.tsx")
      .map((v) => v.message);
    expect(msgs).toEqual([
      'import "canvas-confetti" is not allowed',
      'import "./local" is not allowed',
      'import "@/components/other" is not allowed',
    ]);
  });

  it("flags raw colors", () => {
    const hits = scanVariants(fx("bad")).filter(
      (v) => v.file === "raw-color.tsx",
    );
    const kinds = new Set(hits.map((v) => v.message));
    expect(kinds).toContain(
      "palette color class (use semantic tokens like bg-card)",
    );
    expect(kinds).toContain("raw white/black class (use semantic tokens)");
    expect(kinds).toContain("arbitrary color value");
    expect(kinds).toContain("hex color literal");
    expect(kinds).toContain("color function literal");
    expect(kinds).toContain("inline style color (use var(--token))");
  });

  it("blocks import bypasses (multiline, template, traversal, dynamic)", () => {
    const hits = scanVariants(fx("bad")).filter(
      (v) => v.file === "import-bypass.tsx",
    );
    const at = (line: number) =>
      hits.filter((v) => v.line === line).map((v) => v.message);
    // multiline `from` clause, reported at the statement start
    expect(at(2)).toEqual(['import "../../src/lib/api" is not allowed']);
    // path traversal and dot segments behind an allowed prefix
    expect(at(6)).toEqual([
      'import "@/components/ui/../../lib/api" is not allowed',
    ]);
    expect(at(7)).toEqual(['import "@/components/ui/./card" is not allowed']);
    expect(at(8)).toEqual(['import "@/lib/rounds" is not allowed']);
    // re-exports
    expect(at(9)).toEqual(['import "node:fs" is not allowed']);
    expect(at(10)).toEqual(['import "zod" is not allowed']);
    // import(`...`), import(name), import("a" + b), require(name)
    for (const line of [14, 15, 16, 17]) {
      expect(at(line)).toEqual([
        "dynamic import needs a plain string literal specifier",
      ]);
    }
    expect(at(18)).toEqual(['import "node:fs" is not allowed']);
    expect(at(19)).toEqual([
      'import "@/components/ui/../../lib/api" is not allowed',
    ]);
    expect(at(20)).toEqual([]); // allowed literal dynamic import
    expect(at(21)).toEqual(['import "node:fs" is not allowed']); // import type
    expect(at(22)).toEqual(["import.meta is not allowed"]);
    // the allowed static import on line 11 is not flagged
    expect(at(11)).toEqual([]);
  });

  it("flags arbitrary color values, style props and style objects", () => {
    const hits = scanVariants(fx("bad")).filter(
      (v) => v.file === "style-and-arbitrary.tsx",
    );
    const at = (line: number) => hits.filter((v) => v.line === line);
    const msgs = (line: number) => at(line).map((v) => v.message);
    expect(msgs(3)).toContain("arbitrary color value"); // bg-[red] in template
    expect(msgs(5)).toEqual(["arbitrary color value"]); // named colors
    expect(msgs(6)).toEqual(["arbitrary color value"]); // template literal
    expect(msgs(7)).toContain("arbitrary color value"); // [color:red]
    expect(msgs(8)).toEqual(["arbitrary color value"]); // color: hint, Red, white
    for (const line of [9, 10, 11, 12]) {
      expect(msgs(line)).toContain(
        "style prop is not allowed (put tokens in round.json)",
      );
    }
    expect(msgs(10)).toEqual([
      "style prop is not allowed (put tokens in round.json)",
    ]); // even var(--token) is banned in variants
    expect(msgs(13)).toEqual([
      "style access is not allowed (put tokens in round.json)",
    ]);
    expect(msgs(17)).toContain("inline style color (use var(--token))");
  });

  it("catches static templates, arbitrary properties and JSX color attributes", () => {
    const hits = scanVariants(fx("bad")).filter(
      (v) => v.file === "color-bypass.tsx",
    );
    const msgs = (line: number) =>
      hits.filter((v) => v.line === line).map((v) => v.message);
    const STYLE = "inline style color (use var(--token))";
    const ARB = "arbitrary color value";
    const JSX = "JSX color attribute (use currentColor or var(--token))";
    expect(msgs(2)).toEqual([STYLE]); // {color: `red`}
    expect(msgs(3)).toEqual([STYLE]); // template in a ternary arm
    expect(msgs(4)).toEqual([ARB]); // [border:1px_solid_red]
    expect(msgs(5)).toEqual([ARB]); // same, in a template
    expect(msgs(6)).toEqual([ARB]); // drop-shadow-[...] and [mask:...]
    for (const line of [7, 8, 9, 10, 11, 12, 13])
      expect(msgs(line)).toEqual([JSX]);
  });

  it("does not flag layout arbitrary values, var() or transparent", () => {
    expect(scanVariants(fx("good"))).toEqual([]);
  });

  it("reports unparsable files instead of skipping them", () => {
    // Written at runtime: a broken fixture file would fail tsc.
    const dir = mkdtempSync(join(tmpdir(), "scan-"));
    writeFileSync(join(dir, "broken.tsx"), "export default function X( {\n");
    const v = scanVariants(dir);
    rmSync(dir, { recursive: true });
    expect(v).toHaveLength(1);
    expect(v[0]?.message).toMatch(/^could not parse file/);
  });

  it("allows style in chrome mode, but still checks style colors", () => {
    // Chrome defaults to banStyle: false. VariantFrame applies tokens via style.
    const strict = scanVariants(fx("bad"), { imports: false, banStyle: true });
    expect(strict.some((v) => v.message.startsWith("style "))).toBe(true);
    const chrome = scanVariants(fx("bad"), { imports: false, banStyle: false });
    expect(chrome.some((v) => v.message.startsWith("style "))).toBe(false);
    expect(
      chrome.some((v) => v.message === "inline style color (use var(--token))"),
    ).toBe(true);
  });

  it("treats a missing or empty root as zero violations", () => {
    expect(scanVariants(fx("does-not-exist"))).toEqual([]);
  });

  it("allowlist matches the contract", () => {
    for (const ok of [
      "react",
      "lucide-react",
      "@/fixtures",
      "@/lib/utils",
      "@/components/ui/card",
    ]) {
      expect(importAllowed(ok)).toBe(true);
    }
    for (const no of [
      "react-dom",
      "@/components/ui/",
      "@/lib/rounds",
      "clsx",
      "../x",
      "@/components/ui/../../lib/api",
      "@/components/ui/./card",
      "@/components/ui/card/extra",
      "@/components/ui/card/",
      "@/components/ui//card",
    ]) {
      expect(importAllowed(no)).toBe(false);
    }
  });
});

describe("repo rules", () => {
  it("demo rounds follow the allowlist and have no raw colors", () => {
    expect(scanVariants(repo("examples/demo/.taste-lab/rounds"))).toEqual([]);
  });

  // The repo's own lab is local and gitignored: a fresh clone has none.
  it.skipIf(!existsSync(repo(".taste-lab/rounds")))(
    "the repo's own lab rounds follow the allowlist and have no raw colors",
    () => {
      expect(scanVariants(repo(".taste-lab/rounds"))).toEqual([]);
    },
  );

  it("app chrome has no raw colors (generated ui/ excluded)", () => {
    const v = scanVariants(repo("src"), { imports: false, ignore: ["ui"] });
    expect(v).toEqual([]);
  });
});
