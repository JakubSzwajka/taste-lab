import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "../src/components/AppHeader";
import { TooltipProvider } from "../src/components/ui/tooltip";
import {
  answeredCount,
  idleNotice,
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

  it("uses roomy tiers and plain medium icons from round-016 b", () => {
    const html = render({ page: "current" }, rounds[1]);
    expect(html).toContain("h-16 items-center gap-4 px-8");
    expect(html).toContain("h-12 items-center gap-4 px-8");
    for (const label of ["Compare", "Library", "Theme", "History"]) {
      expect(button(html, label)).toContain("h-11 min-w-12");
    }
    for (const name of [
      "gallery-horizontal",
      "library",
      "paintbrush",
      "scroll-text",
      "circle-arrow-left",
      "circle-arrow-right",
      "sun",
    ]) {
      expect(html).toContain(`lucide-${name}`);
    }
    // The logo mark has its own stroke and size (round-017 a).
    const icons = (html.match(/<svg[^>]*>/g) ?? []).filter(
      (svg) => !svg.includes("lucide-flask"),
    );
    expect(icons.length).toBeGreaterThan(6);
    for (const icon of icons) {
      expect(icon).toContain('stroke-width="1.75"');
      expect(icon).toContain("size-5");
    }
  });

  it("shows round id and component, not the question, on Compare (round-019 d)", () => {
    const html = render({ page: "current" }, rounds[1]);
    expect(html).toContain('data-slot="logo"');
    expect(html).toMatch(/taste<span[^>]*>\.<\/span>lab/);
    // The logo goes home: the next open round, or the idle page.
    expect(html).toMatch(
      /<a[^>]*aria-label="taste.lab home"[^>]*href="#\/"|<a[^>]*href="#\/"[^>]*aria-label="taste.lab home"/,
    );
    expect(html).toContain(">acme<");
    expect(html).toMatch(/aria-haspopup="menu"[^>]*><span[^>]*>round-002/);
    expect(html).not.toContain("Question round-002?");
    expect(html).toContain('title="round-002 · card"');
    expect(html).toMatch(/class="font-mono">round-002<\/span>/);
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
    expect(unknown).toMatch(/aria-haspopup="menu"[^>]*><span[^>]*>round-999/);
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
    const html = render({ page: "current" }, undefined, [
      ok("round-001"),
      ok("round-002"),
    ]);
    expect(html).toMatch(/aria-haspopup="menu"[^>]*><span[^>]*>all answered/);
    expect(html).toContain("All rounds answered.");
    expect(button(html, "Previous round")).not.toContain('disabled=""');
    expect(button(html, "Next round")).toContain('disabled=""');
  });

  it("does not call broken-only rounds all answered", () => {
    const html = render({ page: "current" }, undefined, [broken("round-001")]);
    expect(html).not.toContain("All rounds answered.");
    expect(html).not.toContain("all answered");
    expect(html).toContain("No round to answer: 1 could not be loaded.");
    expect(html).toContain("0 of 1 answered");
    expect(html).toMatch(/aria-haspopup="menu"[^>]*><span[^>]*>none open/);
  });

  it("keeps the all answered text when nothing is broken", () => {
    expect(idleNotice(roundItems([ok("a")], [entry("a", "a")])).message).toBe(
      "All rounds answered.",
    );
    expect(idleNotice(roundItems(rounds, entries)).message).toBe(
      "No round to answer: 1 could not be loaded.",
    );
  });

  it("bounds and truncates long crumbs, with the full text in a title", () => {
    const name = "a-very-long-lab-name-".repeat(3).slice(0, 60);
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <AppHeader
          labName={name}
          route={{ page: "current" }}
          rounds={rounds}
          entries={entries}
          shown={rounds[1]}
          theme="dark"
          onToggleTheme={() => {}}
        />
      </TooltipProvider>,
    );
    expect(html).toMatch(
      new RegExp(`<a[^>]*class="[^"]*\\btruncate\\b[^"]*"[^>]*title="${name}"`),
    );
    expect(html).toMatch(/<a[^>]*class="[^"]*\bmax-w-40\b/);
    expect(html).toMatch(/<li[^>]*class="[^"]*\bhidden\b[^"]*\bsm:inline-flex/);
    expect(html).toMatch(
      /<p[^>]*class="[^"]*\btruncate\b[^>]*title="round-002 · card"/,
    );
    const lib = render(
      { page: "library-entry", name: "x".repeat(60) },
      undefined,
    );
    expect(lib).toMatch(/<span[^>]*\btruncate\b[^>]*title="x{60}"/);
  });

  it("hides the tier when there are no rounds", () => {
    const html = render({ page: "current" }, undefined, []);
    expect(html).toMatch(/aria-haspopup="menu"[^>]*><span[^>]*>no rounds/);
    expect(html).not.toContain("Previous round");
  });
});

// No DOM env in this repo. Call the handlers the header builds, on the element
// tree, with a stubbed location. Opening the Radix menu and real keyboard
// events stay untested here.
type El = ReactElement<{ children?: ReactNode } & Record<string, unknown>>;

/** Expand only the header's own function components, then collect all elements. */
function flatten(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    for (const n of node) flatten(n, out);
    return out;
  }
  if (node === null || typeof node !== "object" || !("props" in node))
    return out;
  const el = node as El;
  out.push(el);
  const type = el.type as unknown;
  if (typeof type === "function") {
    const name = (type as { name: string }).name;
    if (["RoundTier", "RoundMenu", "PageCrumbs"].includes(name)) {
      flatten((type as (p: unknown) => ReactNode)(el.props), out);
    }
  }
  flatten(el.props.children, out);
  return out;
}

describe("AppHeader interaction", () => {
  afterEach(() => vi.unstubAllGlobals());

  const tree = (route: Route, shown: LoadedRound | undefined) => {
    const header = AppHeader({
      labName: "acme",
      route,
      rounds,
      entries,
      shown,
      theme: "dark",
      onToggleTheme: () => {},
    }) as ReactNode;
    return flatten(header);
  };
  const click = (els: El[], label: string) => {
    const el = els.find((e) => e.props["aria-label"] === label);
    expect(el, label).toBeDefined();
    if (el) (el.props.onClick as () => void)();
  };
  const stubLocation = () => {
    const loc = { hash: "#/" };
    vi.stubGlobal("location", loc);
    return loc;
  };

  it("sets the hash when a page item is clicked", () => {
    const loc = stubLocation();
    const els = tree({ page: "current" }, rounds[1]);
    for (const [label, hash] of [
      ["Library", "#/library"],
      ["Theme", "#/theme"],
      ["History", "#/history"],
      ["Compare", "#/"],
    ]) {
      click(els, label as string);
      expect(loc.hash).toBe(hash);
    }
  });

  it("sets the hash to the neighbouring round on prev and next", () => {
    const loc = stubLocation();
    const els = tree({ page: "round", id: "round-002" }, rounds[1]);
    click(els, "Previous round");
    expect(loc.hash).toBe("#/round/round-001");
    click(els, "Next round");
    expect(loc.hash).toBe("#/round/round-003");
  });

  it("steps back to the last round from the all-answered page", () => {
    const loc = stubLocation();
    click(tree({ page: "current" }, undefined), "Previous round");
    expect(loc.hash).toBe("#/round/round-004");
  });

  it("links each menu item to its own round", () => {
    const links = tree({ page: "current" }, rounds[1]).filter(
      (e) => e.type === "a" && String(e.props.href).startsWith("#/round/"),
    );
    expect(links.map((l) => l.props.href)).toEqual(
      rounds.map((r) => `#/round/${r.id}`),
    );
    expect(links.map((l) => l.props["aria-current"])).toEqual([
      undefined,
      "page",
      undefined,
      undefined,
    ]);
  });
});
