import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { importAllowed, scanVariants } from "./scan-variants";

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
    ]) {
      expect(importAllowed(no)).toBe(false);
    }
  });
});

describe("repo rules", () => {
  it("variants/ follows the allowlist and has no raw colors", () => {
    expect(scanVariants(repo("variants"))).toEqual([]);
  });

  it("app chrome has no raw colors (generated ui/ excluded)", () => {
    const v = scanVariants(repo("src"), { imports: false, ignore: ["ui"] });
    expect(v).toEqual([]);
  });
});
