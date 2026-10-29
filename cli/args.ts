import { resolve } from "node:path";
import { parseArgs } from "node:util";

export type Cli =
  | { command: "help" }
  | { command: "serve"; dir: string; port?: number }
  | { command: "init"; dir: string; name?: string }
  | { command: "check"; dir: string };

export class UsageError extends Error {}

export const USAGE = `Usage: taste-lab <command> --dir <path> [options]

Commands:
  serve --dir <path> [--port N]   Start the lab for a .taste-lab dir on 127.0.0.1.
                                  Without --port, the first free port from 5300.
  init  --dir <path> [--name X]   Create a new .taste-lab dir. Refuses to overwrite.
  check --dir <path>              Validate rounds and scan variant files.
                                  Exit 0 when clean, 1 with violations.

Options:
  -h, --help                      Show this help.`;

const OPTIONS = {
  serve: ["dir", "port"],
  init: ["dir", "name"],
  check: ["dir"],
} as const;

/** Parses argv (without node and the script). Paths resolve against `cwd`. */
export function parseCli(argv: string[], cwd = process.cwd()): Cli {
  const [command, ...rest] = argv;
  if (
    command === undefined ||
    command === "help" ||
    command === "-h" ||
    command === "--help"
  ) {
    return { command: "help" };
  }
  if (!(command in OPTIONS)) {
    throw new UsageError(`unknown command "${command}"`);
  }
  const cmd = command as keyof typeof OPTIONS;
  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseArgs({
      args: rest,
      strict: true,
      allowPositionals: false,
      options: {
        dir: { type: "string" },
        port: { type: "string" },
        name: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (e) {
    throw new UsageError(e instanceof Error ? e.message : String(e));
  }
  if (values.help) return { command: "help" };
  for (const key of ["port", "name"] as const) {
    if (
      values[key] !== undefined &&
      !(OPTIONS[cmd] as readonly string[]).includes(key)
    ) {
      throw new UsageError(`--${key} is not an option of "${cmd}"`);
    }
  }
  const rawDir = values.dir;
  if (typeof rawDir !== "string" || rawDir.trim() === "") {
    throw new UsageError(`"${cmd}" needs --dir <path>`);
  }
  const dir = resolve(cwd, rawDir);
  if (cmd === "check") return { command: "check", dir };
  if (cmd === "init") {
    const name = values.name;
    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
      throw new UsageError("--name must not be empty");
    }
    return name === undefined
      ? { command: "init", dir }
      : { command: "init", dir, name: String(name) };
  }
  if (values.port === undefined) return { command: "serve", dir };
  return { command: "serve", dir, port: parsePort(String(values.port)) };
}

export function parsePort(raw: string): number {
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > 65535) {
    throw new UsageError(`--port must be a whole number from 1 to 65535`);
  }
  return n;
}
