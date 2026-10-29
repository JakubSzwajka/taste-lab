import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { Plugin } from "vite";
import {
  checkLanOrigin,
  cookieName,
  hasTokenCookie,
  type LanConfig,
  localPath,
  splitToken,
  tokenMatches,
  UNAUTHORIZED,
} from "./lan.ts";
import {
  createLoopbackListener,
  type RequestListener,
  type UpgradeListener,
  type ViteListeners,
} from "./lan-loopback.ts";

/** Name of the Vite plugin that `serve --lan` adds. vite.config.ts finds the settings by it. */
export const LAN_PLUGIN = "taste-lab:lan";

export type GateRequest = {
  url: string | undefined;
  remoteAddress: string | undefined;
  host: string | undefined;
  origin: string | undefined;
  cookie: string | undefined;
};

export type GateDecision =
  | { action: "pass" }
  | { action: "redirect"; location: string; setCookie: string }
  | { action: "deny"; status: 401 | 403; error: string };

/**
 * What the LAN gate does with one request:
 * 1. Bad address, Host or Origin: 403.
 * 2. `?k=<token>`: set the cookie and redirect to the same URL without `k`, so Vite
 *    never sees the token. A wrong `k` is 401 and is never passed on either.
 * 3. Otherwise the token cookie is required: 401 without it.
 */
export function gateDecision(req: GateRequest, lan: LanConfig): GateDecision {
  const bad = checkLanOrigin(req, lan);
  if (bad) return { action: "deny", ...bad };
  const url = req.url ?? "/";
  const { tokens, clean } = splitToken(url);
  if (tokens.length > 0) {
    if (tokens.length !== 1 || !tokenMatches(tokens[0], lan.token)) {
      return { action: "deny", status: 401, error: UNAUTHORIZED };
    }
    const location = localPath(clean);
    return {
      action: "redirect",
      location,
      setCookie: `${cookieName(lan.port)}=${lan.token}; HttpOnly; SameSite=Strict; Path=/`,
    };
  }
  if (!hasTokenCookie(req.cookie, lan)) {
    return { action: "deny", status: 401, error: UNAUTHORIZED };
  }
  return { action: "pass" };
}

const toGate = (req: IncomingMessage): GateRequest => ({
  url: req.url,
  remoteAddress: req.socket.remoteAddress,
  host: req.headers.host,
  origin: req.headers.origin,
  cookie: req.headers.cookie,
});

const DENIED_PAGE = (status: number) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>taste-lab</title></head>
<body><p>${
  status === 401
    ? "Open the link printed by <code>taste-lab serve --lan</code>."
    : "This address is not allowed. Open the link printed by <code>taste-lab serve --lan</code>."
}</p></body></html>
`;

function respond(
  req: IncomingMessage,
  res: ServerResponse,
  d: Exclude<GateDecision, { action: "pass" }>,
) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("referrer-policy", "no-referrer");
  if (d.action === "redirect") {
    res.statusCode = 302;
    res.setHeader("set-cookie", d.setCookie);
    res.setHeader("location", d.location);
    res.end();
    return;
  }
  res.statusCode = d.status;
  const path = (req.url ?? "").split("?")[0] ?? "";
  if (path.startsWith("/api/")) {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: d.error }));
  } else {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(DENIED_PAGE(d.status));
  }
}

const REASON = { 401: "Unauthorized", 403: "Forbidden" } as const;

/**
 * Puts the gate in front of every `request` and `upgrade` listener attached to
 * `server` before this call. Today that is all of Vite's HTTP and HMR handlers:
 * its middleware (including its debug request logger) and its HMR WebSocket sit
 * behind these listeners, so a denied request never reaches them, and neither
 * does a URL with `?k=`. Listeners attached later are NOT covered and run on
 * their own, even after the gate denied the request. Vite adds its proxy
 * `upgrade` listener that way. This repo configures no proxy.
 * Returns the listeners it took, so the loopback listener can serve them too.
 */
export function installLanGate(server: Server, lan: LanConfig): ViteListeners {
  const onRequest = server.listeners("request") as RequestListener[];
  const onUpgrade = server.listeners("upgrade") as UpgradeListener[];
  server.removeAllListeners("request");
  server.removeAllListeners("upgrade");
  server.on("request", (req: IncomingMessage, res: ServerResponse) => {
    const d = gateDecision(toGate(req), lan);
    if (d.action !== "pass") return respond(req, res, d);
    for (const fn of onRequest) fn.call(server, req, res);
  });
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const d = gateDecision(toGate(req), lan);
    if (d.action === "pass") {
      for (const fn of onUpgrade) fn.call(server, req, socket, head);
      return;
    }
    // A WebSocket handshake cannot follow a redirect: `?k=` here is a 401 too.
    const status = d.action === "deny" ? d.status : 401;
    socket.on("error", () => {});
    socket.end(
      `HTTP/1.1 ${status} ${REASON[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
    );
  });
  return { onRequest, onUpgrade };
}

/** What the `taste-lab:lan` plugin exposes. Functions only, see `lanGate`. */
type LanApi = {
  settings: () => LanConfig;
  /** True when the request arrived on the loopback listener. */
  fromLoopback: (req: IncomingMessage) => boolean;
  /** Settles once the loopback listener of the current server listens or fails. */
  loopbackReady: () => Promise<void>;
};

/**
 * The Vite plugin `serve --lan` adds inline. Its settings belong to this one
 * server and are frozen. `configureServer` with `order: "pre"` runs before the
 * other plugins' hooks, and Vite has already attached its request handler and
 * HMR upgrade listener to `httpServer` by then.
 *
 * Two listeners, one app. Vite's own HTTP server binds the LAN address and gets
 * the gate. A second server on 127.0.0.1, same port, gets the same Vite
 * listeners without the gate (see lan-loopback.ts). It starts when Vite's server
 * starts listening and stops when Vite closes its server, restarts included.
 *
 * The settings sit behind a function: `DEBUG=vite:config` prints every plugin
 * object, and a plain `token` property would land in that log.
 */
export function lanGate(settings: LanConfig): Plugin {
  const lan = Object.freeze({ ...settings });
  // Sockets the loopback listener accepted. Per plugin, so per server.
  const loopSockets = new WeakSet<object>();
  let ready: Promise<void> | undefined;
  const api: LanApi = {
    settings: () => lan,
    fromLoopback: (req) => loopSockets.has(req.socket),
    loopbackReady: () =>
      ready ?? Promise.reject(new Error("the LAN server has not started")),
  };
  return {
    name: LAN_PLUGIN,
    api: Object.freeze(api),
    configureServer: {
      order: "pre",
      handler(server) {
        if (!server.httpServer) {
          throw new Error("taste-lab --lan needs Vite's own HTTP server");
        }
        const http = server.httpServer as Server;
        const loop = createLoopbackListener(
          installLanGate(http, lan),
          lan.port,
          loopSockets,
        );
        ready = new Promise<void>((resolve, reject) => {
          http.once("listening", () => loop.listen().then(resolve, reject));
        });
        // `serve` awaits this on start. After a restart nobody does: log it.
        ready.catch((e: Error) =>
          server.config.logger.error(
            `taste-lab: the 127.0.0.1 listener failed: ${e.message}`,
          ),
        );
        // Vite closes its HTTP server through `close` on close and on restart.
        // The loopback listener closes first, so a restart can bind the port again.
        const closeVite = http.close.bind(http);
        http.close = ((cb?: (err?: Error) => void) => {
          void loop.close().then(() => closeVite(cb));
          return http;
        }) as Server["close"];
      },
    },
  };
}

function lanApiOf(
  plugins: readonly { name: string; api?: unknown }[],
): Partial<LanApi> | undefined {
  return plugins.find((p) => p.name === LAN_PLUGIN)?.api as
    | Partial<LanApi>
    | undefined;
}

/** The LAN settings of the server these plugins belong to, if `--lan` is on. */
export function lanSettingsOf(
  plugins: readonly { name: string; api?: unknown }[],
): LanConfig | undefined {
  return lanApiOf(plugins)?.settings?.();
}

/** Classifies a request by listener: true when it came in on 127.0.0.1 in LAN mode. */
export function fromLoopbackOf(
  plugins: readonly { name: string; api?: unknown }[],
): ((req: IncomingMessage) => boolean) | undefined {
  return lanApiOf(plugins)?.fromLoopback;
}

/** Waits for the loopback listener of a `--lan` server. Resolves at once without `--lan`. */
export async function loopbackReady(
  plugins: readonly { name: string; api?: unknown }[],
): Promise<void> {
  const api = lanApiOf(plugins);
  if (api?.loopbackReady) await api.loopbackReady();
}
