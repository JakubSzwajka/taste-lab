import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { Plugin } from "vite";
import {
  checkLanOrigin,
  cookieName,
  hasTokenCookie,
  type LanConfig,
  tokenMatches,
  UNAUTHORIZED,
} from "./lan.ts";

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

/** Splits `?a&k=x&b` and drops every `k` parameter. Keeps the rest byte for byte. */
function splitToken(url: string): { tokens: string[]; clean: string } {
  const q = url.indexOf("?");
  if (q < 0) return { tokens: [], clean: url };
  const tokens: string[] = [];
  const kept: string[] = [];
  for (const part of url.slice(q + 1).split("&")) {
    const eq = part.indexOf("=");
    const rawName = eq < 0 ? part : part.slice(0, eq);
    let name = rawName;
    let value = eq < 0 ? "" : part.slice(eq + 1);
    try {
      name = decodeURIComponent(rawName.replace(/\+/g, " "));
      value = decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      // Malformed escapes: compare the raw text.
    }
    if (name === "k") tokens.push(value);
    else kept.push(part);
  }
  const path = url.slice(0, q);
  return {
    tokens,
    clean: kept.length > 0 ? `${path}?${kept.join("&")}` : path,
  };
}

/**
 * The redirect target, or `/`. Only a same-origin path passes: one leading `/`,
 * then no second `/` or `\`, and no backslash or control character anywhere.
 * Browsers read `\` as `/`, so `/\evil.example/` would leave the server.
 * The result must also resolve to the dummy origin it is parsed against.
 */
function localPath(clean: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control chars are the point
  if (/[\\\u0000-\u001f\u007f]/.test(clean)) return "/";
  if (!/^\/(?![/\\])/.test(clean)) return "/";
  try {
    const base = "http://taste-lab.invalid";
    const u = new URL(clean, base);
    return u.origin === base ? clean : "/";
  } catch {
    return "/";
  }
}

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
 */
export function installLanGate(server: Server, lan: LanConfig): void {
  const onRequest = server.listeners("request") as ((
    req: IncomingMessage,
    res: ServerResponse,
  ) => void)[];
  const onUpgrade = server.listeners("upgrade") as ((
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => void)[];
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
}

/**
 * The Vite plugin `serve --lan` adds inline. Its settings belong to this one
 * server and are frozen. `configureServer` with `order: "pre"` runs before the
 * other plugins' hooks, and Vite has already attached its request handler and
 * HMR upgrade listener to `httpServer` by then.
 * The settings sit behind a function: `DEBUG=vite:config` prints every plugin
 * object, and a plain `token` property would land in that log.
 */
export function lanGate(settings: LanConfig): Plugin {
  const lan = Object.freeze({ ...settings });
  return {
    name: LAN_PLUGIN,
    api: Object.freeze({ settings: () => lan }),
    configureServer: {
      order: "pre",
      handler(server) {
        if (!server.httpServer) {
          throw new Error("taste-lab --lan needs Vite's own HTTP server");
        }
        installLanGate(server.httpServer as Server, lan);
      },
    },
  };
}

/** The LAN settings of the server these plugins belong to, if `--lan` is on. */
export function lanSettingsOf(
  plugins: readonly { name: string; api?: unknown }[],
): LanConfig | undefined {
  const api = plugins.find((p) => p.name === LAN_PLUGIN)?.api as
    | { settings?: () => LanConfig }
    | undefined;
  return api?.settings?.();
}
