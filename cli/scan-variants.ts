import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, posix, relative } from "node:path";
import { parseAst } from "vite";
import { NAME_RE, pascalCase } from "../src/lib/library.ts";

export type Violation = { file: string; line: number; message: string };

const IMPORT_ALLOW_EXACT = [
  "react",
  "react/jsx-runtime",
  "lucide-react",
  "@/fixtures",
  "@/lib/utils",
  "class-variance-authority",
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

type WalkProblem = { file: string; message: string };

const errMsg = (e: unknown) => {
  const code = (e as NodeJS.ErrnoException)?.code;
  return code ?? (e instanceof Error ? e.message.split("\n")[0] : String(e));
};

/**
 * Lists matching files under `dir`, following symlinks. Filesystem trouble
 * (dangling or cyclic links, unreadable dirs) goes to `problems` and the walk
 * goes on. `ancestors` holds the real paths of the dirs above, to stop cycles.
 */
function walk(
  dir: string,
  exts: string[],
  ignore: string[],
  problems: WalkProblem[],
  root = dir,
  ancestors: string[] = [],
): string[] {
  let real: string;
  let names: string[];
  try {
    real = realpathSync(dir);
    names = readdirSync(dir);
  } catch (e) {
    // A missing root just means "nothing to scan". Anything deeper is a problem.
    if (dir !== root || (e as NodeJS.ErrnoException).code !== "ENOENT") {
      problems.push({
        file: relative(root, dir) || ".",
        message: `cannot read directory (${errMsg(e)})`,
      });
    }
    return [];
  }
  if (ancestors.includes(real)) {
    problems.push({
      file: relative(root, dir),
      message: "symlink cycle: directory links back to one of its parents",
    });
    return [];
  }
  const out: string[] = [];
  for (const name of names.sort()) {
    const full = join(dir, name);
    if (ignore.some((i) => full.split("/").includes(i))) continue;
    let isDir: boolean;
    try {
      isDir = statSync(full).isDirectory();
    } catch (e) {
      problems.push({
        file: relative(root, full),
        message: `cannot read entry, dangling or looping symlink? (${errMsg(e)})`,
      });
      continue;
    }
    if (isDir) {
      out.push(
        ...walk(full, exts, ignore, problems, root, [...ancestors, real]),
      );
    } else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

// `@/library/<name>/<Name>`: one library component, never a deeper or looser path.
// <name> follows the shared kebab rule and <Name> is its PascalCase.
const LIBRARY_IMPORT = /^@\/library\/([^/]+)\/([^/]+)$/;
const isLibraryImport = (spec: string) => {
  const m = LIBRARY_IMPORT.exec(spec);
  return (
    !!m && NAME_RE.test(m[1] as string) && pascalCase(m[1] as string) === m[2]
  );
};
// `./TaskCard`: a sibling file in the same library folder, no extension.
const SIBLING_IMPORT = /^\.\/[A-Za-z0-9_-]+$/;

/**
 * `library: true` is the rule set for files in `library/<name>/`: it also allows
 * sibling imports like `./TaskCard`. `class-variance-authority` is allowed everywhere,
 * so a round can copy a library component that uses cva.
 */
export function importAllowed(
  spec: string,
  opts: { library?: boolean } = {},
): boolean {
  if (opts.library) {
    if (SIBLING_IMPORT.test(spec)) return true;
  }
  // Normalizing must not change the specifier. This rejects "..", "." and "//".
  if (spec.includes("\\") || posix.normalize(spec) !== spec) return false;
  if (spec.split("/").some((seg) => seg === ".." || seg === ".")) return false;
  return (
    IMPORT_ALLOW_EXACT.includes(spec) ||
    isLibraryImport(spec) ||
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

// Any utility with an arbitrary value: bg-[red], border-[1px_solid_red], drop-shadow-[0_0_red].
const ARBITRARY_UTIL_RE = /(?<![\w-])(?:[a-z-]+:)*[a-z][\w-]*-\[([^\]]*)\]/g;
// Tailwind arbitrary property: [color:red], [border:1px_solid_red], [--x:oklch(...)].
// Any property name. The value is what gets checked.
const ARBITRARY_PROP_RE = /(?<![\w\]-])\[(-{0,2}[a-z][a-z-]*):([^\]]*)\]/g;
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
// JSX attributes that carry a color. Kebab names are valid JSX identifiers too.
const JSX_COLOR_ATTRS = new Set([
  "fill",
  "stroke",
  "color",
  "stopColor",
  "stop-color",
  "floodColor",
  "flood-color",
  "lightingColor",
  "lighting-color",
]);

/** Drops var(--token) references, which name a theme color. */
const stripSafe = (v: string) => v.replace(/var\([^)]*\)/gi, "");

function stringColorViolations(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(ARBITRARY_UTIL_RE)) {
    const inner = m[1] as string;
    if (/^color:/i.test(inner) || isRawColorValue(stripSafe(inner))) {
      out.push("arbitrary color value");
    }
  }
  for (const m of text.matchAll(ARBITRARY_PROP_RE)) {
    if (isRawColorValue(stripSafe(m[2] as string))) {
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

/** A string literal, or a template literal with no expressions, as its string value. */
function staticString(n: unknown): string | null {
  const plain = stringValue(n);
  if (plain !== null) return plain;
  if (isNode(n) && n.type === "TemplateLiteral") {
    const quasis = n.quasis as Node[];
    const exprs = n.expressions as unknown[];
    if (exprs.length === 0 && quasis.length === 1) {
      const v = quasis[0]?.value as { raw?: string; cooked?: string | null };
      return v.cooked ?? v.raw ?? "";
    }
  }
  return null;
}

/** Every static string inside a value, e.g. both arms of `a ? "red" : "blue"`. */
function staticStrings(n: unknown, out: string[] = []): string[] {
  if (Array.isArray(n)) {
    for (const x of n) staticStrings(x, out);
    return out;
  }
  if (!isNode(n)) return out;
  const s = staticString(n);
  if (s !== null) {
    out.push(s);
    return out;
  }
  if (n.type === "TemplateLiteral") {
    for (const q of n.quasis as Node[]) {
      const v = q.value as { raw?: string; cooked?: string | null };
      out.push(v.cooked ?? v.raw ?? "");
    }
  }
  for (const [k, v] of Object.entries(n)) {
    if (k === "type" || typeof v !== "object" || v === null) continue;
    staticStrings(v, out);
  }
  return out;
}

// Extensions the bundler tries for `./Name`, in its order.
const RESOLVE_EXTS = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"];

/**
 * Why `./Name` in `dir` is not a scanned source file, or null when it is.
 * Only `.ts` and `.tsx` are scanned, so a `.js` or `.jsx` sibling (or a folder
 * with an index file) would run unchecked code.
 */
function siblingProblem(dir: string, spec: string): string | null {
  const base = spec.slice(2);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return null; // the walk already reports an unreadable folder
  }
  const hit = RESOLVE_EXTS.filter((e) => names.includes(base + e));
  // A folder named `Helper.ts` is not a module. Every candidate must be a regular file.
  const notFile = hit.find((e) => {
    try {
      return !statSync(join(dir, base + e)).isFile();
    } catch {
      return true;
    }
  });
  if (notFile) {
    return `import "${spec}" must point to a regular .ts or .tsx file, but ${base}${notFile} is not a file`;
  }
  if (names.includes(base)) {
    return `import "${spec}" must point to a .ts or .tsx file in this folder`;
  }
  if (hit.length === 0)
    return `import "${spec}" does not match a .ts or .tsx file`;
  const other = hit.find((e) => e !== ".ts" && e !== ".tsx");
  if (other) {
    return `import "${spec}" can resolve to ${base}${other}, which is not scanned (only .ts and .tsx are allowed)`;
  }
  return null;
}

type ImportPolicy = {
  /** Folder of the file being scanned, to resolve sibling imports. */
  dir: string;
  /** Library file rules: cva and sibling imports. */
  library: boolean;
  /** Library files other than examples.tsx may only import types from `@/fixtures`. */
  fixturesTypesOnly: boolean;
};

function checkSpecifier(
  spec: unknown,
  at: number,
  report: (at: number, message: string) => void,
  policy: ImportPolicy,
  opts: { dynamic?: boolean; typeOnly?: boolean } = {},
) {
  const value = stringValue(spec);
  if (value === null) {
    report(
      at,
      opts.dynamic
        ? "dynamic import needs a plain string literal specifier"
        : "import specifier must be a string literal",
    );
  } else if (!importAllowed(value, { library: policy.library })) {
    report(at, `import "${value}" is not allowed`);
  } else if (policy.library && SIBLING_IMPORT.test(value)) {
    const bad = siblingProblem(policy.dir, value);
    if (bad) report(at, bad);
  } else if (
    value === "@/fixtures" &&
    policy.fixturesTypesOnly &&
    !opts.typeOnly
  ) {
    report(
      at,
      'import "@/fixtures" is only allowed in examples.tsx (components take data as props; `import type` is fine)',
    );
  }
}

function propName(key: unknown): string | null {
  if (!isNode(key)) return null;
  if (key.type === "Identifier") return key.name as string;
  return stringValue(key);
}

function walkNodes(n: unknown, fn: (node: Node) => void) {
  if (Array.isArray(n)) {
    for (const x of n) walkNodes(x, fn);
    return;
  }
  if (!isNode(n)) return;
  fn(n);
  for (const [k, v] of Object.entries(n)) {
    if (k === "type" || typeof v !== "object" || v === null) continue;
    walkNodes(v, fn);
  }
}

// Element factories are banned (see `visit`), so the only way a style object
// becomes a prop is a JSX spread.
const ELEMENT_FACTORIES = new Set([
  "createElement",
  "cloneElement",
  "jsx",
  "jsxs",
  "jsxDEV",
]);
const FACTORY_MESSAGE =
  "element factories (createElement, cloneElement, jsx, jsxs, jsxDEV) are not allowed, use JSX";

/** The name a member access or key reads, for `a.b`, `a["b"]` and `{ b }`. */
function accessName(prop: unknown, computed: unknown): string | null {
  if (!isNode(prop)) return null;
  if (!computed)
    return prop.type === "Identifier" ? (prop.name as string) : null;
  return staticString(prop);
}

/**
 * `style` keys in objects that become React props: spread into JSX, or held in a
 * variable that is. Other objects with a `style` key
 * (`Intl.NumberFormat(l, { style: "currency" })`) are not props.
 * The match is by name and over-approximate: it may flag an unrelated object that
 * shares a name with a spread one. It never looks across files.
 */
function styleSinkProps(ast: unknown): Set<unknown> {
  const bad = new Set<unknown>();
  const sinkNames = new Set<string>();
  const markStyleKeys = (root: unknown) =>
    walkNodes(root, (n) => {
      if (n.type === "Property" && propName(n.key) === "style") bad.add(n);
    });
  const collectNames = (root: unknown) =>
    walkNodes(root, (n) => {
      if (n.type === "Identifier") sinkNames.add(n.name as string);
    });
  const bindings: { name: string; node: unknown }[] = [];
  walkNodes(ast, (n) => {
    if (n.type === "JSXSpreadAttribute") {
      markStyleKeys(n.argument);
      collectNames(n.argument);
    } else if (
      n.type === "VariableDeclarator" &&
      isNode(n.id) &&
      n.id.type === "Identifier" &&
      n.init
    ) {
      bindings.push({ name: n.id.name as string, node: n.init });
    } else if (
      n.type === "FunctionDeclaration" &&
      isNode(n.id) &&
      n.id.type === "Identifier"
    ) {
      bindings.push({ name: n.id.name as string, node: n.body });
    }
  });
  // A bound value that reaches a sink brings the names it uses along with it.
  const done = new Set<unknown>();
  for (let grew = true; grew; ) {
    grew = false;
    for (const b of bindings) {
      if (done.has(b) || !sinkNames.has(b.name)) continue;
      done.add(b);
      grew = true;
      markStyleKeys(b.node);
      collectNames(b.node);
    }
  }
  return bad;
}

function visit(
  node: unknown,
  ctx: {
    imports: boolean;
    banStyle: boolean;
    styleProps: Set<unknown>;
    policy: ImportPolicy;
    report: (at: number, message: string) => void;
  },
) {
  if (Array.isArray(node)) {
    for (const n of node) visit(n, ctx);
    return;
  }
  if (!isNode(node)) return;
  const at = node.start ?? 0;
  const { imports, banStyle, report, policy, styleProps } = ctx;
  switch (node.type) {
    case "ImportDeclaration":
    case "ExportAllDeclaration":
    case "ExportNamedDeclaration":
      if (imports && node.source) {
        const kind = node.importKind ?? node.exportKind;
        checkSpecifier(node.source, at, report, policy, {
          typeOnly: kind === "type",
        });
      }
      break;
    case "ImportExpression":
      if (imports) {
        checkSpecifier(node.source, at, report, policy, { dynamic: true });
      }
      break;
    case "TSImportType":
      if (imports) {
        checkSpecifier(node.source, at, report, policy, { typeOnly: true });
      }
      break;
    case "TSExternalModuleReference":
      if (imports) checkSpecifier(node.expression, at, report, policy);
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
        checkSpecifier((node.arguments as unknown[])[0], at, report, policy, {
          dynamic: true,
        });
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
      if (
        isNode(name) &&
        name.type === "JSXIdentifier" &&
        JSX_COLOR_ATTRS.has(name.name as string) &&
        staticStrings(node.value).some((v) => isRawColorValue(stripSafe(v)))
      ) {
        report(at, "JSX color attribute (use currentColor or var(--token))");
      }
      break;
    }
    case "MemberExpression": {
      const name = accessName(node.property, node.computed);
      if (banStyle && propName(node.property) === "style") {
        report(at, "style access is not allowed (put tokens in round.json)");
      }
      if (banStyle && name && ELEMENT_FACTORIES.has(name)) {
        report(at, FACTORY_MESSAGE);
      }
      break;
    }
    case "ImportSpecifier":
    case "ExportSpecifier": {
      const name = propName(
        node.type === "ImportSpecifier" ? node.imported : node.local,
      );
      if (banStyle && name && ELEMENT_FACTORIES.has(name)) {
        report(at, FACTORY_MESSAGE);
      }
      break;
    }
    case "ObjectPattern":
      // `const { createElement: h } = React`
      for (const p of node.properties as Node[]) {
        const name =
          p.type === "Property" ? accessName(p.key, p.computed) : null;
        if (banStyle && name && ELEMENT_FACTORIES.has(name)) {
          report(at, FACTORY_MESSAGE);
        }
      }
      break;
    case "Property": {
      const key = propName(node.key);
      if (banStyle && key === "style" && styleProps.has(node)) {
        report(at, "style prop is not allowed (put tokens in round.json)");
      }
      if (
        key &&
        STYLE_COLOR_KEYS.has(key) &&
        staticStrings(node.value).some((v) => isRawColorValue(stripSafe(v)))
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
 * `library: true` applies the library rules (see `importAllowed`), and only
 * `examples.tsx` may import values from `@/fixtures`.
 */
export function scanVariants(
  root: string,
  opts: {
    imports?: boolean;
    banStyle?: boolean;
    ignore?: string[];
    library?: boolean;
  } = {},
): Violation[] {
  const {
    imports = true,
    banStyle = imports,
    ignore = [],
    library = false,
  } = opts;
  const violations: Violation[] = [];
  const problems: WalkProblem[] = [];
  const files = walk(root, [".tsx", ".ts"], ignore, problems);
  // Filesystem problems are reported as line 0 violations.
  for (const p of problems) violations.push({ ...p, line: 0 });
  for (const file of files) {
    const rel = relative(root, file);
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch (e) {
      violations.push({
        file: rel,
        line: 0,
        message: `cannot read file (${errMsg(e)})`,
      });
      continue;
    }
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
        styleProps: banStyle ? styleSinkProps(ast) : new Set(),
        policy: {
          dir: dirname(file),
          library,
          fixturesTypesOnly: library && basename(file) !== "examples.tsx",
        },
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
