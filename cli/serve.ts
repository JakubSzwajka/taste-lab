import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ViteDevServer } from "vite";
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
import { lanGate } from "../server/lan-gate.ts";
import { isPortFree, pickPort } from "./port.ts";

export const LAB_ROOT = resolve(import.meta.dirname, "..");

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

/**
 * Starts the lab dev server for `dir`. Loopback only on 127.0.0.1 by default.
 * With `lan`, binds one private address and gates every request with a per-run
 * token: the returned `url` carries it as `?k=`, the gate swaps it for a cookie.
 * The settings live in this server's own plugin. Resolves once it listens.
 */
export async function serve(
  dir: string,
  port?: number,
  lan?: LanOptions,
): Promise<{ server: ViteDevServer; url: string; lan?: LanInfo }> {
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
  const host = info?.address ?? "127.0.0.1";
  const chosen =
    port ?? (await pickPort({ isFree: (p) => isPortFree(p, host) }));
  // vite.config.ts reads this to point aliases, globs, Tailwind and the log at `dir`.
  process.env.TASTE_LAB_DIR = dir;
  // Memory only: in this server's plugin and the returned URL, nowhere else.
  const token = info ? newToken() : undefined;
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: join(LAB_ROOT, "vite.config.ts"),
    root: LAB_ROOT,
    server: { host, port: chosen, strictPort: true },
    plugins:
      info && token
        ? [lanGate({ address: info.address, port: chosen, token })]
        : [],
  });
  await server.listen();
  const url = token
    ? `http://${host}:${chosen}/?k=${token}`
    : `http://${host}:${chosen}/`;
  return info ? { server, url, lan: info } : { server, url };
}
