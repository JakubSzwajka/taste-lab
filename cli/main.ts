import { eventLine, type ServeEvent } from "../server/events.ts";
import { parseCli, USAGE, UsageError } from "./args.ts";
import { checkDataDir } from "./check.ts";
import { InitError, initDataDir } from "./init.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };
// stdout by hand, not console.log: `--events` points console.log at stderr.
const consoleIo: Io = {
  out: (s) => void process.stdout.write(`${s}\n`),
  err: (s) => console.error(s),
};

/**
 * `--events`: stdout must hold only JSON lines. Anything in this process that
 * logs with console.log (a plugin, a dependency) goes to stderr instead.
 */
function keepStdoutForEvents() {
  const toErr = (...a: unknown[]) => console.error(...a);
  console.log = toErr;
  console.info = toErr;
  console.debug = toErr;
}

/** `serve --events` as typed, before parsing: a usage error is reported as an event too. */
const wantsEvents = (argv: string[]) =>
  argv[0] === "serve" && argv.includes("--events");

/**
 * Runs one command and returns the exit code. `serve` resolves once the server
 * listens and leaves it running; the open server keeps the process alive.
 */
export async function run(argv: string[], io: Io = consoleIo): Promise<number> {
  let cli: ReturnType<typeof parseCli>;
  try {
    cli = parseCli(argv);
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    if (wantsEvents(argv)) {
      io.out(eventLine({ event: "error", message: e.message }));
    }
    io.err(`taste-lab: ${e.message}\n\n${USAGE}`);
    return 2;
  }
  switch (cli.command) {
    case "help":
      io.out(USAGE);
      return 0;
    case "init":
      try {
        const files = initDataDir(cli.dir, { name: cli.name });
        io.out(`Created ${cli.dir}\n${files.map((f) => `  ${f}`).join("\n")}`);
        return 0;
      } catch (e) {
        if (!(e instanceof InitError)) throw e;
        io.err(`taste-lab init: ${e.message}`);
        return 1;
      }
    case "check": {
      let problems: string[];
      try {
        problems = await checkDataDir(cli.dir);
      } catch (e) {
        // Backstop: an unexpected failure is still a readable problem, not a stack trace.
        problems = [`unexpected error: ${e instanceof Error ? e.message : e}`];
      }
      if (problems.length === 0) {
        io.out(`taste-lab check: ${cli.dir} is clean`);
        return 0;
      }
      io.err(
        `taste-lab check: ${problems.length} problem(s) in ${cli.dir}\n${problems
          .map((p) => `  ${p}`)
          .join("\n")}`,
      );
      return 1;
    }
    case "serve":
      return runServe(cli, io);
  }
}

type ServeCli = Extract<ReturnType<typeof parseCli>, { command: "serve" }>;

/**
 * `serve`. Without `--events`: human text on stdout, ending with the link.
 * With it: one JSON event per line on stdout (ready, answer, error) and human
 * text on stderr. The LAN link with its token goes only into `ready.lan`.
 */
async function runServe(cli: ServeCli, io: Io): Promise<number> {
  const { PortBusyError, serve } = await import("./serve.ts");
  const events = cli.events === true;
  if (events && io === consoleIo) keepStdoutForEvents();
  const emit = (e: ServeEvent) => io.out(eventLine(e));
  const human = events ? io.err : io.out;
  try {
    const { server, url, local, lan } = await serve(
      cli.dir,
      cli.port,
      cli.lan ? { host: cli.host } : undefined,
      events
        ? {
            onAppend: (entry) => emit({ event: "answer", entry }),
            logToStderr: true,
          }
        : {},
    );
    const port = server.config.server.port as number;
    const notes: string[] = [];
    if (lan) {
      notes.push(
        `  LAN address ${lan.address}${lan.iface ? ` (${lan.iface})` : ""}. The link token changes on every run.`,
      );
      if (lan.others.length > 0) {
        notes.push(
          `  Other candidates: ${lan.others.map((c) => `${c.address} (${c.iface})`).join(", ")}. Choose one with --host <ip>.`,
        );
      }
      if (lan.skippedVirtual > 0) {
        notes.push(
          `  Skipped ${lan.skippedVirtual} virtual (docker, bridge, tunnel) address(es).`,
        );
      }
      notes.push(`  On this machine, no token: ${local}`);
    }
    // In events mode the token link is in the ready event only, never in stderr.
    const link = events
      ? lan
        ? "  LAN link: in the ready event"
        : `  ${local}`
      : `  ${url}`;
    human(
      `taste-lab: serving ${cli.dir}${notes.length > 0 ? `\n${notes.join("\n")}` : ""}\n${link}`,
    );
    if (events) {
      emit({
        event: "ready",
        port,
        dataDir: cli.dir,
        local,
        lan: lan ? url : null,
      });
    }
    const stop = () => void server.close().then(() => process.exit(0));
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return 0;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (events) emit({ event: "error", message });
    io.err(`taste-lab serve: ${message}`);
    return e instanceof PortBusyError ? 2 : 1;
  }
}
