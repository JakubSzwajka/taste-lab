// The prototype theme: parse and validate `<dataDir>/theme.css`, merge it over
// shadcn stock tokens. Pure functions, no Node and no DOM, so the server, the CLI and the
// Theme page share them.

export type TokenMap = Record<string, string>;
/** Token values per mode. `light` is the `:root` block, `dark` is `.dark`. */
export type TokenBlocks = { light: TokenMap; dark: TokenMap };
export type ThemeProblem = { line: number; message: string };

type Rule = {
  /** Text before `{` (or before `;` for a statement without a block). */
  prelude: string;
  line: number;
  /** Null for a statement without a block, like `@import "x";`. */
  body: string | null;
  bodyLine: number;
};

const lineAt = (text: string, offset: number) => {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text[i] === "\n") line++;
  return line;
};

/** Replaces comments with spaces. Newlines stay, so line numbers hold. */
function stripComments(text: string, problems: ThemeProblem[]): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
    } else if (c === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      const end = close === -1 ? text.length : close + 2;
      if (close === -1) {
        problems.push({
          line: lineAt(text, i),
          message: "comment is never closed",
        });
      }
      out += text.slice(i, end).replace(/[^\n]/g, " ");
      i = end;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Index after the string that starts at `i`. */
function skipString(text: string, i: number): number {
  const q = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== q && text[j] !== "\n") {
    if (text[j] === "\\") j++;
    j++;
  }
  return Math.min(j + 1, text.length);
}

/** Splits stylesheet text (comments already stripped) into top-level rules. */
function scanRules(text: string, problems: ThemeProblem[]): Rule[] {
  const rules: Rule[] = [];
  let start = 0;
  let i = 0;
  const firstLine = (from: number, to: number) => {
    const lead = text.slice(from, to).search(/\S/);
    return lineAt(text, lead === -1 ? to : from + lead);
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i = skipString(text, i);
    } else if (c === ";") {
      const prelude = text.slice(start, i);
      if (prelude.trim() !== "") {
        rules.push({
          prelude: prelude.trim(),
          line: firstLine(start, i),
          body: null,
          bodyLine: 0,
        });
      }
      i++;
      start = i;
    } else if (c === "}") {
      problems.push({ line: lineAt(text, i), message: 'stray "}"' });
      i++;
      start = i;
    } else if (c === "{") {
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '"' || text[j] === "'") {
          j = skipString(text, j);
          continue;
        }
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const closed = depth === 0;
      if (!closed) {
        problems.push({
          line: lineAt(text, i),
          message: 'block is never closed, "}" is missing',
        });
      }
      rules.push({
        prelude: text.slice(start, i).trim(),
        line: firstLine(start, i),
        body: text.slice(i + 1, closed ? j - 1 : j),
        bodyLine: lineAt(text, i + 1),
      });
      i = j;
      start = i;
    } else i++;
  }
  const tail = text.slice(start);
  if (tail.trim() !== "") {
    problems.push({
      line: firstLine(start, text.length),
      message: 'declaration or rule is missing its ";" or "{"',
    });
  }
  return rules;
}

type Decl = { raw: string; line: number };

/**
 * Splits a block body into declarations at `;` outside strings and parentheses.
 * A `;` inside `(` that is followed by `--name:` also splits: the `(` is never
 * closed, and it must not swallow the declarations after it.
 * `declarationProblem` rejects the broken one.
 */
function splitDeclarations(body: string, bodyLine: number): Decl[] {
  const out: Decl[] = [];
  let depth = 0;
  let start = 0;
  const push = (to: number) => {
    const raw = body.slice(start, to);
    if (raw.trim() === "") return;
    const lead = raw.search(/\S/);
    out.push({
      raw: raw.trim(),
      line: bodyLine + lineAt(body, start + lead) - 1,
    });
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'") i = skipString(body, i) - 1;
    else if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (
      c === ";" &&
      (depth === 0 || /^\s*--[\w-]+\s*:/.test(body.slice(i + 1)))
    ) {
      depth = 0;
      push(i);
      start = i + 1;
    }
  }
  push(body.length);
  return out;
}

const emptyBlocks = (): TokenBlocks => ({ light: {}, dark: {} });
const modeOf = (selector: string) =>
  selector === ":root" ? "light" : selector === ".dark" ? "dark" : null;

/**
 * Token names and values of the shadcn stock stylesheet: the `:root` and `.dark`
 * blocks, nothing else. Lenient: it skips every other rule.
 */
export function parseStock(css: string): TokenBlocks {
  const sink: ThemeProblem[] = [];
  const text = stripComments(css, sink);
  const blocks = emptyBlocks();
  for (const rule of scanRules(text, sink)) {
    const mode = modeOf(rule.prelude);
    if (!mode || rule.body === null) continue;
    for (const d of splitDeclarations(rule.body, rule.bodyLine)) {
      const m = /^(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(d.raw);
      if (m) blocks[mode][m[1]] = m[2].trim();
    }
  }
  return blocks;
}

/** The token names a theme may set: every custom property the stock theme defines. */
export const allowedTokens = (stock: TokenBlocks) =>
  new Set([...Object.keys(stock.light), ...Object.keys(stock.dark)]);

/**
 * Validates `theme.css`. Only `:root` and `.dark` blocks that hold shadcn custom
 * properties (names in `allowed`) and comments pass. Returns the accepted values
 * and one line-numbered problem for each thing it rejects. Rejected parts are
 * dropped, so the result is always safe to emit as CSS.
 */
export function parseTheme(
  css: string,
  allowed: ReadonlySet<string>,
): { theme: TokenBlocks; problems: ThemeProblem[] } {
  const problems: ThemeProblem[] = [];
  const text = stripComments(css, problems);
  const theme = emptyBlocks();
  for (const rule of scanRules(text, problems)) {
    const { prelude } = rule;
    if (prelude.startsWith("@")) {
      const name = /^@[\w-]*/.exec(prelude)?.[0] ?? "@";
      problems.push({
        line: rule.line,
        message:
          name === "@import"
            ? "@import is not allowed"
            : `at-rule ${name} is not allowed`,
      });
      continue;
    }
    const mode = modeOf(prelude);
    if (!mode) {
      problems.push({
        line: rule.line,
        message: `selector "${prelude}" is not allowed. Use only :root and .dark`,
      });
      continue;
    }
    if (rule.body === null) {
      problems.push({
        line: rule.line,
        message: `"${prelude}" needs a { } block`,
      });
      continue;
    }
    for (const d of splitDeclarations(rule.body, rule.bodyLine)) {
      const problem = declarationProblem(d.raw, allowed);
      if ("message" in problem) {
        problems.push({ line: d.line, message: problem.message });
      } else theme[mode][problem.name] = problem.value;
    }
  }
  problems.sort((a, b) => a.line - b.line);
  return { theme, problems };
}

function declarationProblem(
  raw: string,
  allowed: ReadonlySet<string>,
): { name: string; value: string } | { message: string } {
  if (/[{}]/.test(raw)) {
    return { message: "nested rules are not allowed" };
  }
  const colon = raw.indexOf(":");
  if (colon === -1) {
    return {
      message: `"${raw}" is not a declaration. Expected "--name: value"`,
    };
  }
  const name = raw.slice(0, colon).trim();
  const value = raw.slice(colon + 1).trim();
  if (!name.startsWith("--")) {
    return {
      message: `"${name}" is not a custom property. Only --name declarations are allowed`,
    };
  }
  if (!allowed.has(name)) {
    return {
      message: `unknown token ${name}. Only the shadcn variables from the lab's src/index.css are allowed`,
    };
  }
  if (value === "") return { message: `${name} has no value` };
  if (/url\s*\(/i.test(value)) {
    return { message: `url() is not allowed (${name})` };
  }
  if (value.includes(";")) {
    return { message: `stray ";" inside the value of ${name}` };
  }
  const broken = delimiterProblem(value);
  if (broken) return { message: `${broken} (${name})` };
  if (/!\s*important/i.test(value)) {
    return {
      message: `!important is not allowed (${name}). It would beat round tokens`,
    };
  }
  if (/["'\\]/.test(value)) {
    return {
      message: `quotes and backslashes are not allowed in values (${name})`,
    };
  }
  return { name, value };
}

/** Why a value's `()`, `[]` or quotes do not pair up, or null when they do. */
function delimiterProblem(value: string): string | null {
  const close: Record<string, string> = { "(": ")", "[": "]" };
  const stack: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '"' || c === "'") {
      const end = skipString(value, i);
      if (value[end - 1] !== c || end - 1 === i)
        return "string is never closed";
      i = end - 1;
    } else if (c in close) stack.push(close[c]);
    else if (c === ")" || c === "]") {
      if (stack.pop() !== c) return `unmatched "${c}"`;
    }
  }
  return stack.length > 0 ? `"${stack[stack.length - 1]}" is missing` : null;
}

export type TokenSource = "stock" | "theme";
export type TokenRow = {
  name: string;
  light: { value: string; source: TokenSource };
  dark: { value: string; source: TokenSource };
};

/**
 * What each token resolves to in each mode, and where the value comes from.
 * Light: `theme.css :root`, else stock `:root`.
 * Dark: `theme.css .dark`, else stock `.dark`, else the light value (a token only
 * in `:root`, like `--radius`, is shared by both modes).
 */
export function resolveTokens(
  stock: TokenBlocks,
  theme: TokenBlocks,
): TokenRow[] {
  const names = [
    ...new Set([...Object.keys(stock.light), ...Object.keys(stock.dark)]),
  ];
  return names.map((name) => {
    const light =
      name in theme.light
        ? { value: theme.light[name], source: "theme" as const }
        : {
            value: stock.light[name] ?? stock.dark[name],
            source: "stock" as const,
          };
    const dark =
      name in theme.dark
        ? { value: theme.dark[name], source: "theme" as const }
        : name in stock.dark
          ? { value: stock.dark[name], source: "stock" as const }
          : { ...light };
    return { name, light, dark };
  });
}

/**
 * Each prototype root gets every stock token, then accepted theme.css values.
 * Explicit modes let a Library canvas differ from the lab mode. No selector
 * targets the page, so data dir tokens cannot change chrome. Round tokens set
 * inline on the same root still win. Values from `parseTheme` are safe to emit.
 */
export function themeToCss(stock: TokenBlocks, theme: TokenBlocks): string {
  const rows = resolveTokens(stock, theme);
  const block = (mode: "light" | "dark") =>
    `[data-taste-scope="${mode}"] {\n${rows.map((r) => `  ${r.name}: ${r[mode].value};`).join("\n")}\n}\n`;
  return `/* Prototype tokens: shadcn stock, then theme.css. */\n${block("light")}${block("dark")}`;
}

/**
 * Every token's light value: theme.css `:root` over stock `:root`. The library
 * canvas sets these inline to force a light canvas while the lab is dark, the
 * same way round tokens win over `.dark` on <html>.
 */
export function lightTokens(stock: TokenBlocks, theme: TokenBlocks): TokenMap {
  return Object.fromEntries(
    resolveTokens(stock, theme).map((r) => [r.name, r.light.value]),
  );
}
