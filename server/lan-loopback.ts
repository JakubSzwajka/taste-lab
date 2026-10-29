import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import { localPath, splitToken } from "./lan.ts";
import { isLoopbackHost } from "./taste-log.ts";

/** `serve --lan` also listens here, on the same port, with the loopback rules. */
export const LOOPBACK_ADDRESS = "127.0.0.1";

export type RequestListener = (
  req: IncomingMessage,
  res: ServerResponse,
) => void;
export type UpgradeListener = (
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
) => void;

/** Vite's own HTTP and HMR listeners, as taken off its server before the LAN gate. */
export type ViteListeners = {
  onRequest: RequestListener[];
  onUpgrade: UpgradeListener[];
};

export type LoopbackDecision =
  | { action: "pass" }
  | { action: "redirect"; location: string }
  | { action: "deny"; status: 400 | 403; error: string };

/**
 * What the loopback listener does with one request, before Vite sees it:
 * 1. Host must be a loopback name (127.0.0.1, localhost, [::1]): else 403.
 * 2. A `k` parameter is dropped with a redirect and no cookie. The loopback side
 *    needs no token, and Vite's debug log would print the URL.
 * The taste API then applies its own loopback rules (address, Host, Origin, JSON).
 */
export function loopbackDecision(req: {
  url: string | undefined;
  host: string | undefined;
}): LoopbackDecision {
  if (!isLoopbackHost(req.host)) {
    return { action: "deny", status: 403, error: "loopback only" };
  }
  const { tokens, clean } = splitToken(req.url ?? "/");
  if (tokens.length > 0)
    return { action: "redirect", location: localPath(clean) };
  return { action: "pass" };
}

function respond(
  req: IncomingMessage,
  res: ServerResponse,
  d: Exclude<LoopbackDecision, { action: "pass" }>,
) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("referrer-policy", "no-referrer");
  if (d.action === "redirect") {
    res.statusCode = 302;
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
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(`${d.error}\n`);
  }
}

const REASON = { 400: "Bad Request", 403: "Forbidden" } as const;

export type LoopbackListener = {
  server: Server;
  /** Binds 127.0.0.1:`port`. Rejects with the listen error, e.g. EADDRINUSE. */
  listen(): Promise<void>;
  /** Drops open connections (HMR sockets too) and stops listening. */
  close(): Promise<void>;
};

/**
 * A second HTTP server on 127.0.0.1 that hands requests to Vite's own listeners,
 * so both addresses serve one app and one HMR channel. It has no LAN gate.
 * Every socket it accepts goes into `sockets`: the taste API classifies a
 * request by the listener it arrived on, never by its headers.
 */
export function createLoopbackListener(
  vite: ViteListeners,
  port: number,
  sockets: WeakSet<object>,
): LoopbackListener {
  const server = createServer();
  const open = new Set<Socket>();
  server.on("connection", (s: Socket) => {
    sockets.add(s);
    open.add(s);
    s.on("close", () => open.delete(s));
  });
  server.on("request", (req: IncomingMessage, res: ServerResponse) => {
    const d = loopbackDecision({ url: req.url, host: req.headers.host });
    if (d.action !== "pass") return respond(req, res, d);
    for (const fn of vite.onRequest) fn.call(server, req, res);
  });
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const d = loopbackDecision({ url: req.url, host: req.headers.host });
    if (d.action === "pass") {
      for (const fn of vite.onUpgrade) fn.call(server, req, socket, head);
      return;
    }
    // A WebSocket handshake cannot follow a redirect.
    const status = d.action === "deny" ? d.status : 400;
    socket.on("error", () => {});
    socket.end(
      `HTTP/1.1 ${status} ${REASON[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
    );
  });
  return {
    server,
    listen: () =>
      new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen({ host: LOOPBACK_ADDRESS, port, exclusive: true }, () => {
          server.off("error", reject);
          resolve();
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of open) s.destroy();
        if (!server.listening) return resolve();
        server.close(() => resolve());
      }),
  };
}
