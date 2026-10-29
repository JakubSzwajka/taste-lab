import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type Violation = { file: string; line: number; message: string };

const IMPORT_ALLOW_EXACT = [
  "react",
  "react/jsx-runtime",
  "lucide-react",
  "@/fixtures",
  "@/lib/utils",
];
const IMPORT_ALLOW_PREFIX = ["@/components/ui/"];

const PALETTES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILS =
  "bg|text|border|border-[xytblrse]|ring|ring-offset|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder";

const COLOR_RULES: { re: RegExp; message: string }[] = [
  {
    // Letters needed unless the digits follow a quote, bracket, colon or "=".
    // This lets "Issue #123" text pass while "#fff" and "[#000]" fail.
    re: /(?<![\w&])#(?=[0-9a-fA-F]*[a-fA-F])(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|(?<=["'`[(:=])#[0-9]{3,8}\b/,
    message: "hex color literal",
  },
  {
    re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/,
    message: "color function literal",
  },
  {
    re: new RegExp(
      `(?<![\\w-])(?:[a-z-]+:)*(?:${UTILS})-(?:${PALETTES})-\\d{2,3}(?![\\w-])`,
    ),
    message: "palette color class (use semantic tokens like bg-card)",
  },
  {
    re: new RegExp(
      `(?<![\\w-])(?:[a-z-]+:)*(?:${UTILS})-(?:white|black)(?![\\w-])`,
    ),
    message: "raw white/black class (use semantic tokens)",
  },
  {
    re: new RegExp(
      `(?<![\\w-])(?:[a-z-]+:)*(?:${UTILS})-\\[(?:color:|#|[a-z]+\\()`,
    ),
    message: "arbitrary color value",
  },
  {
    re: /\b(?:color|backgroundColor|borderColor|fill|stroke|background)\s*:\s*["'`](?!var\(|inherit|currentColor|transparent)/,
    message: "inline style color (use var(--token))",
  },
];

function walk(dir: string, exts: string[], ignore: string[]): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of names.sort()) {
    const full = join(dir, name);
    if (ignore.some((i) => full.split("/").includes(i))) continue;
    if (statSync(full).isDirectory()) out.push(...walk(full, exts, ignore));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function importSpecifiers(line: string): string[] {
  const found: string[] = [];
  const re =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;
  for (const m of line.matchAll(re)) found.push(m[1] as string);
  return found;
}

export function importAllowed(spec: string): boolean {
  return (
    IMPORT_ALLOW_EXACT.includes(spec) ||
    IMPORT_ALLOW_PREFIX.some(
      (p) => spec.startsWith(p) && spec.length > p.length,
    )
  );
}

/**
 * Scans .ts/.tsx files under `root`. Zero files means zero violations.
 * `imports: false` checks colors only (used for the app chrome).
 */
export function scanVariants(
  root: string,
  opts: { imports?: boolean; ignore?: string[] } = {},
): Violation[] {
  const { imports = true, ignore = [] } = opts;
  const violations: Violation[] = [];
  for (const file of walk(root, [".tsx", ".ts"], ignore)) {
    const rel = relative(root, file);
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((text, i) => {
        const line = i + 1;
        if (imports) {
          for (const spec of importSpecifiers(text)) {
            if (!importAllowed(spec)) {
              violations.push({
                file: rel,
                line,
                message: `import "${spec}" is not allowed`,
              });
            }
          }
        }
        for (const rule of COLOR_RULES) {
          if (rule.re.test(text))
            violations.push({ file: rel, line, message: rule.message });
        }
      });
  }
  return violations;
}
