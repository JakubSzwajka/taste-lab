import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDataDir } from "../cli/check";
import { initDataDir } from "../cli/init";
import { run } from "../cli/main";
import { tasteLab } from "../server/vite-plugin";
import { ThemeView } from "../src/components/ThemeView";
import { VariantFrame } from "../src/components/VariantFrame";
import { hrefFor, parseHash } from "../src/lib/route";
import {
  allowedTokens,
  parseStock,
  parseTheme,
  resolveTokens,
  themeToCss,
} from "../src/lib/taste-theme";

const repo = resolve(import.meta.dirname, "..");
const stockCss = readFileSync(join(repo, "src/index.css"), "utf8");
const stock = parseStock(stockCss);
const allowed = allowedTokens(stock);
const check = (css: string) => parseTheme(css, allowed);

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-theme-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("stock tokens", () => {
  it("reads the :root and .dark variables of the lab stylesheet", () => {
    expect(stock.light["--primary"]).toBe("oklch(0.205 0 0)");
    expect(stock.dark["--primary"]).toBe("oklch(0.922 0 0)");
    expect(stock.light["--radius"]).toBe("0.625rem");
    expect(stock.dark["--radius"]).toBeUndefined();
    // @theme and @layer rules are not tokens
    expect(allowed.has("--font-sans")).toBe(false);
    expect(allowed.has("--color-primary")).toBe(false);
    for (const n of ["--chart-1", "--sidebar-ring", "--destructive"]) {
      expect(allowed.has(n)).toBe(true);
    }
  });
});

describe("theme.css validator", () => {
  it("accepts :root and .dark with known tokens, raw colors and comments", () => {
    const r = check(`/* header, even with @import url(x) { in it */
:root {
  --primary: oklch(0.55 0.2 255); /* blue */
  --radius: 0.5rem;
  --ring: #3366ff;
}
.dark {
  --primary: hsl(220 80% 70%);
  --border: oklch(1 0 0 / 12%);
}
`);
    expect(r.problems).toEqual([]);
    expect(r.theme.light["--primary"]).toBe("oklch(0.55 0.2 255)");
    expect(r.theme.light["--ring"]).toBe("#3366ff");
    expect(r.theme.dark["--border"]).toBe("oklch(1 0 0 / 12%)");
  });

  it("accepts an empty file and empty blocks", () => {
    expect(check("").problems).toEqual([]);
    expect(check(":root {}\n.dark {}\n").problems).toEqual([]);
    expect(check("/* only a comment */").problems).toEqual([]);
  });

  it("reports another selector with its line", () => {
    const r = check(":root {\n}\n\n.card {\n  --primary: red;\n}\n");
    expect(r.problems).toEqual([
      {
        line: 4,
        message: 'selector ".card" is not allowed. Use only :root and .dark',
      },
    ]);
    expect(r.theme.light).toEqual({});
    expect(
      check(":root, .dark { --primary: red; }").problems[0].message,
    ).toContain("not allowed");
    expect(check("html:root { --primary: red; }").problems).toHaveLength(1);
  });

  it("reports @import and other at-rules", () => {
    const r = check(
      '@import "x.css";\n:root { --primary: red; }\n@media (min-width: 1px) {\n  :root { --ring: red; }\n}\n',
    );
    expect(r.problems).toEqual([
      { line: 1, message: "@import is not allowed" },
      { line: 3, message: "at-rule @media is not allowed" },
    ]);
    expect(r.theme.light).toEqual({ "--primary": "red" });
    expect(check("@import url(x.css);").problems[0].message).toBe(
      "@import is not allowed",
    );
  });

  it("reports url()", () => {
    const r = check(":root {\n  --ring: url(data:image/png;base64,AAA);\n}\n");
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].line).toBe(2);
    expect(r.problems[0].message).toContain("url()");
    expect(r.theme.light).toEqual({});
    expect(check(":root { --ring: URL( x ); }").problems).toHaveLength(1);
  });

  it("reports unknown variables", () => {
    const r = check(
      ":root {\n  --primary: red;\n  --brand: red;\n  --font-sans: x;\n}\n",
    );
    expect(r.problems.map((p) => [p.line, p.message.split(".")[0]])).toEqual([
      [3, "unknown token --brand"],
      [4, "unknown token --font-sans"],
    ]);
    expect(r.theme.light).toEqual({ "--primary": "red" });
  });

  it("reports non-custom properties", () => {
    const r = check(":root {\n  color: red;\n  --primary: red;\n}\n");
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].line).toBe(2);
    expect(r.problems[0].message).toContain("not a custom property");
  });

  it("reports !important, quotes, empty values and broken syntax", () => {
    const msgs = (css: string) => check(css).problems.map((p) => p.message);
    expect(msgs(":root { --ring: red !important; }")[0]).toContain(
      "!important",
    );
    expect(msgs(':root { --ring: "x"; }')[0]).toContain("quotes");
    expect(msgs(":root { --ring: ; }")[0]).toContain("no value");
    expect(msgs(":root { --ring red; }")[0]).toContain("not a declaration");
    expect(msgs(":root { --ring: red;")[0]).toContain("never closed");
    expect(msgs(":root { --ring: red; } }")[0]).toContain("stray");
    expect(msgs("/* open")[0]).toContain("comment is never closed");
    expect(msgs(":root { .a { --ring: red; } }")[0]).toContain("nested");
  });

  it("rejects unbalanced delimiters, never emits them and keeps neighbors", () => {
    const bad = [
      ":root { --primary: oklch(0.5 0.2 255; --ring: red; }\n.dark { --input: blue; }",
      ":root { --primary: oklch(0.5 0.2 255)); --ring: red; }\n.dark { --input: blue; }",
      ":root { --primary: oklch[0.5); --ring: red; }\n.dark { --input: blue; }",
      ':root { --primary: "red; --ring: red;\n}\n.dark { --input: blue; }',
      ":root { --primary: calc(1px;2px); --ring: red; }\n.dark { --input: blue; }",
      ":root { --primary: oklch(0.5 }0.2); --ring: red; }\n.dark { --input: blue; }",
    ];
    for (const css of bad) {
      const r = check(css);
      expect(r.problems.length, css).toBeGreaterThan(0);
      expect(r.problems.every((p) => p.line >= 1)).toBe(true);
      expect(r.theme.light["--primary"], css).toBeUndefined();
      expect(r.theme.dark["--input"], css).toBe("blue");
      const out = themeToCss(stock, r.theme);
      expect(out).not.toContain("0.2");
      expect(out).not.toContain("px");
      expect(out.split("(").length).toBe(out.split(")").length);
    }
    const one = check(":root { --primary: oklch(0.5 0.2 255; --ring: red; }");
    expect(one.problems).toHaveLength(1);
    expect(one.problems[0].line).toBe(1);
    expect(one.problems[0].message).toContain('")" is missing');
    expect(one.theme.light).toEqual({ "--ring": "red" });
  });

  it("keeps the last declaration and merges repeated blocks", () => {
    const r = check(
      ":root { --ring: red; --ring: blue; }\n:root { --input: green; }",
    );
    expect(r.problems).toEqual([]);
    expect(r.theme.light).toEqual({ "--ring": "blue", "--input": "green" });
  });

  it("keeps a semicolon inside parentheses and numbers lines past comments", () => {
    const r = check(
      ":root {\n  /* a\n  b */\n  --ring: calc(1px + 2px);\n  color: red;\n}\n",
    );
    expect(r.theme.light["--ring"]).toBe("calc(1px + 2px)");
    expect(r.problems[0].line).toBe(5);
  });
});

describe("loader order", () => {
  const theme = parseTheme(
    ":root { --primary: oklch(0.5 0.2 255); --radius: 0.25rem; }\n.dark { --ring: oklch(0.8 0.1 255); }",
    allowed,
  ).theme;

  it("resolves theme over stock, per mode", () => {
    const row = (n: string) =>
      resolveTokens(stock, theme).find((r) => r.name === n);
    expect(row("--primary")?.light).toEqual({
      value: "oklch(0.5 0.2 255)",
      source: "theme",
    });
    // The theme :root value does not leak into dark: stock .dark still applies.
    expect(row("--primary")?.dark).toEqual({
      value: "oklch(0.922 0 0)",
      source: "stock",
    });
    expect(row("--ring")?.light.source).toBe("stock");
    expect(row("--ring")?.dark).toEqual({
      value: "oklch(0.8 0.1 255)",
      source: "theme",
    });
    // --radius exists only in stock :root, so dark shares the theme value.
    expect(row("--radius")?.dark).toEqual({
      value: "0.25rem",
      source: "theme",
    });
    expect(row("--background")?.light.source).toBe("stock");
  });

  it("emits css that keeps stock .dark values after a theme :root value", () => {
    const css = themeToCss(stock, theme);
    expect(css).toContain(":root {\n  --primary: oklch(0.5 0.2 255);");
    // the repeated stock dark value, else :root (later in the file) would win
    expect(css).toMatch(/\.dark \{[^}]*--primary: oklch\(0\.922 0 0\);/);
    expect(css).toMatch(/\.dark \{[^}]*--ring: oklch\(0\.8 0\.1 255\);/);
    expect(css).not.toMatch(/\.dark \{[^}]*--radius/);
    expect(themeToCss(stock, { light: {}, dark: {} })).toBe("");
  });

  // The plugin hooks, as Vite calls them.
  const hooks = (dir: string) => {
    const plugin = tasteLab({ dataDir: dir, css: join(repo, "src/index.css") });
    const call = (h: unknown, ...args: unknown[]) =>
      (h as (...a: unknown[]) => string | undefined)(...args);
    return {
      themeCss: () => {
        const id = call(plugin.resolveId, "virtual:taste-lab/theme.css");
        return call(plugin.load, id);
      },
      themeData: () => {
        const id = call(plugin.resolveId, "virtual:taste-lab/theme");
        return call(plugin.load, id);
      },
    };
  };

  it("serves theme.css as its own stylesheet, imported after index.css", () => {
    const main = readFileSync(join(repo, "src/main.tsx"), "utf8");
    const imports = [...main.matchAll(/^import "([^"]+\.css)";/gm)].map(
      (m) => m[1],
    );
    expect(imports).toEqual(["./index.css", "virtual:taste-lab/theme.css"]);

    const dir = join(tmp, ".taste-lab");
    mkdirSync(dir);
    writeFileSync(join(dir, "theme.css"), ":root { --primary: hotpink; }\n");
    const h = hooks(dir);
    expect(h.themeCss()).toContain("--primary: hotpink;");
    // edited and deleted files are picked up on the next load
    writeFileSync(join(dir, "theme.css"), ":root { --primary: teal; }\n");
    expect(h.themeCss()).toContain("--primary: teal;");
    expect(h.themeData()).toContain('"--primary":"teal"');
    rmSync(join(dir, "theme.css"));
    expect(h.themeCss()).toBe("");
  });

  it("drops rejected parts so a broken file cannot break the stylesheet", () => {
    const dir = join(tmp, ".taste-lab");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "theme.css"),
      "@import url(x);\n.a { color: red }\n:root { --primary: teal; background: url(y); }\n",
    );
    const h = hooks(dir);
    const out = h.themeCss() as string;
    expect(out).toContain("--primary: teal");
    expect(out).not.toContain("url(");
    expect(out).not.toContain(".a {");
    expect(h.themeData()).toContain("@import is not allowed");
  });

  it("applies round tokens as inline styles, below no stylesheet rule", () => {
    const html = renderToStaticMarkup(
      <VariantFrame
        spec={{
          id: "a",
          file: "a.tsx",
          label: "A",
          changes: "c",
          tokens: { "--primary": "oklch(0.6 0.2 30)" },
        }}
        load={async () => ({ default: () => null })}
        theme="light"
      />,
    );
    // An inline custom property on the frame beats :root, .dark and theme.css.
    expect(html).toMatch(/style="[^"]*--primary:oklch\(0\.6 0\.2 30\)/);
  });
});

describe("Theme page", () => {
  const render = (themeCss: string) => {
    const { theme, problems } = parseTheme(themeCss, allowed);
    return renderToStaticMarkup(
      <ThemeView stock={stock} theme={theme} problems={problems} />,
    );
  };

  it("marks nothing when theme.css is empty", () => {
    const html = render("");
    expect(html).toContain("Every token is stock");
    expect(html).not.toContain('data-source="theme"');
    for (const n of [
      "--background",
      "--chart-5",
      "--sidebar-ring",
      "--radius",
    ]) {
      expect(html).toContain(n);
    }
  });

  it("marks overridden tokens and lists problems", () => {
    const html = render(
      ":root { --primary: hotpink; }\n.dark { --ring: teal; }\n.x {}",
    );
    expect(html).toContain("2 of ");
    expect(html.match(/data-source="theme"/g)).toHaveLength(2);
    expect(html).toContain("theme.css (light)");
    expect(html).toContain("theme.css (dark)");
    expect(html).toContain("theme.css:3:");
    expect(html).toContain("hotpink");
  });

  it("shows --radius as a sample box with that radius", () => {
    const html = render(":root { --radius: 1rem; }");
    expect(html).toContain("border-radius:1rem");
  });

  it("resolves each swatch column in its own mode", () => {
    const html = render(
      ":root { --primary: var(--destructive); }\n.dark { --primary: var(--destructive); }",
    );
    const row = /data-source="theme"[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
    const swatches = [...row.matchAll(/<span role="img"[^>]*style="([^"]*)"/g)];
    expect(swatches).toHaveLength(2);
    const [light, dark] = swatches.map((m) => m[1]);
    const val = (style: string, name: string) =>
      new RegExp(`${name}:([^;]+)`).exec(style)?.[1];
    expect(light).toContain("background-color:var(--destructive)");
    expect(val(light, "--destructive")).toBe(stock.light["--destructive"]);
    expect(val(dark, "--destructive")).toBe(stock.dark["--destructive"]);
    expect(val(light, "--destructive")).not.toBe(val(dark, "--destructive"));
  });

  it("has a route", () => {
    expect(parseHash("#/theme")).toEqual({ page: "theme" });
    expect(hrefFor({ page: "theme" })).toBe("#/theme");
  });
});

describe("init and check", () => {
  it("init writes a theme.css with a header and empty blocks that check accepts", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    expect(initDataDir(dir)).toContain("theme.css");
    const text = readFileSync(join(dir, "theme.css"), "utf8");
    expect(text.startsWith("/*")).toBe(true);
    expect(text).toMatch(/:root \{/);
    expect(text).toMatch(/\.dark \{/);
    const r = parseTheme(text, allowed);
    expect(r.problems).toEqual([]);
    expect(r.theme).toEqual({ light: {}, dark: {} });
    expect(await checkDataDir(dir)).toEqual([]);
  });

  it("check treats a missing theme.css as fine", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    initDataDir(dir);
    rmSync(join(dir, "theme.css"));
    expect(await checkDataDir(dir)).toEqual([]);
  });

  it("check reports each problem with a line number and exits 1", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    initDataDir(dir);
    writeFileSync(
      join(dir, "theme.css"),
      "@import 'x.css';\n:root {\n  --nope: red;\n  color: red;\n  --ring: url(a);\n}\n.a {}\n",
    );
    const problems = await checkDataDir(dir);
    expect(problems.map((p) => p.split(": ")[0])).toEqual([
      "theme.css:1",
      "theme.css:3",
      "theme.css:4",
      "theme.css:5",
      "theme.css:7",
    ]);
    const out: string[] = [];
    const err: string[] = [];
    const code = await run(["check", "--dir", dir], {
      out: (s) => out.push(s),
      err: (s) => err.push(s),
    });
    expect(code).toBe(1);
    expect(err.join("\n")).toContain("theme.css:3:");
  });

  it("check reports a theme.css that is a directory", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    initDataDir(dir);
    rmSync(join(dir, "theme.css"));
    mkdirSync(join(dir, "theme.css"));
    expect(await checkDataDir(dir)).toEqual([
      "theme.css is a directory, not a file",
    ]);
  });

  it("the demo theme.css is empty and clean", async () => {
    const demo = join(repo, "examples/demo/.taste-lab");
    const r = parseTheme(
      readFileSync(join(demo, "theme.css"), "utf8"),
      allowed,
    );
    expect(r.theme).toEqual({ light: {}, dark: {} });
    expect(await checkDataDir(demo)).toEqual([]);
  });
});
