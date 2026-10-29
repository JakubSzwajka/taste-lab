import { parseCli, USAGE, UsageError } from "./args.ts";
import { checkDataDir } from "./check.ts";
import { InitError, initDataDir } from "./init.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };
const consoleIo: Io = {
  out: (s) => console.log(s),
  err: (s) => console.error(s),
};

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
    case "serve": {
      const { serve } = await import("./serve.ts");
      try {
        const { server, url } = await serve(cli.dir, cli.port);
        io.out(`taste-lab: serving ${cli.dir}\n  ${url}`);
        const stop = () => void server.close().then(() => process.exit(0));
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
        return 0;
      } catch (e) {
        io.err(`taste-lab serve: ${e instanceof Error ? e.message : e}`);
        return 1;
      }
    }
  }
}
