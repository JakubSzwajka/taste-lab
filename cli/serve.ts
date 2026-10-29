import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ViteDevServer } from "vite";
import { dirProblem, labPaths } from "../server/lab-dir.ts";
import { pickPort } from "./port.ts";

export const LAB_ROOT = resolve(import.meta.dirname, "..");

/** Starts the lab dev server for `dir` on 127.0.0.1. Resolves once it listens. */
export async function serve(
  dir: string,
  port?: number,
): Promise<{ server: ViteDevServer; url: string }> {
  const bad = dirProblem(dir);
  if (bad) throw new Error(bad);
  if (!existsSync(labPaths(dir).fixtures)) {
    throw new Error(
      `${dir} has no fixtures/index.ts. Create it with: taste-lab init --dir ${dir}`,
    );
  }
  const chosen = port ?? (await pickPort());
  // vite.config.ts reads this to point aliases, globs, Tailwind and the log at `dir`.
  process.env.TASTE_LAB_DIR = dir;
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: join(LAB_ROOT, "vite.config.ts"),
    root: LAB_ROOT,
    server: { host: "127.0.0.1", port: chosen, strictPort: true },
  });
  await server.listen();
  return { server, url: `http://127.0.0.1:${chosen}/` };
}
