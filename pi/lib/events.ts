// Reads the `serve --events` stdout protocol: one JSON object per line.
// The protocol is in AGENTS.md ("Event protocol"). Keep free of pi imports.
import { type TasteEntry, validateEntry } from "../../src/lib/taste.ts";

export type ReadyEvent = {
  event: "ready";
  port: number;
  dataDir: string;
  local: string;
  /** Holds the LAN token. UI only, never in a model-visible message. */
  lan: string | null;
};
export type AnswerEvent = { event: "answer"; entry: TasteEntry };
export type ErrorEvent = { event: "error"; message: string };
export type ServerEvent = ReadyEvent | AnswerEvent | ErrorEvent;

/** A line longer than this (before its newline, `\r` counted) is dropped as junk. */
export const MAX_LINE = 1024 * 1024;

/**
 * Splits a text stream into lines. Holds a partial line until its newline
 * arrives. `end()` flushes a last line without a newline. A line longer than
 * MAX_LINE never reaches `onLine`, however the chunks fall.
 */
export function createLineSplitter(onLine: (line: string) => void) {
  let buf = "";
  let dropping = false;
  return {
    push(chunk: string) {
      let start = 0;
      for (;;) {
        const nl = chunk.indexOf("\n", start);
        const piece = chunk.slice(start, nl === -1 ? undefined : nl);
        // Check the size before buffering, so no complete line skips it.
        if (!dropping) {
          if (buf.length + piece.length > MAX_LINE) {
            buf = "";
            dropping = true;
          } else {
            buf += piece;
          }
        }
        if (nl === -1) return;
        if (!dropping) onLine(buf.replace(/\r$/, ""));
        buf = "";
        dropping = false;
        start = nl + 1;
      }
    },
    end() {
      if (buf !== "" && !dropping) onLine(buf.replace(/\r$/, ""));
      buf = "";
      dropping = false;
    },
  };
}

const isString = (v: unknown): v is string => typeof v === "string";

/** Parses one stdout line. Returns null for blank, non-JSON or unknown lines. */
export function parseEvent(line: string): ServerEvent | null {
  const text = line.trim();
  if (!text.startsWith("{")) return null;
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof o !== "object" || o === null || Array.isArray(o)) return null;
  const e = o as Record<string, unknown>;
  switch (e.event) {
    case "ready": {
      const { port, dataDir, local, lan } = e;
      if (
        typeof port !== "number" ||
        !Number.isInteger(port) ||
        port <= 0 ||
        port > 65535 ||
        !isString(dataDir) ||
        !isString(local) ||
        !(lan === null || isString(lan))
      ) {
        return null;
      }
      return { event: "ready", port, dataDir, local, lan };
    }
    case "answer": {
      const result = validateEntry(e.entry);
      return result.ok ? { event: "answer", entry: result.entry } : null;
    }
    case "error":
      return isString(e.message)
        ? { event: "error", message: e.message }
        : null;
    default:
      return null;
  }
}

/**
 * Feeds stdout chunks in, calls `onEvent` per parsed event and `onJunk` per
 * line that is not one. Junk never stops the stream.
 */
export function createEventParser(
  onEvent: (event: ServerEvent) => void,
  onJunk: (line: string) => void = () => {},
) {
  return createLineSplitter((line) => {
    if (line.trim() === "") return;
    const event = parseEvent(line);
    if (event) onEvent(event);
    else onJunk(line);
  });
}
