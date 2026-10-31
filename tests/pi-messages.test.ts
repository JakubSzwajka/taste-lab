import { describe, expect, it } from "vitest";
import type { ReadyEvent } from "../pi/lib/events";
import {
  answerDetails,
  answerText,
  LINK_REDACTED,
  lanToken,
  linkLines,
  modelMessage,
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
const info = { port: 5301, dataDir: "/abs/.taste-lab", lan: true };
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
    const text = startedText(info, TOKEN);
    expect(text).toContain("/abs/.taste-lab");
    expect(text).toContain("5301");
    expect(text).toContain("taste skill");
    expect(text).not.toContain("http");
    assertNoSecret(text);
    expect(startedText({ ...info, lan: false })).toContain("local only");
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
    const pasted = {
      ...entry,
      reason: `see ${ready.lan} and ${TOKEN}, also k=${TOKEN}`,
    };
    const text = answerText(pasted, ready.dataDir, TOKEN);
    assertNoSecret(text);
    expect(text).toContain(`reason "see ${LINK_REDACTED} and [redacted],`);
  });

  it("scrubs before truncating: a token at the cut leaks no prefix", () => {
    // 378 is the review's case. The cap is 400, so sweep every cut position.
    for (let pad = 370; pad <= 400; pad++) {
      const reason = "x".repeat(pad) + TOKEN;
      const text = answerText({ ...entry, reason }, ready.dataDir, TOKEN);
      for (let n = 4; n <= TOKEN.length; n++) {
        expect(text).not.toContain(TOKEN.slice(0, n));
      }
      assertNoSecret(text);
    }
  });

  it("no literal k= survives, link or bare, while pick= words stay", () => {
    expect(scrubSecrets("open http://h:1/?a=1&k=abc#x now")).toBe(
      `open ${LINK_REDACTED} now`,
    );
    expect(scrubSecrets("k=abc")).toBe(LINK_REDACTED);
    expect(scrubSecrets('"?k="')).toBe(`"${LINK_REDACTED}"`);
    expect(scrubSecrets("i would pick=a, ok=fine")).toBe(
      "i would pick=a, ok=fine",
    );
  });

  it("answer details keep only round ids, short picks and the given dir", () => {
    expect(answerDetails(entry, "/d")).toEqual({
      dataDir: "/d",
      round: "round-003",
      pick: "b",
    });
    const hostile = {
      ...entry,
      round: `round-003 ${TOKEN}`,
      pick: `k=${TOKEN}`,
    };
    expect(answerDetails(hostile, "/d")).toEqual({
      dataDir: "/d",
      round: null,
      pick: null,
    });
    expect(answerDetails({ ...entry, pick: "mix" }, "/d").pick).toBe("mix");
    expect(answerDetails({ ...entry, round: "round-1" }, "/d").round).toBe(
      null,
    );
  });

  it("modelMessage scrubs content and every string in details", () => {
    const msg = modelMessage(
      {
        customType: "taste-lab-answer",
        content: `x ${ready.lan}`,
        display: true,
        details: {
          dataDir: `/a/${TOKEN}`,
          nested: [{ [`k=${TOKEN}`]: `?k=${TOKEN}` }],
          port: 5301,
        },
      },
      TOKEN,
    );
    assertNoSecret(JSON.stringify(msg));
    expect(msg.details).toEqual({
      dataDir: "/a/[redacted]",
      nested: [{ [LINK_REDACTED]: LINK_REDACTED }],
      port: 5301,
    });
  });

  it("caps a long reason", () => {
    const text = answerText({ ...entry, reason: "x".repeat(2000) }, "/d");
    expect(text.length).toBeLessThan(600);
  });
});

describe("UI-only text", () => {
  it("link lines carry both links", () => {
    expect(linkLines(ready)).toEqual([
      "taste.lab local  http://127.0.0.1:5301/",
      `taste.lab LAN    ${ready.lan}`,
    ]);
    expect(linkLines({ ...ready, lan: null })).toHaveLength(1);
    expect(statusText(ready)).toBe("taste.lab :5301 LAN");
    expect(statusText(ready)).not.toContain(TOKEN);
  });

  it("lanToken and scrubSecrets", () => {
    expect(lanToken(ready.lan)).toBe(TOKEN);
    expect(lanToken(null)).toBeUndefined();
    expect(lanToken("not a url")).toBeUndefined();
    expect(scrubSecrets(`GET /?k=${TOKEN}&x=1`)).toBe(`GET ${LINK_REDACTED}`);
    expect(scrubSecrets(`cookie ${TOKEN}`, [TOKEN])).toBe("cookie [redacted]");
  });
});
