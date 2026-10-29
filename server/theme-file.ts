// Reads `<dataDir>/theme.css` against the lab's stock stylesheet. Node only.
import { readFileSync } from "node:fs";
import { kindOf, readText } from "../cli/fs-util.ts";
import {
  allowedTokens,
  parseStock,
  parseTheme,
  type ThemeProblem,
  type TokenBlocks,
} from "../src/lib/taste-theme.ts";
import { labPaths } from "./lab-dir.ts";

export type ThemeData = {
  stock: TokenBlocks;
  theme: TokenBlocks;
  problems: ThemeProblem[];
};

/**
 * Stock tokens from the lab stylesheet plus the accepted values of `theme.css`.
 * A missing file is fine. Trouble reading it becomes a problem (line 0), never a throw.
 */
export function loadTheme(dataDir: string, stockCssFile: string): ThemeData {
  const stock = parseStock(readFileSync(stockCssFile, "utf8"));
  const file = labPaths(dataDir).theme;
  if (kindOf(file) === "missing") {
    return { stock, theme: { light: {}, dark: {} }, problems: [] };
  }
  const r = readText(file, "theme.css");
  if ("error" in r) {
    return {
      stock,
      theme: { light: {}, dark: {} },
      problems: [{ line: 0, message: r.error }],
    };
  }
  const { theme, problems } = parseTheme(r.text, allowedTokens(stock));
  return { stock, theme, problems };
}
