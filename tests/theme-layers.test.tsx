// @vitest-environment happy-dom
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadTheme } from "../server/theme-file";
import { VariantFrame } from "../src/components/VariantFrame";
import { parseStock, themeToCss } from "../src/lib/taste-theme";
import { mount, one, unmountAll } from "./dom";

const repo = resolve(import.meta.dirname, "..");
const stockFile = join(repo, "src/index.css");
const stockCss = readFileSync(stockFile, "utf8");
const labCss = readFileSync(join(repo, "src/lab-theme.css"), "utf8");
const stock = parseStock(stockCss);
const lab = parseStock(labCss);
let tmp: string;
let dir: string;
let sheet: HTMLStyleElement;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-layers-"));
  dir = join(tmp, ".taste-lab");
  mkdirSync(dir);
  sheet = document.createElement("style");
  document.head.append(sheet);
});
afterEach(async () => {
  await unmountAll();
  sheet.remove();
  document.documentElement.classList.remove("dark");
  rmSync(tmp, { recursive: true, force: true });
});

function reloadTheme() {
  const data = loadTheme(dir, stockFile);
  // The plain token blocks of index.css, then the two sheets main.tsx imports.
  sheet.textContent = `${stockCss.slice(stockCss.indexOf(":root {"), stockCss.indexOf("@layer base"))}\n${labCss}\n${themeToCss(data.stock, data.theme)}`;
}

async function frame(mode: "light" | "dark", tokens?: Record<string, string>) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  const root = await mount(
    <VariantFrame
      spec={{ id: "a", file: "a.tsx", label: "A", changes: "Test", tokens }}
      load={async () => ({
        default: () => <button type="button">Prototype</button>,
      })}
      theme={mode}
    />,
  );
  return {
    chrome: one(root, "header"),
    content: one(root, "[data-taste-scope]"),
    button: one(root, "[data-taste-scope] button"),
  };
}
// Happy DOM exposes custom properties only on the declaring element. Walk the
// ancestors for inheritance. Real-browser proof also checks computed values.
function value(el: Element, name = "--primary"): string {
  const own = getComputedStyle(el).getPropertyValue(name).trim();
  return own || (el.parentElement ? value(el.parentElement, name) : "");
}

describe("theme layers", () => {
  // The meta lab is local and gitignored: a fresh clone has none.
  it.skipIf(!existsSync(join(repo, ".taste-lab/theme.css")))(
    "keeps the chrome stylesheet equal to the meta lab token picks",
    () => {
      expect(lab).toEqual(
        parseStock(readFileSync(join(repo, ".taste-lab/theme.css"), "utf8")),
      );
    },
  );

  for (const mode of ["light", "dark"] as const) {
    it(`computes lab chrome and data dir frame tokens in ${mode} mode`, async () => {
      writeFileSync(
        join(dir, "theme.css"),
        ":root { --primary: blue; } .dark { --primary: skyblue; }",
      );
      reloadTheme();
      const { chrome, content, button } = await frame(mode);
      expect(value(chrome)).toBe(lab[mode]["--primary"]);
      expect(value(content)).toBe(mode === "light" ? "blue" : "skyblue");
      expect(value(button)).toBe(value(content));
      expect(value(content, "--background")).toBe(stock[mode]["--background"]);
    });

    it(`resets a frame to pure stock without theme.css in ${mode} mode`, async () => {
      reloadTheme();
      const { chrome, content } = await frame(mode);
      expect(value(chrome)).toBe(lab[mode]["--primary"]);
      for (const [name, cell] of Object.entries({
        ...stock.light,
        ...stock[mode],
      })) {
        expect(value(content, name), name).toBe(cell);
      }
    });

    it(`cannot change chrome through theme.css edits or deletion in ${mode} mode`, async () => {
      reloadTheme();
      const { chrome, content } = await frame(mode);
      const names = Object.keys(stock.light);
      const before = names.map((name) => value(chrome, name));
      writeFileSync(
        join(dir, "theme.css"),
        ":root { --primary: red; --radius: 9rem; } .dark { --primary: lime; }",
      );
      reloadTheme();
      expect(value(content)).toBe(mode === "light" ? "red" : "lime");
      expect(names.map((name) => value(chrome, name))).toEqual(before);
      rmSync(join(dir, "theme.css"));
      reloadTheme();
      expect(value(content)).toBe(stock[mode]["--primary"]);
      expect(names.map((name) => value(chrome, name))).toEqual(before);
    });

    it(`keeps round overrides above scoped theme tokens in ${mode} mode`, async () => {
      writeFileSync(
        join(dir, "theme.css"),
        ":root { --primary: blue; } .dark { --primary: skyblue; }",
      );
      reloadTheme();
      const { chrome, content } = await frame(mode, { "--primary": "coral" });
      expect(value(chrome)).toBe(lab[mode]["--primary"]);
      expect(value(content)).toBe("coral");
    });
  }
});
