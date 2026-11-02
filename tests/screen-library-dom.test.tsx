// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import {
  DEFAULT_PREFS,
  read,
  setCanvasPrefs,
} from "../src/components/library/prefs";
import type { LibraryEntry, LibraryKind } from "../src/lib/library";

import { click, mount, one, press, unmountAll } from "./dom";

function Probe() {
  return <p>Live example</p>;
}

function entry(
  name: string,
  kind?: LibraryKind,
  uses?: string[],
): LibraryEntry {
  return {
    ok: true,
    name,
    meta: {
      name,
      title: name,
      description: name,
      status: "draft",
      ...(kind ? { kind } : {}),
      uses,
      examples: [
        { export: "Default", title: "Default", width: "column" },
        { export: "Compact", title: "Compact", width: "column" },
      ],
      provenance: [],
      rules: [],
    },
    loadComponent: async () => ({
      [name
        .split("-")
        .map((x) => x[0]?.toUpperCase() + x.slice(1))
        .join("")]: Probe,
    }),
    loadExamples: async () => ({ Default: Probe, Compact: Probe }),
  };
}
const entries = () => [
  entry("a-screen", "screen", ["task-card", "missing", "broken"]),
  entry("task-card"),
  { ok: false, name: "broken", errors: ["bad kind"] } as LibraryEntry,
];

// Exercise the production router, including entry through the Library index.
function Routed({ items }: { items: LibraryEntry[] }) {
  return <App rounds={[]} library={items} />;
}
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response(JSON.stringify({ entries: [], skipped: 0 })),
    ),
  );
});
async function route(hash: string) {
  await act(async () => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}
async function follow(anchor: HTMLAnchorElement) {
  await click(anchor);
  await route(anchor.hash);
}
async function category(host: HTMLElement, value: string) {
  await act(async () =>
    one(
      host,
      `[role="tab"][data-state][value="${value}"], [role="tab"][id$="trigger-${value}"]`,
    ).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 })),
  );
}
afterEach(async () => {
  await unmountAll();
  setCanvasPrefs({ ...DEFAULT_PREFS });
  vi.unstubAllGlobals();
});

describe("production screen browsing through App hash routes", () => {
  it.each(["#/library", "#/library/a-screen/Compact"])(
    "inspects and returns to the exact named example from %s",
    async (start) => {
      await route(start);
      const host = await mount(<Routed items={entries()} />);
      if (start === "#/library")
        await follow(
          one<HTMLAnchorElement>(host, 'a[href="#/library/a-screen/Compact"]'),
        );
      expect(host.textContent).toContain("a-screen / Compact");
      expect(
        one(host, '[aria-label="Library category"] [aria-selected="true"]')
          .textContent,
      ).toBe("Screens");
      const content = one(host, '[data-testid="screen-content"]');
      expect(content.className).toBe("w-full");
      expect(content.getAttribute("style")).toBeNull();
      expect(host.querySelector('[aria-label="Canvas width"]')).toBeNull();
      expect(host.textContent).toContain("missing unavailable");
      expect(host.textContent).toContain("broken unavailable");
      await follow(
        one<HTMLAnchorElement>(host, '[aria-label="Used components"] a'),
      );
      expect(host.textContent).toContain("task-card / Default");
      expect(host.querySelector('[aria-label="Canvas width"]')).not.toBeNull();
      const back = [...host.querySelectorAll<HTMLAnchorElement>("a")].find(
        (a) => a.textContent === "Back to screen",
      );
      expect(back?.hash).toBe("#/library/a-screen/Compact");
      if (!back) throw new Error("No return action");
      await follow(back);
      expect(host.textContent).toContain("a-screen / Compact");
      // Use real browser history, not prop rerenders, for the return route.
      await act(async () => {
        const changed = new Promise<void>((resolve) =>
          window.addEventListener("hashchange", () => resolve(), {
            once: true,
          }),
        );
        history.back();
        await changed;
      });
      expect(host.textContent).toContain("task-card / Default");
      await act(async () => {
        const changed = new Promise<void>((resolve) =>
          window.addEventListener("hashchange", () => resolve(), {
            once: true,
          }),
        );
        history.back();
        await changed;
      });
      expect(host.textContent).toContain("a-screen / Compact");
    },
  );
  it("selects direct component routes and keeps unknown broken entries reachable in both tabs", async () => {
    await route("#/library/task-card/Compact");
    const host = await mount(<Routed items={entries()} />);
    expect(
      one(host, '[aria-label="Library category"] [aria-selected="true"]')
        .textContent,
    ).toBe("Components");
    expect(host.querySelector('a[href="#/library/broken"]')).not.toBeNull();
    await category(host, "screen");
    await route(location.hash);
    expect(host.textContent).toContain("a-screen / Default");
    expect(host.querySelector('a[href="#/library/broken"]')).not.toBeNull();
    expect(
      host.querySelector('a[href="#/library/task-card/Compact"]'),
    ).toBeNull();
  });
  it("keeps Screens selected when its only target is an unknown broken entry", async () => {
    await route("#/library/task-card");
    const host = await mount(
      <Routed items={entries().filter((e) => e.name !== "a-screen")} />,
    );
    await category(host, "screen");
    await route(location.hash);
    expect(location.hash).toBe("#/library/broken");
    expect(
      one(host, '[aria-label="Library category"] [aria-selected="true"]')
        .textContent,
    ).toBe("Screens");
    expect(one(host, '[role="alert"]').textContent).toContain("bad kind");
    expect(host.querySelector('a[href="#/library/broken"]')).not.toBeNull();
    expect(host.querySelector('a[href="#/library/task-card"]')).toBeNull();
    await category(host, "component");
    await route(location.hash);
    expect(host.querySelector('a[href="#/library/broken"]')).not.toBeNull();
  });
  it("keeps the current category when a broken row is opened after a direct screen route", async () => {
    await route("#/library/task-card");
    const host = await mount(<Routed items={entries()} />);
    await route("#/library/a-screen/Compact");
    await follow(one<HTMLAnchorElement>(host, 'a[href="#/library/broken"]'));
    expect(
      one(host, '[aria-label="Library category"] [aria-selected="true"]')
        .textContent,
    ).toBe("Screens");
    expect(one(host, '[role="alert"]').textContent).toContain("bad kind");
    expect(host.querySelector('a[href="#/library/task-card"]')).toBeNull();
  });
  it.each(["#/library", "#/library/task-card"])(
    "keeps tab focus through consecutive keyboard category routes from %s",
    async (start) => {
      await route(start);
      const host = await mount(
        <Routed items={[entry("task-card"), entry("a-screen", "screen")]} />,
      );
      await act(async () => {
        one(host, '[role="tab"][id$="trigger-component"]').focus();
      });
      for (const [key, hash, label] of [
        ["ArrowLeft", "#/library/a-screen", "Screens"],
        ["ArrowRight", "#/library/task-card", "Components"],
      ]) {
        // Dispatch to the actual focused element, without refocusing after navigation.
        await press(document.activeElement ?? document.body, key);
        await act(async () => {
          await vi.waitFor(() => expect(location.hash).toBe(hash));
        });
        await route(location.hash);
        const selected = one(
          host,
          '[aria-label="Library category"] [aria-selected="true"]',
        );
        expect(selected.textContent).toBe(label);
        expect(document.activeElement).toBe(selected);
      }
    },
  );
  it("keeps failed imports and missing exports local to authored references", async () => {
    const screen = entry("screen", "screen", [
      "missing-export",
      "failed-import",
    ]);
    const missing = entry("missing-export");
    const failed = entry("failed-import");
    if (!missing.ok || !failed.ok) throw new Error("fixture");
    missing.loadComponent = async () => ({});
    failed.loadExamples = async () => {
      throw new Error("Cannot import file");
    };
    await route("#/library/screen");
    const host = await mount(<Routed items={[screen, missing, failed]} />);
    const area = one(host, '[aria-label="Used components"]');
    expect(area.textContent).toContain("missing-export unavailable");
    expect(area.textContent).toContain("failed-import unavailable");
    expect(area.querySelector("a")).toBeNull();
    expect(host.textContent).toContain("Live example");
  });
  it("keeps categories and nested examples usable in the mobile sheet", async () => {
    vi.stubGlobal("innerWidth", 500);
    await route("#/library/a-screen/Compact");
    const host = await mount(<Routed items={entries()} />);
    await click(one(host, '[aria-label="Toggle entry sidebar"]'));
    expect(
      document.body.querySelector('[aria-label="Library category"]'),
    ).not.toBeNull();
    await category(document.body, "component");
    await route(location.hash);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.getAttribute("data-scroll-locked")).toBeNull();
    const trigger = one(host, '[aria-label="Toggle entry sidebar"]');
    await act(async () => trigger.focus());
    expect(document.activeElement).toBe(trigger);
    await click(trigger);
    await follow(
      one<HTMLAnchorElement>(
        document.body,
        'a[href="#/library/task-card/Compact"]',
      ),
    );
    expect(host.textContent).toContain("task-card / Compact");
    expect(
      document.body.querySelector(
        '[aria-label="Library entries and examples"]',
      ),
    ).toBeNull();
    await route("#/library/a-screen/Default");
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.getAttribute("data-scroll-locked")).toBeNull();
  });
  it("preserves screen args and shared panel/sidebar preferences across category routes", async () => {
    const screen = entry("a-screen", "screen");
    if (!screen.ok) throw new Error("fixture");
    screen.meta.controls = [{ prop: "compact", kind: "boolean" }];
    const compact = screen.meta.examples.find((x) => x.export === "Compact");
    if (compact) compact.args = { compact: true };
    setCanvasPrefs({
      controls: "collapsed",
      controlsHeight: 260,
      sidebar: false,
      mode: "dark",
      surface: "muted",
    });
    await route("#/library/a-screen/Compact");
    const host = await mount(<Routed items={[screen, entry("task-card")]} />);
    expect(one(host, '[role="checkbox"]').getAttribute("aria-checked")).toBe(
      "true",
    );
    await route("#/library/task-card/Compact");
    expect(one(host, '[data-testid="component-content"]').className).toContain(
      "w-105",
    );
    await route("#/library/a-screen/Compact");
    expect(one(host, '[role="checkbox"]').getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(one(host, "[data-controls]").getAttribute("data-controls")).toBe(
      "collapsed",
    );
    expect(read()).toEqual(
      expect.objectContaining({
        controls: "collapsed",
        controlsHeight: 260,
        sidebar: false,
        mode: "dark",
        surface: "muted",
      }),
    );
  });
  it("shows an empty Components category for a screen-only library", async () => {
    await route("#/library/a-screen");
    const host = await mount(<Routed items={[entry("a-screen", "screen")]} />);
    await category(host, "component");
    expect(host.textContent).toContain("No components yet.");
  });
  it("shows a scoped empty category without removing the tabs", async () => {
    await route("#/library/task-card");
    const host = await mount(<Routed items={[entry("task-card")]} />);
    await category(host, "screen");
    expect(host.textContent).toContain("No screens yet.");
    expect(
      host.querySelector('[aria-label="Library category"]'),
    ).not.toBeNull();
  });
});
