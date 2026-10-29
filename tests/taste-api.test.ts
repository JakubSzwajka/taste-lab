import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTasteMiddleware, isSameOrigin } from "../server/taste-log";

const valid = {
  round: "round-001",
  component: "card",
  level: "component",
  shown: ["a", "b"],
  pick: "a",
  tags: ["airy"],
  reason: "ok",
  theme: "light",
};

let dir: string;
let file: string;
let server: Server;
let port: number;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "taste-api-"));
  file = join(dir, "taste.jsonl");
  server = createServer((req, res) => {
    createTasteMiddleware(file)(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
afterEach(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(dir, { recursive: true, force: true });
});

function call(opts: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/taste",
        method: opts.method ?? "GET",
        headers: opts.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            json: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end(opts.body);
  });
}

const post = (
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) => call({ method: "POST", headers, body: JSON.stringify(body) });

describe("POST /api/taste", () => {
  it("appends one line and uses a server timestamp", async () => {
    const r = await post({ ...valid, ts: "2001-01-01T00:00:00Z" });
    expect(r.status).toBe(201);
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const ts = JSON.parse(lines[0] as string).ts as string;
    expect(ts).not.toBe("2001-01-01T00:00:00Z");
    expect(Date.now() - Date.parse(ts)).toBeLessThan(10_000);
  });

  it("accepts application/json with a charset and a same-origin Origin", async () => {
    const r = await post(valid, {
      "content-type": "application/json; charset=utf-8",
      origin: `http://127.0.0.1:${port}`,
    });
    expect(r.status).toBe(201);
  });

  it("rejects a text/plain simple request with 403 and writes nothing", async () => {
    const r = await post(valid, { "content-type": "text/plain" });
    expect(r.status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it("rejects a missing content-type with 403", async () => {
    const r = await post(valid, {});
    expect(r.status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it.each([
    ["another localhost port", "http://localhost:9999"],
    ["another host", "https://evil.example"],
    ["the null origin", "null"],
  ])("rejects a cross-origin POST from %s with 403", async (_n, origin) => {
    const r = await post(valid, { "content-type": "application/json", origin });
    expect(r.status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it("rejects an https Origin with the same host and port", async () => {
    const r = await post(valid, {
      "content-type": "application/json",
      origin: `https://127.0.0.1:${port}`,
    });
    expect(r.status).toBe(403);
    expect(existsSync(file)).toBe(false);
  });

  it("rejects unknown tags with 400", async () => {
    const r = await post({ ...valid, tags: ["airy", "spicy"] });
    expect(r.status).toBe(400);
    expect(String(r.json.error)).toContain("spicy");
    expect(existsSync(file)).toBe(false);
  });

  it("answers 413 for an oversized body without dropping the connection", async () => {
    const r = await call({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...valid, reason: "x".repeat(200 * 1024) }),
    });
    expect(r.status).toBe(413);
    expect(existsSync(file)).toBe(false);
  });

  it("answers 413 for an oversized chunked body", async () => {
    const r = await new Promise<number>((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port,
          path: "/api/taste",
          method: "POST",
          headers: {
            "content-type": "application/json",
            "transfer-encoding": "chunked",
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on("error", reject);
      req.write("x".repeat(40 * 1024));
      req.end("x".repeat(40 * 1024));
    });
    expect(r).toBe(413);
  });

  it("returns a JSON 500 when the log cannot be written", async () => {
    writeFileSync(join(dir, "blocker"), "");
    file = join(dir, "blocker", "taste.jsonl"); // parent is a file
    const r = await post(valid);
    expect(r.status).toBe(500);
    expect(r.json.error).toBeTypeOf("string");
  });
});

describe("GET /api/taste", () => {
  it("returns a JSON 500 when the log cannot be read", async () => {
    mkdirSync(file); // reading a directory throws EISDIR
    const r = await call({});
    expect(r.status).toBe(500);
    expect(r.json.error).toBeTypeOf("string");
    // the server is still alive
    rmSync(file, { recursive: true });
    expect((await call({})).status).toBe(200);
  });
});

describe("isSameOrigin", () => {
  it("allows a missing Origin and matches the Host header", () => {
    expect(isSameOrigin(undefined, "127.0.0.1:5173")).toBe(true);
    expect(isSameOrigin("http://127.0.0.1:5173", "127.0.0.1:5173")).toBe(true);
    expect(isSameOrigin("http://localhost:5173", "127.0.0.1:5173")).toBe(false);
    expect(isSameOrigin("null", "127.0.0.1:5173")).toBe(false);
    expect(isSameOrigin("http://127.0.0.1:5173", undefined)).toBe(false);
  });

  it("compares scheme and effective port", () => {
    expect(isSameOrigin("https://127.0.0.1:5173", "127.0.0.1:5173")).toBe(
      false,
    );
    expect(isSameOrigin("http://127.0.0.1:5173", "127.0.0.1:5173", true)).toBe(
      false,
    );
    expect(isSameOrigin("https://127.0.0.1:5173", "127.0.0.1:5173", true)).toBe(
      true,
    );
    expect(isSameOrigin("http://127.0.0.1:80", "127.0.0.1")).toBe(true);
    expect(isSameOrigin("https://127.0.0.1:443", "127.0.0.1", true)).toBe(true);
    expect(isSameOrigin("http://127.0.0.1", "127.0.0.1:8080")).toBe(false);
    expect(isSameOrigin("ftp://127.0.0.1:5173", "127.0.0.1:5173")).toBe(false);
  });
});
