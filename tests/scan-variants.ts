import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { parseAst } from "vite";

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
      `(?<![\\w-])(?:[a-z-]+:)*(?:${UTILS})-\\[(?:color:|#|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\\()`,
    ),
    message: "arbitrary color value",
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

export function importAllowed(spec: string): boolean {
  // Normalizing must not change the specifier. This rejects "..", "." and "//".
  if (spec.includes("\\") || posix.normalize(spec) !== spec) return false;
  if (spec.split("/").some((seg) => seg === ".." || seg === ".")) return false;
  return (
    IMPORT_ALLOW_EXACT.includes(spec) ||
    IMPORT_ALLOW_PREFIX.some(
      (p) => spec.startsWith(p) && /^[a-z0-9-]+$/.test(spec.slice(p.length)),
    )
  );
}

// CSS named colors. "transparent", "currentcolor" and "inherit" stay allowed.
const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(
    " ",
  ),
);

const HEX_VALUE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

/** True when a CSS value (or Tailwind arbitrary value content) is a raw color. */
export function isRawColorValue(value: string): boolean {
  if (COLOR_FN.test(value) || /#[0-9a-f]{3,8}\b/i.test(value)) return true;
  return value
    .split(/[\s_,/()]+/)
    .some((t) => HEX_VALUE.test(t) || NAMED_COLORS.has(t.toLowerCase()));
}

const ARBITRARY_UTIL_RE = new RegExp(
  `(?<![\\w-])(?:${UTILS})-\\[([^\\]]*)\\]`,
  "g",
);
// Tailwind arbitrary property: [color:red], [--x:oklch(...)].
const ARBITRARY_PROP_RE = /(?<![\w\]-])\[(-{0,2}[a-z][a-z-]*):([^\]]*)\]/g;
const COLOR_PROPS =
  /^(?:color|background(?:-color|-image)?|border(?:-[a-z]+)*-color|border-color|fill|stroke|outline-color|caret-color|accent-color|text-decoration-color|box-shadow|text-shadow|--[\w-]+)$/;
const STYLE_COLOR_KEYS = new Set([
  "color",
  "backgroundColor",
  "background",
  "borderColor",
  "outlineColor",
  "fill",
  "stroke",
  "caretColor",
  "accentColor",
  "boxShadow",
  "textShadow",
]);

function stringColorViolations(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(ARBITRARY_UTIL_RE)) {
    const inner = m[1] as string;
    if (/^color:/i.test(inner) || isRawColorValue(inner)) {
      out.push("arbitrary color value");
    }
  }
  for (const m of text.matchAll(ARBITRARY_PROP_RE)) {
    if (
      COLOR_PROPS.test(m[1] as string) &&
      isRawColorValue((m[2] as string).replace(/var\([^)]*\)/g, ""))
    ) {
      out.push("arbitrary color value");
    }
  }
  return out;
}

type Node = { type: string; start?: number; [k: string]: unknown };
const isNode = (v: unknown): v is Node =>
  typeof v === "object" && v !== null && typeof (v as Node).type === "string";

function stringValue(n: unknown): string | null {
  if (!isNode(n)) return null;
  if (n.type === "Literal" && typeof n.value === "string") return n.value;
  return null;
}

function checkSpecifier(
  spec: unknown,
  at: number,
  report: (at: number, message: string) => void,
  dynamic = false,
) {
  const value = stringValue(spec);
  if (value === null) {
    report(
      at,
      dynamic
        ? "dynamic import needs a plain string literal specifier"
        : "import specifier must be a string literal",
    );
  } else if (!importAllowed(value)) {
    report(at, `import "${value}" is not allowed`);
  }
}

function propName(key: unknown): string | null {
  if (!isNode(key)) return null;
  if (key.type === "Identifier") return key.name as string;
  return stringValue(key);
}

function visit(
  node: unknown,
  ctx: {
    imports: boolean;
    banStyle: boolean;
    report: (at: number, message: string) => void;
  },
) {
  if (Array.isArray(node)) {
    for (const n of node) visit(n, ctx);
    return;
  }
  if (!isNode(node)) return;
  const at = node.start ?? 0;
  const { imports, banStyle, report } = ctx;
  switch (node.type) {
    case "ImportDeclaration":
    case "ExportAllDeclaration":
    case "ExportNamedDeclaration":
      if (imports && node.source) checkSpecifier(node.source, at, report);
      break;
    case "ImportExpression":
      if (imports) checkSpecifier(node.source, at, report, true);
      break;
    case "TSImportType":
      if (imports) checkSpecifier(node.source, at, report);
      break;
    case "TSExternalModuleReference":
      if (imports) checkSpecifier(node.expression, at, report);
      break;
    case "MetaProperty":
      if (imports) report(at, "import.meta is not allowed");
      break;
    case "CallExpression": {
      const callee = node.callee;
      if (
        imports &&
        isNode(callee) &&
        callee.type === "Identifier" &&
        callee.name === "require"
      ) {
        checkSpecifier((node.arguments as unknown[])[0], at, report, true);
      }
      break;
    }
    case "JSXAttribute": {
      const name = node.name;
      if (
        banStyle &&
        isNode(name) &&
        name.type === "JSXIdentifier" &&
        name.name === "style"
      ) {
        report(at, "style prop is not allowed (put tokens in round.json)");
      }
      break;
    }
    case "MemberExpression":
      if (banStyle && propName(node.property) === "style") {
        report(at, "style access is not allowed (put tokens in round.json)");
      }
      break;
    case "Property": {
      const key = propName(node.key);
      if (banStyle && key === "style") {
        report(at, "style prop is not allowed (put tokens in round.json)");
      }
      const val = stringValue(node.value);
      if (
        key &&
        STYLE_COLOR_KEYS.has(key) &&
        val !== null &&
        isRawColorValue(val.replace(/var\([^)]*\)/g, ""))
      ) {
        report(at, "inline style color (use var(--token))");
      }
      break;
    }
    case "Literal":
      if (typeof node.value === "string") {
        for (const m of stringColorViolations(node.value)) report(at, m);
      }
      break;
    case "TemplateElement": {
      const v = node.value as { raw?: string; cooked?: string | null };
      for (const m of stringColorViolations(v.cooked ?? v.raw ?? "")) {
        report(at, m);
      }
      break;
    }
    case "JSXText":
      break;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "type" || typeof v !== "object" || v === null) continue;
    visit(v, ctx);
  }
}

/**
 * Scans .ts/.tsx files under `root`. Zero files means zero violations.
 * `imports: false` checks colors only (used for the app chrome).
 */
export function scanVariants(
  root: string,
  opts: { imports?: boolean; banStyle?: boolean; ignore?: string[] } = {},
): Violation[] {
  const { imports = true, banStyle = imports, ignore = [] } = opts;
  const violations: Violation[] = [];
  for (const file of walk(root, [".tsx", ".ts"], ignore)) {
    const rel = relative(root, file);
    const source = readFileSync(file, "utf8");
    const lineStarts = [0];
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "\n") lineStarts.push(i + 1);
    }
    const lineAt = (offset: number) => {
      let lo = 0;
      let hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if ((lineStarts[mid] as number) <= offset) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    };
    const seen = new Set<string>();
    const add = (line: number, message: string) => {
      const key = `${line}:${message}`;
      if (seen.has(key)) return;
      seen.add(key);
      violations.push({ file: rel, line, message });
    };
    // Text rules: hex, color functions and palette classes, wherever they appear.
    source.split("\n").forEach((text, i) => {
      for (const rule of COLOR_RULES) {
        if (rule.re.test(text)) add(i + 1, rule.message);
      }
    });
    // Syntax rules: imports, style props, arbitrary colors, style objects.
    try {
      const ast = parseAst(source, {
        lang: file.endsWith(".tsx") ? "tsx" : "ts",
      });
      visit(ast, {
        imports,
        banStyle,
        report: (at, message) => add(lineAt(at), message),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : "error";
      add(1, `could not parse file: ${msg}`);
    }
  }
  return violations.sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1,
  );
}
