import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppHeader } from "../src/components/AppHeader";
import { TooltipProvider } from "../src/components/ui/tooltip";
import {
  answeredCount,
  neighbors,
  pageOf,
  roundItems,
  stepTargets,
} from "../src/lib/header";
import type { LoadedRound } from "../src/lib/rounds";
import type { Route } from "../src/lib/route";
import type { TasteEntry } from "../src/lib/taste";

const ok = (id: string, question = `Question ${id}?`): LoadedRound => ({
  ok: true,
  id,
  loaders: {},
  spec: {
    id,
    level: "component",
    component: "card",
    question,
    fixture: "tasks",
    basedOn: null,
    preview: "columns",
    variants: [],
  },
});
const broken = (id: string): LoadedRound => ({
  ok: false,
  id,
  errors: ["bad"],
});
const entry = (round: string, pick: string): TasteEntry => ({
  ts: "2026-01-01T00:00:00.000Z",
  round,
  component: "card",
  level: "component",
  shown: ["a", "b"],
  pick,
  tags: [],
  reason: "",
  theme: "dark",
});

const rounds = [
  ok("round-001"),
  ok("round-002"),
  broken("round-003"),
  ok("round-004"),
];
const entries = [
  entry("round-001", "a"),
  entry("round-001", "b"), // a later answer wins
  entry("round-gone", "a"), // a deleted round does not count
];

describe("header state", () => {
  it("lists every round with its status and a hrefFor link", () => {
    expect(roundItems(rounds, entries)).toEqual([
      {
        id: "round-001",
        href: "#/round/round-001",
        component: "card",
        status: { kind: "answered", pick: "b" },
      },
      {
        id: "round-002",
        href: "#/round/round-002",
        component: "card",
        status: { kind: "open" },
      },
      {
        id: "round-003",
        href: "#/round/round-003",
        component: "",
        status: { kind: "error" },
      },
      {
        id: "round-004",
        href: "#/round/round-004",
        component: "card",
        status: { kind: "open" },
      },
    ]);
  });

  it("encodes odd round ids in links", () => {
    expect(roundItems([broken("a b#c")], [])[0]?.href).toBe(
      "#/round/a%20b%23c",
    );
  });

  it("counts answered rounds among the listed ones only", () => {
    expect(answeredCount(roundItems(rounds, entries))).toBe(1);
    expect(answeredCount(roundItems(rounds, []))).toBe(0);
    expect(
      answeredCount(
        roundItems(rounds, [
          entry("round-001", "a"),
          entry("round-002", "none"),
          entry("round-004", "mix"),
        ]),
      ),
    ).toBe(3);
  });

  it("finds prev and next, unset at the ends", () => {
    const items = roundItems(rounds, entries);
    const ids = (id: string | undefined) => {
      const n = neighbors(items, id);
      return [n.prev?.id, n.next?.id];
    };
    expect(ids("round-001")).toEqual([undefined, "round-002"]);
    expect(ids("round-002")).toEqual(["round-001", "round-003"]);
    expect(ids("round-003")).toEqual(["round-002", "round-004"]);
    expect(ids("round-004")).toEqual(["round-003", undefined]);
    expect(ids("round-999")).toEqual([undefined, undefined]);
    expect(ids(undefined)).toEqual([undefined, undefined]);
    expect(neighbors(roundItems([ok("only")], []), "only")).toEqual({
      prev: undefined,
      next: undefined,
    });
  });

  it("steps back to the last round when every round is answered", () => {
    const items = roundItems(rounds, entries);
    const all = stepTargets(items, { page: "current" }, undefined);
    expect([all.prev?.id, all.next?.id]).toEqual(["round-004", undefined]);
    const unknown = stepTargets(items, { page: "round", id: "x" }, undefined);
    expect(unknown).toEqual({});
    const first = stepTargets(items, { page: "current" }, "round-001");
    expect([first.prev?.id, first.next?.id]).toEqual([undefined, "round-002"]);
  });

  it("maps routes to pages", () => {
    const cases: [Route, string][] = [
      [{ page: "current" }, "compare"],
      [{ page: "round", id: "x" }, "compare"],
      [{ page: "library" }, "library"],
      [{ page: "library-entry", name: "x" }, "library"],
      [{ page: "theme" }, "theme"],
      [{ page: "history" }, "history"],
    ];
    for (const [r, p] of cases) expect(pageOf(r)).toBe(p);
  });
});

describe("AppHeader markup", () => {
  const render = (route: Route, shown: LoadedRound | undefined, rs = rounds) =>
    renderToStaticMarkup(
      <TooltipProvider>
        <AppHeader
          labName="acme"
          route={route}
          rounds={rs}
          entries={entries}
          shown={shown}
          theme="dark"
          onToggleTheme={() => {}}
        />
      </TooltipProvider>,
    );
  const button = (html: string, label: string) =>
    html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ??
    "";

  it("shows the round crumb, question and answered count on Compare", () => {
    const html = render({ page: "current" }, rounds[1]);
    expect(html).toContain(">taste-lab<");
    expect(html).toContain(">acme<");
    expect(html).toMatch(/aria-haspopup="menu"[^>]*>round-002/);
    expect(html).toContain("Question round-002?");
    expect(html).toContain("1 of 4 answered");
    expect(html).toMatch(
      /<div[^>]*data-slot="progress"[^>]*aria-hidden="true"/,
    );
    expect(button(html, "Previous round")).not.toContain('disabled=""');
    expect(button(html, "Next round")).not.toContain('disabled=""');
  });

  it("disables prev on the first round and next on the last", () => {
    const first = render({ page: "round", id: "round-001" }, rounds[0]);
    expect(button(first, "Previous round")).toContain('disabled=""');
    expect(button(first, "Next round")).not.toContain('disabled=""');
    expect(first).toContain("pick b");
    const last = render({ page: "round", id: "round-004" }, rounds[3]);
    expect(button(last, "Previous round")).not.toContain('disabled=""');
    expect(button(last, "Next round")).toContain('disabled=""');
  });

  it("badges an error round and names an unknown one", () => {
    const err = render({ page: "round", id: "round-003" }, rounds[2]);
    expect(err).toMatch(/data-slot="badge"[^>]*>error</);
    expect(err).toContain("This round could not be loaded.");
    const unknown = render({ page: "round", id: "round-999" }, undefined);
    expect(unknown).toMatch(/aria-haspopup="menu"[^>]*>round-999/);
    expect(unknown).toContain("No round called round-999.");
    expect(button(unknown, "Previous round")).toContain('disabled=""');
    expect(button(unknown, "Next round")).toContain('disabled=""');
  });

  it("marks the active page for assistive tech", () => {
    const html = render({ page: "round", id: "round-001" }, rounds[0]);
    expect(button(html, "Compare")).toContain('aria-checked="true"');
    expect(button(html, "Compare")).toContain('aria-current="page"');
    expect(button(html, "History")).toContain('aria-checked="false"');
    expect(button(html, "History")).not.toContain("aria-current");
  });

  it("hides the round tier and names the page elsewhere", () => {
    for (const [route, label] of [
      [{ page: "library" }, "Library"],
      [{ page: "theme" }, "Theme"],
      [{ page: "history" }, "History"],
    ] as [Route, string][]) {
      const html = render(route, undefined);
      expect(html).not.toContain("Previous round");
      expect(html).not.toContain("answered");
      expect(html).not.toContain('aria-haspopup="menu"');
      expect(html).toMatch(
        new RegExp(`aria-current="page"[^>]*>${label}</span>`),
      );
      expect(button(html, label)).toContain('aria-checked="true"');
    }
    const entryPage = render(
      { page: "library-entry", name: "task-card" },
      undefined,
    );
    expect(entryPage).toContain('href="#/library"');
    expect(entryPage).toContain("task-card");
    expect(button(entryPage, "Library")).toContain('aria-checked="true"');
  });

  it("says all answered and enables prev only when no round is open", () => {
    const html = render({ page: "current" }, undefined);
    expect(html).toMatch(/aria-haspopup="menu"[^>]*>all answered/);
    expect(html).toContain("All rounds answered.");
    expect(button(html, "Previous round")).not.toContain('disabled=""');
    expect(button(html, "Next round")).toContain('disabled=""');
  });

  it("hides the tier when there are no rounds", () => {
    const html = render({ page: "current" }, undefined, []);
    expect(html).toMatch(/aria-haspopup="menu"[^>]*>no rounds/);
    expect(html).not.toContain("Previous round");
  });
});
