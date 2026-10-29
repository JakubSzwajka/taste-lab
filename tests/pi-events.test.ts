import { describe, expect, it } from "vitest";
import {
  createEventParser,
  createLineSplitter,
  MAX_LINE,
  parseEvent,
  type ServerEvent,
} from "../pi/lib/events";

const entry = {
  ts: "2026-10-29T10:00:00.000Z",
  round: "round-003",
  component: "card",
  level: "component",
  shown: ["a", "b", "c"],
  pick: "b",
  tags: ["airy"],
  reason: "less noise",
  theme: "dark",
  view: "flip",
};
const ready = {
  event: "ready",
  port: 5301,
  dataDir: "/abs/.taste-lab",
  local: "http://127.0.0.1:5301/",
  lan: "http://192.168.1.23:5301/?k=abcdefghijklmnopqrstuv",
};

function collect() {
  const events: ServerEvent[] = [];
  const junk: string[] = [];
  const parser = createEventParser(
    (e) => events.push(e),
    (l) => junk.push(l),
  );
  return { events, junk, parser };
}

describe("line splitter", () => {
  it("holds a partial line until its newline", () => {
    const lines: string[] = [];
    const s = createLineSplitter((l) => lines.push(l));
    s.push('{"a":');
    expect(lines).toEqual([]);
    s.push('1}\n{"b"');
    expect(lines).toEqual(['{"a":1}']);
    s.push(":2}\r\nlast");
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
    s.end();
    expect(lines).toEqual(['{"a":1}', '{"b":2}', "last"]);
  });

  it("drops a line longer than MAX_LINE and keeps the next one", () => {
    const lines: string[] = [];
    const s = createLineSplitter((l) => lines.push(l));
    s.push("x".repeat(MAX_LINE + 1));
    s.push("more of the same line\nok\n");
    expect(lines).toEqual(["ok"]);
  });
});

describe("event parser", () => {
  it("parses ready, answer and error events split across chunks", () => {
    const { events, junk, parser } = collect();
    const text = [
      JSON.stringify(ready),
      JSON.stringify({ event: "answer", entry }),
      JSON.stringify({ event: "error", message: "port 5301 is in use" }),
    ].join("\n");
    for (let i = 0; i < text.length; i += 7) parser.push(text.slice(i, i + 7));
    parser.end();
    expect(junk).toEqual([]);
    expect(events.map((e) => e.event)).toEqual(["ready", "answer", "error"]);
    expect(events[0]).toEqual(ready);
    expect(events[1]).toMatchObject({
      event: "answer",
      entry: { round: "round-003", pick: "b", view: "flip" },
    });
    expect(events[2]).toEqual({
      event: "error",
      message: "port 5301 is in use",
    });
  });

  it("accepts lan: null", () => {
    expect(parseEvent(JSON.stringify({ ...ready, lan: null }))).toEqual({
      ...ready,
      lan: null,
    });
  });

  it("reports junk lines and keeps going", () => {
    const { events, junk, parser } = collect();
    parser.push("VITE v8 ready\n");
    parser.push("{not json\n[1,2]\n\n");
    parser.push(`${JSON.stringify({ event: "unknown" })}\n`);
    parser.push(`${JSON.stringify({ ...ready, port: "5301" })}\n`);
    parser.push(`${JSON.stringify({ ...ready, lan: 5 })}\n`);
    parser.push(
      `${JSON.stringify({ event: "answer", entry: { ...entry, pick: "z" } })}\n`,
    );
    parser.push(`${JSON.stringify({ event: "error" })}\n`);
    parser.push(`${JSON.stringify(ready)}\n`);
    expect(events).toEqual([ready]);
    expect(junk).toHaveLength(8);
    expect(junk[0]).toBe("VITE v8 ready");
  });
});
