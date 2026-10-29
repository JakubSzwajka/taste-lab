import { describe, expect, it } from "vitest";
import type { ReadyEvent } from "../pi/lib/events";
import {
  answerText,
  lanToken,
  linkLines,
  scrubSecrets,
  startedText,
  statusText,
} from "../pi/lib/messages";
import type { TasteEntry } from "../src/lib/taste";

const TOKEN = "Zx9_Qw-8rT5yU3iO1pLk2j";
const ready: ReadyEvent = {
  event: "ready",
  port: 5301,
  dataDir: "/abs/.taste-lab",
  local: "http://127.0.0.1:5301/",
  lan: `http://192.168.1.23:5301/?k=${TOKEN}`,
};
const entry: TasteEntry = {
  ts: "2026-10-29T10:00:00.000Z",
  round: "round-003",
  component: "card",
  level: "component",
  shown: ["a", "b", "c"],
  pick: "b",
  tags: ["airy", "clean"],
  reason: "less noise\nmore air",
  theme: "dark",
  view: "flip",
};

function assertNoSecret(text: string) {
  expect(text).not.toContain(TOKEN);
  expect(text).not.toContain("k=");
  expect(text).not.toContain("192.168.1.23");
}

describe("model-visible messages", () => {
  it("started text names the dir and port, not the links", () => {
    const text = startedText(ready, TOKEN);
    expect(text).toContain("/abs/.taste-lab");
    expect(text).toContain("5301");
    expect(text).toContain("taste skill");
    expect(text).not.toContain("http");
    assertNoSecret(text);
    expect(startedText({ ...ready, lan: null })).toContain("local only");
  });

  it("answer text is one compact line with every field", () => {
    const text = answerText(entry, ready.dataDir, TOKEN);
    expect(text).toBe(
      'answered round-003 (card, component): pick b; tags airy, clean; reason "less noise more air"; ' +
        "theme dark; view flip. Data dir /abs/.taste-lab. Load the taste skill and write the next round.",
    );
    assertNoSecret(text);
  });

  it("answer text without tags, reason or view", () => {
    const text = answerText(
      { ...entry, tags: [], reason: "", view: undefined, pick: "none" },
      "/d",
    );
    expect(text).toContain("pick none; tags none; reason none; theme dark.");
    expect(text).not.toContain("view");
  });

  it("scrubs a token or a k= link that the operator pasted into a reason", () => {
    const pasted = { ...entry, reason: `see ${ready.lan} and ${TOKEN}` };
    const text = answerText(pasted, ready.dataDir, TOKEN);
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain(`k=${TOKEN}`);
    expect(text).toContain("[redacted]");
  });

  it("caps a long reason", () => {
    const text = answerText({ ...entry, reason: "x".repeat(2000) }, "/d");
    expect(text.length).toBeLessThan(600);
  });
});

describe("UI-only text", () => {
  it("link lines carry both links", () => {
    expect(linkLines(ready)).toEqual([
      "taste-lab local  http://127.0.0.1:5301/",
      `taste-lab LAN    ${ready.lan}`,
    ]);
    expect(linkLines({ ...ready, lan: null })).toHaveLength(1);
    expect(statusText(ready)).toBe("taste :5301 +LAN");
    expect(statusText(ready)).not.toContain(TOKEN);
  });

  it("lanToken and scrubSecrets", () => {
    expect(lanToken(ready.lan)).toBe(TOKEN);
    expect(lanToken(null)).toBeUndefined();
    expect(lanToken("not a url")).toBeUndefined();
    expect(scrubSecrets(`GET /?k=${TOKEN}&x=1`)).toBe("GET /?k=[redacted]&x=1");
    expect(scrubSecrets(`cookie ${TOKEN}`, [TOKEN])).toBe("cookie [redacted]");
  });
});
