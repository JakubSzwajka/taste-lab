// Terminal presentation only. Never use these strings as model messages.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseLog } from "../../src/lib/taste.ts";
import type { ReadyEvent } from "./events.ts";
import { scrubSecrets } from "./messages.ts";
import type {
  CustomMessageIn,
  TasteComponent,
  TasteTheme,
  Truncate,
} from "./pi-api.ts";

/** Keep data-dir text from injecting terminal controls or extra widget lines. */
export const plain = (s: string) =>
  s
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function jsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

export function labName(dataDir: string): string {
  const config = jsonFile(join(dataDir, "config.json")) as
    | { name?: unknown }
    | undefined;
  return typeof config?.name === "string" && plain(config.name)
    ? plain(config.name)
    : plain(basename(dirname(dataDir)));
}

/** Answers are unique per existing round, including None and Mix. */
export function progressText(
  dataDir: string,
  live: ReadonlySet<string>,
): string {
  let rounds: string[];
  try {
    rounds = readdirSync(join(dataDir, "rounds"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^round-\d{3}$/.test(d.name))
      .filter((d) => {
        try {
          return statSync(
            join(dataDir, "rounds", d.name, "round.json"),
          ).isFile();
        } catch {
          return false;
        }
      })
      .map((d) => d.name)
      .sort();
  } catch {
    return "rounds unavailable";
  }
  if (!rounds.length) return "no rounds yet";
  let entries: ReturnType<typeof parseLog>["entries"] = [];
  try {
    entries = parseLog(
      readFileSync(join(dataDir, "taste.jsonl"), "utf8"),
    ).entries;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT")
      return "answers unavailable";
  }
  const answered = new Set([...entries.map((e) => e.round), ...live]);
  const open = rounds.find((r) => !answered.has(r));
  const count = rounds.filter((r) => answered.has(r)).length;
  return open
    ? `${open} open · ${count} of ${rounds.length} answered`
    : "all answered";
}

export function widgetLines(
  ready: ReadyEvent,
  name: string,
  progress: string,
  theme: TasteTheme,
): string[] {
  return [
    `${theme.fg("accent", "taste.lab")} · ${plain(name)}`,
    `${theme.fg("dim", "local")} ${theme.fg("mdLink", ready.local)}`,
    ...(ready.lan
      ? [`${theme.fg("dim", "LAN  ")} ${theme.fg("mdLink", ready.lan)}`]
      : []),
    theme.fg("dim", progress),
  ];
}

export function themedStatus(ready: ReadyEvent, theme: TasteTheme): string {
  return `${theme.fg("accent", "taste.lab")} ${theme.fg("dim", `:${ready.port}${ready.lan ? " LAN" : ""}`)}`;
}

/** Stateless themed lines, clipped with Pi's ANSI-aware width helper. */
export function lineComponent(
  lines: () => string[],
  truncate: Truncate,
  invalidate = () => {},
): TasteComponent {
  return {
    render: (width) => lines().map((line) => truncate(line, width)),
    invalidate,
  };
}

function variantLabel(message: CustomMessageIn): string {
  const d = message.details as
    | { dataDir?: unknown; round?: unknown; pick?: unknown }
    | undefined;
  if (
    typeof d?.dataDir !== "string" ||
    typeof d.round !== "string" ||
    !/^round-\d{3}$/.test(d.round) ||
    typeof d.pick !== "string" ||
    !/^[a-z]{1,12}$/.test(d.pick)
  )
    return "";
  const round = jsonFile(join(d.dataDir, "rounds", d.round, "round.json")) as
    | { variants?: unknown }
    | undefined;
  if (!Array.isArray(round?.variants)) return "";
  const variant = round.variants.find((v) => v?.id === d.pick);
  return typeof variant?.label === "string"
    ? plain(scrubSecrets(variant.label))
    : "";
}

/** Parse the existing safe content. No extra fields enter persisted messages. */
export function transcriptComponent(
  message: CustomMessageIn,
  theme: TasteTheme,
  truncate: Truncate,
): TasteComponent {
  const text = plain(scrubSecrets(message.content));
  const answer =
    /^answered (\S+) \((.*), (?:token|component|layout)\): pick ([^;]+); tags [^;]+; reason ("(?:[^"\\]|\\.)*"|none); theme /.exec(
      text,
    );
  const label = answer ? variantLabel(message) : "";
  return lineComponent(() => {
    const marker = theme.fg("accent", "· taste.lab");
    if (answer) {
      const [, round, component, pick, reason] = answer;
      return [
        `${marker} ${theme.fg("accent", round)} ${theme.fg("dim", component)} · ${theme.fg("success", pick)}${label ? ` · ${label}` : ""}${reason !== "none" ? ` ${theme.fg("dim", reason)}` : ""}`,
      ];
    }
    const d = message.details as
      | { dataDir?: unknown; port?: unknown }
      | undefined;
    if (
      message.customType === "taste-lab" &&
      typeof d?.dataDir === "string" &&
      typeof d.port === "number"
    ) {
      return [
        `${marker} ${theme.fg("dim", "started")} ${plain(scrubSecrets(d.dataDir))} ${theme.fg("dim", `:${d.port}`)}`,
      ];
    }
    return [`${marker} ${text}`];
  }, truncate);
}
