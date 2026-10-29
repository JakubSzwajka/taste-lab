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

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
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
    if (
      !isLoopbackAddress(req.socket.remoteAddress) ||
      !isLoopbackHost(req.headers.host)
    ) {
      return send(res, 403, { error: "loopback only" });
    }
    if (req.method === "GET") {
      return send(res, 200, readLog(file));
    }
    if (req.method === "POST") {
      try {
        const raw = await readBody(req);
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return send(res, 400, { error: "body is not valid JSON" });
        }
        const result = validateEntry(json);
        if (!result.ok) return send(res, 400, { error: result.error });
        appendEntry(file, result.entry);
        return send(res, 201, { entry: result.entry });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "bad request";
        return send(res, msg === "body too large" ? 413 : 500, { error: msg });
      }
    }
    res.setHeader("allow", "GET, POST");
    return send(res, 405, { error: "method not allowed" });
  };
}
