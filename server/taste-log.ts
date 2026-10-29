import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname } from "node:path";
import { parseLog, type TasteEntry, validateEntry } from "../src/lib/taste.ts";

export type { TasteEntry };
export { parseLog, validateEntry };

const MAX_BODY = 32 * 1024;

export function readLog(file: string) {
  if (!existsSync(file)) return { entries: [], skipped: 0 };
  return parseLog(readFileSync(file, "utf8"));
}

/** Appends exactly one line. Starts a new line first if the file lacks a trailing newline. */
export function appendEntry(file: string, entry: TasteEntry): void {
  mkdirSync(dirname(file), { recursive: true });
  let prefix = "";
  if (existsSync(file)) {
    const text = readFileSync(file, "utf8");
    if (text.length > 0 && !text.endsWith("\n")) prefix = "\n";
  }
  appendFileSync(file, `${prefix}${JSON.stringify(entry)}\n`);
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function isLoopbackAddress(addr: string | undefined): boolean {
  return addr !== undefined && LOOPBACK.has(addr);
}

/** Host must be a loopback name. Blocks DNS rebinding and cross-site posts. */
export function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return ["127.0.0.1", "localhost", "[::1]"].includes(name);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

class BodyTooLarge extends Error {}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (declared > MAX_BODY) {
      req.resume(); // discard, do not buffer
      return reject(new BodyTooLarge());
    }
    let size = 0;
    const chunks: Buffer[] = [];
    const onData = (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        // Stop buffering but keep draining. Destroying the socket here would
        // race the 413 and the client would see a reset instead.
        req.off("data", onData);
        req.resume();
        reject(new BodyTooLarge());
        return;
      }
      chunks.push(c);
    };
    req.on("data", onData);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** JSON body only. A text/plain "simple" cross-origin POST is not allowed. */
export function isJsonContentType(value: string | undefined): boolean {
  if (!value) return false;
  return value.split(";")[0]?.trim().toLowerCase() === "application/json";
}

/** An Origin header, when present, must be the origin that serves the app. */
export function isSameOrigin(
  origin: string | undefined,
  host: string | undefined,
): boolean {
  if (origin === undefined) return true; // non-browser clients such as curl
  if (!host) return false;
  try {
    const u = new URL(origin);
    return (
      (u.protocol === "http:" || u.protocol === "https:") && u.host === host
    );
  } catch {
    return false; // includes the literal "null" origin
  }
}

/** Connect-style middleware for GET and POST /api/taste. */
export function createTasteMiddleware(file: string) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const path = (req.url ?? "").split("?")[0];
    if (path !== "/api/taste") return next();
    try {
      await handle(req, res, file);
    } catch {
      // Async middleware: a throw here would be an unhandled rejection.
      if (!res.headersSent) send(res, 500, { error: "internal error" });
      else res.end();
    }
  };
}

async function handle(req: IncomingMessage, res: ServerResponse, file: string) {
  if (
    !isLoopbackAddress(req.socket.remoteAddress) ||
    !isLoopbackHost(req.headers.host)
  ) {
    return send(res, 403, { error: "loopback only" });
  }
  if (req.method === "GET") {
    try {
      return send(res, 200, readLog(file));
    } catch {
      return send(res, 500, { error: "could not read the taste log" });
    }
  }
  if (req.method === "POST") {
    if (!isSameOrigin(req.headers.origin, req.headers.host)) {
      return send(res, 403, { error: "cross-origin request refused" });
    }
    if (!isJsonContentType(req.headers["content-type"])) {
      return send(res, 403, { error: "content-type must be application/json" });
    }
    let raw: string;
    try {
      raw = await readBody(req);
    } catch (e) {
      if (e instanceof BodyTooLarge) {
        res.setHeader("connection", "close");
        return send(res, 413, { error: "body too large" });
      }
      return send(res, 400, { error: "could not read request body" });
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return send(res, 400, { error: "body is not valid JSON" });
    }
    // The server owns the timestamp. Ignore whatever the client sent.
    if (typeof json === "object" && json !== null && !Array.isArray(json)) {
      delete (json as Record<string, unknown>).ts;
    }
    const result = validateEntry(json);
    if (!result.ok) return send(res, 400, { error: result.error });
    try {
      appendEntry(file, result.entry);
    } catch {
      return send(res, 500, { error: "could not write the taste log" });
    }
    return send(res, 201, { entry: result.entry });
  }
  res.setHeader("allow", "GET, POST");
  return send(res, 405, { error: "method not allowed" });
}
