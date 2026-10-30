// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { LibraryPage } from "../src/components/LibraryView";
import {
  DEFAULT_PREFS,
  read,
  reloadCanvasPrefs,
  setCanvasPrefs,
} from "../src/components/library/prefs";
import { type LibraryGlob, loadLibrary } from "../src/lib/library";
import type { ControlValues } from "../src/lib/library-controls";
import { click, mount, one, settle, unmountAll } from "./dom";

const sample = resolve(import.meta.dirname, "fixtures/library/task-chip");
const KEY = "taste-lab-canvas";

function Probe(props: ControlValues) {
  return <output data-testid="props">{JSON.stringify(props)}</output>;
}

/** One entry, with or without controls. */
function entries(withControls = true) {
  const m = JSON.parse(readFileSync(join(sample, "meta.json"), "utf8"));
  if (withControls) {
    m.controls = [
      { prop: "dense", kind: "boolean" },
      { prop: "title", kind: "text" },
    ];
  }
  const input: LibraryGlob = {
    json: { "/x/library/task-chip/meta.json": JSON.stringify(m) },
    modules: {
      "/x/library/task-chip/TaskChip.tsx": async () => ({ TaskChip: Probe }),
      "/x/library/task-chip/examples.tsx": async () => ({
        Default: Probe,
        Compact: Probe,
      }),
    },
  };
  return loadLibrary(input);
}

beforeEach(() => {
  localStorage.clear();
  reloadCanvasPrefs();
});

afterEach(async () => {
  await unmountAll();
  setCanvasPrefs({ ...DEFAULT_PREFS });
  localStorage.clear();
  location.hash = "";
  vi.unstubAllGlobals();
});

describe("full-bleed routing", () => {
  async function app(hash: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ entries: [], skipped: 0 }), {
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    location.hash = hash;
    const host = await mount(<App rounds={[]} library={entries()} />);
    await settle();
    const root = one(host, "[data-layout]");
    return { root, main: one(root, "main") };
  }

  for (const hash of [
    "#/library",
    "#/library/task-chip",
    "#/library/task-chip/Compact",
  ]) {
    it(`fills the viewport under the header on ${hash}`, async () => {
      const { root, main } = await app(hash);
      expect(root.dataset.layout).toBe("library");
      expect(root.className).toContain("h-svh");
      expect(root.className).toContain("overflow-hidden");
      // No centred container, padding or closing rule around the page.
      expect(main.className).not.toMatch(/max-w-|mx-auto|px-4|py-6/);
      expect(main.className).toContain("flex-1");
      expect(main.nextElementSibling).toBeNull();
      // The sidebar sits in the page, flush left, not over the header.
      expect(one(main, '[data-slot="sidebar-wrapper"]').className).toContain(
        "relative",
      );
      expect(main.querySelector('[data-slot="sidebar"]')).not.toBeNull();
    });
  }

  it("keeps the centred, padded layout on other pages", async () => {
    for (const hash of ["#/history", "#/theme"]) {
      const { root, main } = await app(hash);
      expect(root.dataset.layout).toBe("page");
      expect(root.className).toContain("min-h-svh");
      expect(main.className).toContain("max-w-[120rem]");
      expect(main.className).toContain("px-4");
      await unmountAll();
    }
  });
});

describe("Controls panel states", () => {
  async function setup(withControls = true) {
    const host = await mount(
      <LibraryPage entries={entries(withControls)} light={{}} />,
    );
    await settle();
    const split = () => one(host, "[data-controls]");
    const button = (label: string) =>
      one(host, `button[aria-label="${label}"]`);
    const body = () =>
      one(host, 'section[aria-label="Controls"] > div:last-child');
    const canvas = () => one(host, '[data-slot="resizable-panel"]#canvas');
    return { host, split, button, body, canvas };
  }

  it("starts open, with a labelled, keyboard-focusable drag handle", async () => {
    const { host, split, button, body } = await setup();
    expect(split().dataset.controls).toBe("open");
    expect(body().hasAttribute("inert")).toBe(false);
    button("Collapse controls");
    button("Expand controls to full");
    const handle = one(
      host,
      '[role="separator"][aria-label="Resize controls"]',
    );
    expect(handle.getAttribute("tabindex")).toBe("0");
    expect(handle.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("collapses to the header bar and expands again", async () => {
    const { split, button, body } = await setup();
    await click(button("Collapse controls"));
    expect(split().dataset.controls).toBe("collapsed");
    expect(body().hasAttribute("inert")).toBe(true);
    expect(read().controls).toBe("collapsed");

    await click(button("Expand controls"));
    expect(split().dataset.controls).toBe("open");
    expect(body().hasAttribute("inert")).toBe(false);
    expect(read().controls).toBe("open");
  });

  it("expands to full, hiding the canvas, and restores", async () => {
    const { split, button, canvas } = await setup();
    await click(button("Expand controls to full"));
    expect(split().dataset.controls).toBe("full");
    expect(canvas().hasAttribute("inert")).toBe(true);
    expect(read().controls).toBe("full");

    await click(button("Restore controls"));
    expect(split().dataset.controls).toBe("open");
    expect(canvas().hasAttribute("inert")).toBe(false);
  });

  it("shows no bottom panel for an entry without controls", async () => {
    const { host } = await setup(false);
    expect(host.querySelector("[data-controls]")).toBeNull();
    expect(host.querySelector('[role="separator"]')).toBeNull();
    expect(host.querySelector('section[aria-label="Controls"]')).toBeNull();
    // The canvas still renders, under the bar with the sidebar trigger.
    one(host, '[data-testid="library-canvas"]');
    one(host, 'button[aria-label="Toggle entry sidebar"]');
  });

  it("toggles the sidebar with its labelled trigger and keeps it in prefs", async () => {
    const { host, button } = await setup();
    const sidebar = () => one(host, '[data-slot="sidebar"]');
    expect(sidebar().dataset.state).toBe("expanded");
    await click(button("Toggle entry sidebar"));
    expect(sidebar().dataset.state).toBe("collapsed");
    expect(read().sidebar).toBe(false);
  });
});

describe("panel prefs persistence", () => {
  it("writes state, height and sidebar to storage", () => {
    setCanvasPrefs({
      controls: "collapsed",
      controlsHeight: 312,
      sidebar: false,
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toMatchObject({
      controls: "collapsed",
      controlsHeight: 312,
      sidebar: false,
    });
  });

  it("restores the saved state after a reload", async () => {
    setCanvasPrefs({ controls: "full", controlsHeight: 280, sidebar: false });
    reloadCanvasPrefs();
    const host = await mount(<LibraryPage entries={entries()} light={{}} />);
    await settle();
    expect(one(host, "[data-controls]").dataset.controls).toBe("full");
    expect(one(host, "#canvas").hasAttribute("inert")).toBe(true);
    expect(one(host, '[data-slot="sidebar"]').dataset.state).toBe("collapsed");
    one(host, 'button[aria-label="Restore controls"]');
  });

  it("restores a collapsed panel after a reload", async () => {
    localStorage.setItem(KEY, JSON.stringify({ controls: "collapsed" }));
    reloadCanvasPrefs();
    const host = await mount(<LibraryPage entries={entries()} light={{}} />);
    await settle();
    expect(one(host, "[data-controls]").dataset.controls).toBe("collapsed");
    one(host, 'button[aria-label="Expand controls"]');
  });

  it("falls back to defaults for bad stored values", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ controls: "huge", controlsHeight: -4, sidebar: "no" }),
    );
    expect(read()).toEqual(DEFAULT_PREFS);
    localStorage.setItem(KEY, JSON.stringify({ controlsHeight: "300" }));
    expect(read().controlsHeight).toBeUndefined();
    localStorage.setItem(KEY, "{ not json");
    expect(read()).toEqual(DEFAULT_PREFS);
    localStorage.setItem(KEY, JSON.stringify({ controlsHeight: 300.6 }));
    expect(read().controlsHeight).toBe(301);
  });
});
