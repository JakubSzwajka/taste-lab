// Parses the argument string of the `/taste` command.
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type TasteCommand =
  | { action: "start"; lan: boolean; dir: string }
  | { action: "status" }
  | { action: "stop" }
  | { action: "qr" }
  | { action: "error"; message: string };

export const TASTE_USAGE =
  "Usage: /taste [local] [--dir <path>] | /taste status | /taste qr | /taste stop";

/** Splits on whitespace. Single or double quotes keep spaces in one word. */
export function splitWords(input: string): string[] | null {
  const words: string[] = [];
  let word = "";
  let inWord = false;
  let quote: '"' | "'" | null = null;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
    } else {
      word += ch;
      inWord = true;
    }
  }
  if (quote) return null;
  if (inWord) words.push(word);
  return words;
}

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/** The data dir defaults to `<cwd>/.taste-lab`. A relative dir resolves against cwd, `~` against home. */
export function resolveDataDir(dir: string | undefined, cwd: string): string {
  return resolve(cwd, dir === undefined ? ".taste-lab" : expandHome(dir));
}

/** The data dir defaults to `<cwd>/.taste-lab`. Relative `--dir` resolves against cwd. */
export function parseTasteArgs(input: string, cwd: string): TasteCommand {
  const words = splitWords(input);
  if (words === null) return { action: "error", message: "unclosed quote" };
  if (
    words.length === 1 &&
    (words[0] === "status" || words[0] === "stop" || words[0] === "qr")
  ) {
    return { action: words[0] };
  }
  let lan = true;
  let dir: string | undefined;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "local" && lan) {
      lan = false;
    } else if (w === "--dir" || w.startsWith("--dir=")) {
      if (dir !== undefined)
        return { action: "error", message: "--dir given twice" };
      const value = w === "--dir" ? words[++i] : w.slice("--dir=".length);
      if (value === undefined || value === "") {
        return { action: "error", message: "--dir needs a path" };
      }
      dir = value;
    } else {
      return { action: "error", message: `unknown argument "${w}"` };
    }
  }
  return { action: "start", lan, dir: resolveDataDir(dir, cwd) };
}

/** Completions for the first word of `/taste`. */
export function completeTasteArgs(prefix: string) {
  const items = [
    {
      value: "local",
      label: "local",
      description: "Serve on 127.0.0.1 only, no LAN link",
    },
    { value: "status", label: "status", description: "Show the links again" },
    { value: "stop", label: "stop", description: "Stop the lab server" },
    { value: "qr", label: "qr", description: "Scan the LAN link with a phone" },
    {
      value: "--dir ",
      label: "--dir",
      description: "Serve another .taste-lab dir",
    },
  ];
  const match = items.filter((i) => i.value.startsWith(prefix.trimStart()));
  return match.length > 0 ? match : null;
}
