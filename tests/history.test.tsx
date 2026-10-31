import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HistoryView } from "../src/components/HistoryView";
import { TooltipProvider } from "../src/components/ui/tooltip";
import {
  formatWhen,
  historyRows,
  pickTitle,
  sortNewestFirst,
  winnerLabel,
} from "../src/lib/history";
import type { LoadedRound } from "../src/lib/rounds";
import type { TasteEntry } from "../src/lib/taste";

const round = (id: string, labels: Record<string, string>): LoadedRound => ({
  ok: true,
  id,
  loaders: {},
  spec: {
    id,
    level: "layout",
    component: "history-page",
    question: "Q?",
    fixture: "lab",
    basedOn: null,
    preview: "flip",
    variants: Object.entries(labels).map(([id, label]) => ({
      id,
      file: `${id}.tsx`,
      label,
      changes: "c",
    })),
  },
});
const broken = (id: string): LoadedRound => ({
  ok: false,
  id,
  errors: ["bad"],
});
const entry = (over: Partial<TasteEntry> = {}): TasteEntry => ({
  ts: "2026-10-30T08:34:04.253Z",
  round: "round-007",
  component: "history-page",
  level: "layout",
  shown: ["a", "b", "c"],
  pick: "c",
  tags: [],
  reason: "the richer row",
  theme: "dark",
  view: "flip",
  ...over,
});
const rounds = [round("round-007", { a: "Quieter", c: "Richer row" })];

const html = (entries: TasteEntry[], rs: LoadedRound[] = rounds, skipped = 0) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <HistoryView entries={entries} skipped={skipped} rounds={rs} />
    </TooltipProvider>,
  );

describe("winnerLabel", () => {
  it("reads the label from round.json", () => {
    expect(winnerLabel(entry(), rounds)).toBe("Richer row");
  });
  it("is null for none and mix", () => {
    expect(winnerLabel(entry({ pick: "none" }), rounds)).toBeNull();
    expect(winnerLabel(entry({ pick: "mix" }), rounds)).toBeNull();
  });
  it("is null for a missing round, a broken round or a removed variant", () => {
    expect(winnerLabel(entry({ round: "round-099" }), rounds)).toBeNull();
    expect(winnerLabel(entry(), [broken("round-007")])).toBeNull();
    expect(winnerLabel(entry({ pick: "z" }), rounds)).toBeNull();
  });
});

describe("historyRows", () => {
  it("sorts newest first and keeps later lines first on a tie", () => {
    const a = entry({ ts: "2026-01-01T00:00:00.000Z", reason: "old" });
    const b = entry({ ts: "2026-01-02T00:00:00.000Z", reason: "tie 1" });
    const c = entry({ ts: "2026-01-02T00:00:00.000Z", reason: "tie 2" });
    expect(sortNewestFirst([a, b, c]).map((e) => e.reason)).toEqual([
      "tie 2",
      "tie 1",
      "old",
    ]);
  });
  it("sorts by instant, not by string, across UTC offsets", () => {
    // As strings "10:00+02:00" sorts after "09:00Z", but it is 08:00Z: older.
    const older = entry({ ts: "2026-10-30T10:00:00+02:00", reason: "older" });
    const newer = entry({ ts: "2026-10-30T09:00:00Z", reason: "newer" });
    expect(sortNewestFirst([newer, older]).map((e) => e.reason)).toEqual([
      "newer",
      "older",
    ]);
    expect(sortNewestFirst([older, newer]).map((e) => e.reason)).toEqual([
      "newer",
      "older",
    ]);
  });
  it("keeps the later line first when offsets name the same instant", () => {
    const a = entry({ ts: "2026-10-30T10:00:00+02:00", reason: "line 1" });
    const b = entry({ ts: "2026-10-30T08:00:00.000Z", reason: "line 2" });
    expect(sortNewestFirst([a, b]).map((e) => e.reason)).toEqual([
      "line 2",
      "line 1",
    ]);
  });
  it("collapses tags past two into a count and keys duplicates apart", () => {
    const e = entry({ tags: ["clean", "airy", "quiet", "loud"] });
    const rows = historyRows([e, e], rounds);
    expect(rows[0].tags).toEqual(["clean", "airy"]);
    expect(rows[0].moreTags).toBe(2);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });
  it("tells a broken round from a missing one", () => {
    const rows = historyRows(
      [entry(), entry({ round: "round-099" })],
      [broken("round-007")],
    );
    expect(rows.map((r) => r.roundExists)).toEqual([false, true]);
  });
});

describe("format helpers", () => {
  it("formats a date in a given zone and passes junk through", () => {
    expect(formatWhen("2026-10-29T10:05:00.000Z", "UTC")).toBe("Oct 29, 10:05");
    expect(formatWhen("nope")).toBe("nope");
  });
  it("joins pick and label", () => {
    expect(pickTitle("c", "Richer row")).toBe("c · Richer row");
    expect(pickTitle("none", null)).toBe("none");
  });
});

describe("HistoryView", () => {
  it("uses taller rows, colored same-height pills and plain medium icons", () => {
    const out = html([
      entry({ tags: ["clean"], pick: "c" }),
      entry({ pick: "mix" }),
      entry({ pick: "none" }),
    ]);
    expect(out).toContain("[&amp;_td]:py-3.5");
    expect(out).toContain("bg-chart-3/15 text-chart-3");
    expect(out).toContain("bg-accent text-accent-foreground");
    expect(out.match(/class="[^"]*h-6 w-48/g)).toHaveLength(3);
    for (const icon of out.match(/<svg[^>]*>/g) ?? []) {
      expect(icon).toContain('stroke-width="1.75"');
      expect(icon).toContain("size-5");
    }
    expect(out).toContain("lucide-panels-top-left");
  });

  it("shows the pick pill with its label, the round link, reason and icons", () => {
    const out = html([entry()]);
    expect(out).toContain("Richer row");
    expect(out).toContain('href="#/round/round-007"');
    expect(out).toContain("the richer row");
    expect(out).toContain("Answered in dark theme");
    expect(out).toContain("Answered in flip view");
    expect(out).toContain("1 answer<");
  });
  it("flattens multiline reasons in the row but preserves the full title", () => {
    const reason = "header of a\nbody of b\r\nfooter of c\rlast";
    const out = html([entry({ reason })]);
    expect(out).toContain(`title="${reason}"`);
    expect(out).toMatch(/>header of a body of b footer of c last<\/td>/);
    expect(out).toContain("truncate");
  });

  it("shows old tags as same-size pills and leaves the cell empty without tags", () => {
    const tagged = html([entry({ tags: ["clean", "airy", "quiet"] })]);
    expect(tagged).toContain(">clean<");
    expect(tagged).toContain(">airy<");
    expect(tagged).not.toContain(">quiet<");
    expect(tagged).toContain("+1");
    expect(tagged.match(/class="[^"]*\bw-20\b/g)).toHaveLength(2);
    const bare = html([entry()]);
    expect(bare).not.toContain("w-20");
  });
  it("lists newest first", () => {
    const out = html([
      entry({ ts: "2026-01-01T00:00:00.000Z", reason: "first" }),
      entry({ ts: "2026-02-01T00:00:00.000Z", reason: "second" }),
    ]);
    expect(out.indexOf("second")).toBeLessThan(out.indexOf("first"));
  });
  it("degrades for a missing round, none, mix and an old line without view", () => {
    const out = html([
      entry({ round: "round-099", pick: "b", reason: "gone" }),
      entry({ pick: "none", reason: "all missed" }),
      entry({ pick: "mix", reason: "header of a, bar of c" }),
      entry({ view: undefined, reason: "old line" }),
    ]);
    expect(out).not.toContain('href="#/round/round-099"');
    expect(out).toContain("round-099");
    expect(out).toContain("all missed");
    expect(out).toContain("header of a, bar of c");
    expect(out.match(/Answered in flip view/g)).toHaveLength(3);
  });
  it("says so when empty and warns about skipped lines", () => {
    expect(html([])).toContain("No answers yet.");
    expect(html([entry()], rounds, 2)).toContain("2 line(s)");
  });
});
