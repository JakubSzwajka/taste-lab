import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { isIPv4, isIPv6 } from "node:net";
import type { NetworkInterfaceInfo } from "node:os";

/** The header the app sends in LAN mode. */
export const TOKEN_HEADER = "x-taste-token";

export type LanConfig = {
  /** The one address the server binds and the only Host name it accepts. */
  address: string;
  port: number;
  token: string;
};

/** 128 random bits, base64url. New for every run, never written anywhere. */
export function newToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Constant-time compare. Hashing first gives both sides one length. */
export function tokenMatches(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || given === "") return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function ipv4Octets(addr: string): number[] | undefined {
  if (!isIPv4(addr)) return undefined;
  return addr.split(".").map(Number);
}

function isPrivateV4(o: number[]): boolean {
  const [a = 0, b = 0] = o;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Expands an IPv6 text address to 8 hextets. Undefined when it is not IPv6. */
function ipv6Groups(addr: string): number[] | undefined {
  if (!isIPv6(addr)) return undefined;
  let text = addr.split("%")[0] ?? addr;
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (dotted?.[1]) {
    const o = dotted[1].split(".").map(Number);
    const hi = ((o[0] ?? 0) << 8) | (o[1] ?? 0);
    const lo = ((o[2] ?? 0) << 8) | (o[3] ?? 0);
    text = `${text.slice(0, -dotted[1].length)}${hi.toString(16)}:${lo.toString(16)}`;
  }
  const [head = "", tail] = text.split("::");
  const h = head === "" ? [] : head.split(":");
  const t = tail === undefined || tail === "" ? [] : tail.split(":");
  const fill = tail === undefined ? 0 : 8 - h.length - t.length;
  return [...h, ...Array(fill).fill("0"), ...t].map((g) =>
    Number.parseInt(g, 16),
  );
}

/**
 * Private or loopback: 10/8, 172.16/12, 192.168/16, 127/8, ::1, fc00::/7, and
 * IPv4-mapped IPv6 (::ffff:a.b.c.d, in dotted or hex form) of those.
 */
export function isPrivateAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  const v4 = ipv4Octets(addr);
  if (v4) return isPrivateV4(v4);
  const g = ipv6Groups(addr);
  if (g?.length !== 8) return false;
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (((g[0] ?? 0) & 0xfe00) === 0xfc00) return true; // fc00::/7
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    const hi = g[6] ?? 0;
    const lo = g[7] ?? 0;
    return isPrivateV4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  }
  return false;
}

/** `--host` must be a literal IPv4 address that is private or loopback. */
export function isAllowedBindHost(host: string): boolean {
  return isIPv4(host) && isPrivateAddress(host);
}

/** The origin the app is served from in LAN mode. */
export const lanOrigin = (lan: Pick<LanConfig, "address" | "port">) =>
  `http://${lan.address}:${lan.port}`;

export type LanDecision = { status: 401 | 403; error: string } | null;

/**
 * The LAN guard for /api/taste. Null means allowed. Address, Host and Origin
 * failures are 403. A missing or wrong token is 401.
 */
export function checkLanRequest(
  req: {
    remoteAddress: string | undefined;
    host: string | undefined;
    origin: string | undefined;
    token: string | string[] | undefined;
  },
  lan: LanConfig,
): LanDecision {
  if (!isPrivateAddress(req.remoteAddress)) {
    return { status: 403, error: "private network only" };
  }
  if (req.host !== `${lan.address}:${lan.port}`) {
    return { status: 403, error: "wrong Host header" };
  }
  if (req.origin !== undefined && req.origin !== lanOrigin(lan)) {
    return { status: 403, error: "cross-origin request refused" };
  }
  if (!tokenMatches(req.token, lan.token)) {
    return {
      status: 401,
      error:
        "missing or wrong token. Open the link printed by taste-lab serve --lan",
    };
  }
  return null;
}

// Vite loads vite.config.ts as its own bundle, so a module variable here would not
// be shared with cli/serve.ts. A well-known global symbol is shared. Memory only.
const SLOT = Symbol.for("taste-lab.lan");
type Slot = { [SLOT]?: LanConfig };
export const getLan = (): LanConfig | undefined => (globalThis as Slot)[SLOT];
export const setLan = (lan: LanConfig | undefined): void => {
  (globalThis as Slot)[SLOT] = lan;
};

// ---- Address picking ----

export type Ifaces = Record<
  string,
  readonly NetworkInterfaceInfo[] | undefined
>;
export type Candidate = { iface: string; address: string };

/** Docker and libvirt bridges, container pairs, VPNs and tunnels. Not where a laptop connects. */
const VIRTUAL =
  /^(lo$|docker|br-|veth|virbr|tailscale|zt|wg|tun|tap|utun|vmnet|vboxnet|cni|flannel|cali|kube)/i;
export const isVirtualInterface = (name: string) => VIRTUAL.test(name);

/** Private, non-loopback IPv4 addresses per interface, in interface order. */
export function privateIPv4s(ifaces: Ifaces): Candidate[] {
  const out: Candidate[] = [];
  for (const [iface, infos] of Object.entries(ifaces)) {
    for (const i of infos ?? []) {
      const v4 = i.family === "IPv4" || (i.family as unknown) === 4;
      if (!v4 || i.internal) continue;
      if (!isPrivateAddress(i.address) || i.address.startsWith("127."))
        continue;
      out.push({ iface, address: i.address });
    }
  }
  return out;
}

export type LanPick = {
  chosen: Candidate;
  others: Candidate[];
  /** Private addresses left out because their interface looks virtual. */
  skippedVirtual: number;
};

/**
 * Picks the address to bind: the interface that carries the default route when
 * known, else the first private IPv4 that is not on a virtual interface.
 */
export function pickLanAddress(
  ifaces: Ifaces,
  defaultIface?: string,
): LanPick | undefined {
  const all = privateIPv4s(ifaces);
  const real = all.filter((c) => !isVirtualInterface(c.iface));
  const chosen =
    (defaultIface ? all.find((c) => c.iface === defaultIface) : undefined) ??
    real[0];
  if (!chosen) return undefined;
  return {
    chosen,
    others: real.filter((c) => c !== chosen),
    skippedVirtual: all.length - real.length - (real.includes(chosen) ? 0 : 1),
  };
}

/** Name of the interface with the lowest-metric default route, from /proc/net/route text. */
export function parseDefaultRoute(text: string): string | undefined {
  let best: { iface: string; metric: number } | undefined;
  for (const line of text.split("\n").slice(1)) {
    const [iface, dest, , flags, , , metric] = line.trim().split(/\s+/);
    if (!iface || dest !== "00000000") continue;
    if ((Number.parseInt(flags ?? "0", 16) & 1) === 0) continue; // RTF_UP
    const m = Number(metric ?? 0);
    if (!best || m < best.metric) best = { iface, metric: m };
  }
  return best?.iface;
}

/** Linux only. Elsewhere, or on any read error, undefined and the picker falls back. */
export function defaultRouteInterface(): string | undefined {
  try {
    return parseDefaultRoute(readFileSync("/proc/net/route", "utf8"));
  } catch {
    return undefined;
  }
}
