import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { isAllowedBindHost } from "../server/lan.ts";

export type Cli =
  | { command: "help" }
  | {
      command: "serve";
      dir: string;
      port?: number;
      lan?: boolean;
      host?: string;
      events?: boolean;
    }
  | { command: "init"; dir: string; name?: string }
  | { command: "check"; dir: string }
  | {
      command: "library";
      dir: string;
      status?: "draft" | "agreed";
      json?: boolean;
    };

export class UsageError extends Error {}

export const USAGE = `Usage: taste-lab <command> --dir <path> [options]

Commands:
  serve --dir <path> [--port N] [--lan [--host <ip>]] [--events]
                                  Start the lab for a .taste-lab dir on 127.0.0.1.
                                  Without --port, the first free port from 5300.
                                  --lan also binds one private LAN address on the
                                  same port and prints a link with a one-run token.
                                  --host picks the address (private or loopback
                                  IPv4 other than 127.0.0.1, needs --lan).
                                  --events writes JSON lines on stdout (ready,
                                  answer, error) and human text on stderr.
  init  --dir <path> [--name X]   Create a new .taste-lab dir. Refuses to overwrite.
  check --dir <path>              Validate rounds and scan variant files.
                                  Exit 0 when clean, 1 with violations.
  library --dir <path> [--status draft|agreed] [--json]
                                  List library entries. Exit 1 if any are invalid.

Options:
  -h, --help                      Show this help.`;

const OPTIONS = {
  serve: ["dir", "port", "lan", "host", "events"],
  init: ["dir", "name"],
  check: ["dir"],
  library: ["dir", "status", "json"],
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
        host: { type: "string" },
        lan: { type: "boolean" },
        events: { type: "boolean" },
        status: { type: "string" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (e) {
    throw new UsageError(e instanceof Error ? e.message : String(e));
  }
  if (values.help) return { command: "help" };
  for (const key of [
    "port",
    "name",
    "host",
    "lan",
    "events",
    "status",
    "json",
  ] as const) {
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
  if (cmd === "library") {
    const status = values.status;
    if (status !== undefined && status !== "draft" && status !== "agreed") {
      throw new UsageError('--status must be "draft" or "agreed"');
    }
    return {
      command: "library",
      dir,
      ...(status ? { status } : {}),
      ...(values.json ? { json: true } : {}),
    };
  }
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
  const host = values.host === undefined ? undefined : String(values.host);
  if (host !== undefined && !values.lan) {
    throw new UsageError("--host needs --lan");
  }
  if (host !== undefined && !isAllowedBindHost(host)) {
    throw new UsageError(
      "--host must be a private or loopback IPv4 address (10/8, 172.16/12, 192.168/16, 127/8)",
    );
  }
  if (host === "127.0.0.1") {
    throw new UsageError(
      "--host 127.0.0.1 is taken by the loopback listener. Use another address, e.g. 127.0.0.2",
    );
  }
  const serveCli: Cli = { command: "serve", dir };
  if (values.port !== undefined) serveCli.port = parsePort(String(values.port));
  if (values.lan) serveCli.lan = true;
  if (host !== undefined) serveCli.host = host;
  if (values.events) serveCli.events = true;
  return serveCli;
}

export function parsePort(raw: string): number {
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > 65535) {
    throw new UsageError(`--port must be a whole number from 1 to 65535`);
  }
  return n;
}
