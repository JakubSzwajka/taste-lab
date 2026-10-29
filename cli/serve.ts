import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Logger, ViteDevServer } from "vite";
import { tasteEvents } from "../server/events.ts";
import { dirProblem, labPaths } from "../server/lab-dir.ts";
import {
  type Candidate,
  defaultRouteInterface,
  type Ifaces,
  isAllowedBindHost,
  type LanPick,
  newToken,
  pickLanAddress,
} from "../server/lan.ts";
import { lanGate, loopbackReady } from "../server/lan-gate.ts";
import { LOOPBACK_ADDRESS } from "../server/lan-loopback.ts";
import type { TasteEntry } from "../server/taste-log.ts";
import { isPortFree, pickPort } from "./port.ts";

export const LAB_ROOT = resolve(import.meta.dirname, "..");

/** An explicit `--port` is taken on one of the addresses. The CLI exits 2. */
export class PortBusyError extends Error {}

export type ServeOptions = {
  /** Called once per appended taste entry, from either listener. */
  onAppend?: (entry: TasteEntry) => void;
  /** Send Vite's log to stderr, so stdout holds only what the caller writes. */
  logToStderr?: boolean;
};

export type LanOptions = {
  /** Bind this address instead of auto-picking. Must be private or loopback IPv4. */
  host?: string;
  /** Test hooks. Default to the real machine. */
  ifaces?: Ifaces;
  defaultIface?: string;
};

export type LanInfo = {
  address: string;
  /** Interface name, when the address was auto-picked or found. */
  iface?: string;
  others: Candidate[];
  skippedVirtual: number;
};

/** Resolves the LAN bind address. Throws a readable error when there is none. */
export function resolveLan(
  opts: LanOptions,
  ifaces: Ifaces,
  defaultIface: string | undefined,
): LanInfo {
  if (opts.host !== undefined) {
    if (!isAllowedBindHost(opts.host)) {
      throw new Error(
        `--host ${opts.host} is not a private or loopback IPv4 address`,
      );
    }
    if (opts.host === LOOPBACK_ADDRESS) {
      throw new Error(
        `--host ${LOOPBACK_ADDRESS} is taken by the loopback listener. Use another address, e.g. 127.0.0.2`,
      );
    }
    return { address: opts.host, others: [], skippedVirtual: 0 };
  }
  const picked: LanPick | undefined = pickLanAddress(ifaces, defaultIface);
  if (!picked) {
    throw new Error(
      "no private LAN IPv4 address found. Pass --host <ip> to choose one.",
    );
  }
  return {
    address: picked.chosen.address,
    iface: picked.chosen.iface,
    others: picked.others,
    skippedVirtual: picked.skippedVirtual,
  };
}

/** A Vite logger that writes everything to stderr. */
async function stderrLogger(): Promise<Logger> {
  const { createLogger } = await import("vite");
  const base = createLogger("info", { allowClearScreen: false });
  return {
    ...base,
    // Vite's own info goes to console.log, which is stdout.
    info: (msg) => void process.stderr.write(`${msg}\n`),
    clearScreen: () => {},
  };
}

/** Host addresses already taken on `port`, from `hosts`. */
async function busyOn(port: number, hosts: string[]): Promise<string[]> {
  const busy: string[] = [];
  for (const h of hosts) if (!(await isPortFree(port, h))) busy.push(h);
  return busy;
}

/**
 * Starts the lab dev server for `dir`. Loopback only on 127.0.0.1 by default.
 * With `lan`, Vite binds one private address and gates every request with a
 * per-run token: the returned `url` carries it as `?k=`, the gate swaps it for
 * a cookie. A second listener on 127.0.0.1, same port, serves the same app with
 * the loopback rules. The port must be free on both. The settings live in this
 * server's own plugins. Resolves once both listen.
 */
export async function serve(
  dir: string,
  port?: number,
  lan?: LanOptions,
  opts: ServeOptions = {},
): Promise<{
  server: ViteDevServer;
  url: string;
  /** The loopback link, no token. Same as `url` without `lan`. */
  local: string;
  lan?: LanInfo;
}> {
  const bad = dirProblem(dir);
  if (bad) throw new Error(bad);
  if (!existsSync(labPaths(dir).fixtures)) {
    throw new Error(
      `${dir} has no fixtures/index.ts. Create it with: taste-lab init --dir ${dir}`,
    );
  }
  const { networkInterfaces } = await import("node:os");
  const info = lan
    ? resolveLan(
        lan,
        lan.ifaces ?? networkInterfaces(),
        lan.ifaces ? lan.defaultIface : defaultRouteInterface(),
      )
    : undefined;
  const host = info?.address ?? LOOPBACK_ADDRESS;
  const hosts = info ? [host, LOOPBACK_ADDRESS] : [host];
  let chosen: number;
  if (port === undefined) {
    chosen = await pickPort({
      isFree: async (p) => (await busyOn(p, hosts)).length === 0,
    });
  } else {
    const busy = await busyOn(port, hosts);
    if (busy.length > 0) {
      throw new PortBusyError(
        `port ${port} is in use on ${busy.join(" and ")}. Pick another --port, or leave it out to take a free one.`,
      );
    }
    chosen = port;
  }
  // vite.config.ts reads this to point aliases, globs, Tailwind and the log at `dir`.
  process.env.TASTE_LAB_DIR = dir;
  // Memory only: in this server's plugin and the returned URL, nowhere else.
  const token = info ? newToken() : undefined;
  const { createServer } = await import("vite");
  const plugins = [];
  if (info && token) {
    plugins.push(lanGate({ address: info.address, port: chosen, token }));
  }
  if (opts.onAppend) plugins.push(tasteEvents(opts.onAppend));
  const server = await createServer({
    configFile: join(LAB_ROOT, "vite.config.ts"),
    root: LAB_ROOT,
    // Same as vite.config.ts, repeated so no config merge can turn public/ back on.
    publicDir: false,
    server: { host, port: chosen, strictPort: true },
    plugins,
    ...(opts.logToStderr ? { customLogger: await stderrLogger() } : {}),
  });
  try {
    await server.listen();
    await loopbackReady(server.config.plugins);
  } catch (e) {
    await server.close().catch(() => {});
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE" && port !== undefined) {
      throw new PortBusyError(
        `port ${port} is in use on ${LOOPBACK_ADDRESS}. Pick another --port, or leave it out to take a free one.`,
      );
    }
    throw e;
  }
  const local = `http://${LOOPBACK_ADDRESS}:${chosen}/`;
  const url = token ? `http://${host}:${chosen}/?k=${token}` : local;
  return info ? { server, url, local, lan: info } : { server, url, local };
}
