// @vitest-environment happy-dom
// Panel sizes on the Library page, measured. happy-dom has no layout, so this
// file fakes the one thing react-resizable-panels measures: the group height.
// Each panel reports an equal share of it (their sum is all the library reads),
// children stack in DOM order, the group's box is that height, and a fake ResizeObserver lets a test grow
// or shrink it. Sizes are then read back from the flex-grow the library sets.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LibraryPage } from "../src/components/LibraryView";
import { CONTROLS_HEADER_PX } from "../src/components/library/LibraryControls";
import {
  DEFAULT_PREFS,
  read,
  reloadCanvasPrefs,
  setCanvasPrefs,
} from "../src/components/library/prefs";
import { type LibraryGlob, loadLibrary } from "../src/lib/library";
import type { ControlValues } from "../src/lib/library-controls";
import { click, mount, one, press, settle, unmountAll } from "./dom";

const sample = resolve(import.meta.dirname, "fixtures/library/task-chip");
const KEY = "taste-lab-canvas";
/** The faked height of the Controls table, so "fit" has a size to fit. */
const BODY_PX = 120;
const FIT_PX = CONTROLS_HEADER_PX + BODY_PX;

function Probe(props: ControlValues) {
  return <output data-testid="props">{JSON.stringify(props)}</output>;
}

/** Two entries with controls: task-chip and other-chip. */
function entries() {
  const base = JSON.parse(readFileSync(join(sample, "meta.json"), "utf8"));
  const controls = [
    { prop: "dense", kind: "boolean" },
    { prop: "title", kind: "text" },
  ];
  const other = {
    ...base,
    name: "other-chip",
    title: "Other chip",
    examples: [{ export: "Default", title: "Other default", width: "full" }],
  };
  const input: LibraryGlob = {
    json: {
      "/x/library/task-chip/meta.json": JSON.stringify({ ...base, controls }),
      "/x/library/other-chip/meta.json": JSON.stringify({ ...other, controls }),
    },
    modules: {
      "/x/library/task-chip/TaskChip.tsx": async () => ({ TaskChip: Probe }),
      "/x/library/task-chip/examples.tsx": async () => ({
        Default: Probe,
        Compact: Probe,
      }),
      "/x/library/other-chip/OtherChip.tsx": async () => ({ OtherChip: Probe }),
      "/x/library/other-chip/examples.tsx": async () => ({ Default: Probe }),
    },
  };
  return loadLibrary(input);
}

// ---- fake layout ----------------------------------------------------------

let groupPx = 900;
const observers = new Set<FakeResizeObserver>();

class FakeResizeObserver {
  targets = new Set<Element>();
  constructor(private cb: ResizeObserverCallback) {
    observers.add(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }
  fire() {
    const entries = [...this.targets].map((target) => {
      const box = { blockSize: groupPx, inlineSize: 1000 };
      return {
        target,
        borderBoxSize: [box],
        contentBoxSize: [box],
        devicePixelContentBoxSize: [box],
        contentRect: target.getBoundingClientRect(),
      } as unknown as ResizeObserverEntry;
    });
    if (entries.length > 0) this.cb(entries, this as unknown as ResizeObserver);
  }
}

/** Grows or shrinks the main area, as a window resize does. */
async function resizeTo(px: number) {
  await act(async () => {
    groupPx = px;
    for (const o of [...observers]) o.fire();
  });
}

const saved: [object, string, PropertyDescriptor | undefined][] = [];
function fake(proto: object, name: string, desc: PropertyDescriptor) {
  saved.push([proto, name, Object.getOwnPropertyDescriptor(proto, name)]);
  Object.defineProperty(proto, name, { configurable: true, ...desc });
}

function fakeLayout() {
  const win = document.defaultView as object;
  fake(win, "ResizeObserver", { value: FakeResizeObserver, writable: true });
  const isBody = (el: Element) =>
    el.parentElement?.matches('section[aria-label="Controls"]') === true &&
    el === el.parentElement.lastElementChild;
  const isTable = (el: Element) =>
    el.parentElement !== null && isBody(el.parentElement);
  /** The rendered controls panel, from the flex-grow the library set. */
  const controlsPx = (el: Element) => {
    const panel = el.closest("[data-group] > #controls") as HTMLElement | null;
    const grow = Number.parseFloat(panel?.style.flexGrow ?? "");
    return Number.isFinite(grow) ? (grow / 100) * groupPx : 0;
  };
  fake(HTMLElement.prototype, "offsetHeight", {
    get(this: HTMLElement) {
      if (isTable(this)) return BODY_PX;
      if (!this.hasAttribute("data-panel")) return 0;
      const n = this.parentElement?.querySelectorAll(":scope > [data-panel]");
      return groupPx / (n?.length || 1);
    },
  });
  // The library orders a group's children by offsetTop, then offsetHeight.
  fake(HTMLElement.prototype, "offsetTop", {
    get(this: HTMLElement) {
      if (!this.parentElement?.hasAttribute("data-group")) return 0;
      let top = 0;
      for (
        let el = this.previousElementSibling;
        el;
        el = el.previousElementSibling
      ) {
        top += (el as HTMLElement).offsetHeight;
      }
      return top;
    },
  });
  // As in a browser: a scroll box's scrollHeight is never under its own
  // height, so a body in a tall panel reports the panel, not the table.
  fake(Element.prototype, "scrollHeight", {
    get(this: Element) {
      if (!isBody(this)) return 0;
      return Math.max(BODY_PX, controlsPx(this) - CONTROLS_HEADER_PX);
    },
  });
  const rect = Element.prototype.getBoundingClientRect;
  fake(Element.prototype, "getBoundingClientRect", {
    value(this: Element) {
      if (this.hasAttribute("data-group")) {
        return new DOMRect(0, 0, 1000, groupPx);
      }
      return rect.call(this);
    },
  });
}

function restoreLayout() {
  for (const [proto, name, desc] of saved.splice(0).reverse()) {
    if (desc) Object.defineProperty(proto, name, desc);
    else delete (proto as Record<string, unknown>)[name];
  }
  observers.clear();
}

// ---- page helpers ---------------------------------------------------------

async function page() {
  const host = await mount(<LibraryPage entries={entries()} light={{}} />);
  await settle();
  const panel = (id: string) => one(host, `[data-group] > #${id}`);
  /** Rendered px of each panel: the library's flex-grow share of the group. */
  const sizes = () => {
    const px = (id: string) =>
      Math.round((Number.parseFloat(panel(id).style.flexGrow) / 100) * groupPx);
    return { canvas: px("canvas"), controls: px("controls") };
  };
  const state = () => one(host, "[data-controls]").dataset.controls;
  const inert = () => ({
    canvas: panel("canvas").hasAttribute("inert"),
    body: one(
      host,
      'section[aria-label="Controls"] > div:last-child',
    ).hasAttribute("inert"),
  });
  const button = (label: string) => one(host, `button[aria-label="${label}"]`);
  const handle = () =>
    one(host, '[role="separator"][aria-label="Resize controls"]');
  const pick = (title: string) =>
    click(
      one(
        host,
        `nav[aria-label="Library entries and examples"] a[title="${title}"]`,
      ),
    );
  return { host, sizes, state, inert, button, handle, pick };
}

/** Shut canvas: the controls take the whole group and nothing else shows. */
function expectFull(p: Awaited<ReturnType<typeof page>>, px: number) {
  expect(p.state()).toBe("full");
  expect(p.sizes()).toEqual({ canvas: 0, controls: px });
  expect(p.inert().canvas).toBe(true);
  expect(read().controls).toBe("full");
}

function expectCollapsed(p: Awaited<ReturnType<typeof page>>, px: number) {
  expect(p.state()).toBe("collapsed");
  expect(p.sizes()).toEqual({
    canvas: px - CONTROLS_HEADER_PX,
    controls: CONTROLS_HEADER_PX,
  });
  expect(p.inert()).toEqual({ canvas: false, body: true });
  expect(read().controls).toBe("collapsed");
}

beforeEach(() => {
  groupPx = 900;
  fakeLayout();
  localStorage.clear();
  reloadCanvasPrefs();
});

afterEach(async () => {
  await unmountAll();
  restoreLayout();
  setCanvasPrefs({ ...DEFAULT_PREFS });
  localStorage.clear();
});

// ---- tests ----------------------------------------------------------------

describe("panel sizes", () => {
  it("opens fitted to the controls table", async () => {
    const p = await page();
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 900 - FIT_PX, controls: FIT_PX });
    expect(p.inert()).toEqual({ canvas: false, body: false });
  });

  it("full shuts the canvas and restore brings back the open height", async () => {
    const p = await page();
    await click(p.button("Expand controls to full"));
    expectFull(p, 900);
    await click(p.button("Restore controls"));
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 900 - FIT_PX, controls: FIT_PX });
  });

  it("collapse leaves only the header bar", async () => {
    const p = await page();
    await click(p.button("Collapse controls"));
    expectCollapsed(p, 900);
  });
});

describe("container resize", () => {
  it("keeps full shut when the main area grows and shrinks", async () => {
    const p = await page();
    await click(p.button("Expand controls to full"));
    expectFull(p, 900);
    await resizeTo(1400);
    expectFull(p, 1400);
    await resizeTo(500);
    expectFull(p, 500);
    await resizeTo(1200);
    expectFull(p, 1200);
    await resizeTo(160);
    expectFull(p, 160);
    await resizeTo(900);
    expectFull(p, 900);
  });

  it("keeps full shut on resize after a reload into full", async () => {
    setCanvasPrefs({ controls: "full", controlsHeight: 300 });
    reloadCanvasPrefs();
    const p = await page();
    expectFull(p, 900);
    await resizeTo(1300);
    expectFull(p, 1300);
    await resizeTo(400);
    expectFull(p, 400);
  });

  it("keeps collapsed at the header bar when the main area grows and shrinks", async () => {
    const p = await page();
    await click(p.button("Collapse controls"));
    await resizeTo(1400);
    expectCollapsed(p, 1400);
    await resizeTo(500);
    expectCollapsed(p, 500);
    await resizeTo(160);
    expectCollapsed(p, 160);
    await resizeTo(1100);
    expectCollapsed(p, 1100);
  });

  it("keeps the open panel's pixel height on resize", async () => {
    const p = await page();
    await resizeTo(1400);
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 1400 - FIT_PX, controls: FIT_PX });
    await resizeTo(600);
    expect(p.sizes()).toEqual({ canvas: 600 - FIT_PX, controls: FIT_PX });
    // A resize is not a height the operator chose.
    expect(read().controlsHeight).toBeUndefined();
  });

  it("fits the table on restore after a reload into full and a resize", async () => {
    setCanvasPrefs({ controls: "full" });
    reloadCanvasPrefs();
    const p = await page();
    await resizeTo(1300);
    expectFull(p, 1300);
    await click(p.button("Restore controls"));
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 1300 - FIT_PX, controls: FIT_PX });
  });

  it("restores to the open height after resizing in full", async () => {
    setCanvasPrefs({ controlsHeight: 300 });
    const p = await page();
    await click(p.button("Expand controls to full"));
    await resizeTo(1200);
    await click(p.button("Restore controls"));
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 900, controls: 300 });
  });
});

describe("divider resize", () => {
  it("arrow keys on the handle change and save the controls height", async () => {
    const p = await page();
    // The library moves the divider 5% of the group per key.
    await press(p.handle(), "ArrowUp");
    expect(p.state()).toBe("open");
    expect(p.sizes().controls).toBe(FIT_PX + 45);
    expect(read()).toMatchObject({ controls: "open", controlsHeight: 201 });
    await press(p.handle(), "ArrowUp");
    expect(p.sizes().controls).toBe(FIT_PX + 90);
    expect(read().controlsHeight).toBe(246);
    await press(p.handle(), "ArrowDown");
    expect(p.sizes().controls).toBe(FIT_PX + 45);
    expect(read().controlsHeight).toBe(201);
  });

  it("dragging below the minimum collapses to the header bar", async () => {
    const p = await page();
    // 156 px, then 111, then the 96 px minimum, then it snaps shut.
    await press(p.handle(), "ArrowDown");
    expect(p.sizes().controls).toBe(111);
    await press(p.handle(), "ArrowDown");
    expect(p.sizes().controls).toBe(96);
    expect(read()).toMatchObject({ controls: "open", controlsHeight: 96 });
    await press(p.handle(), "ArrowDown");
    expectCollapsed(p, 900);
    // Expanding again uses the open height, not the header bar.
    await click(p.button("Expand controls"));
    expect(p.sizes().controls).toBe(96);
  });

  it("moving the divider to the top goes full", async () => {
    const p = await page();
    await press(p.handle(), "Home");
    expectFull(p, 900);
  });
});

describe("prefs across reloads and entries", () => {
  it("restores the dragged height after a reload", async () => {
    const first = await page();
    await press(first.handle(), "ArrowUp");
    expect(read().controlsHeight).toBe(201);
    await unmountAll();

    reloadCanvasPrefs();
    const p = await page();
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 900 - 201, controls: 201 });
  });

  it("keeps the open height when switching entries and examples", async () => {
    setCanvasPrefs({ controlsHeight: 300 });
    const p = await page();
    expect(p.sizes()).toEqual({ canvas: 600, controls: 300 });
    await p.pick("Other default");
    one(p.host, "[data-group]");
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 600, controls: 300 });
    await p.pick("Compact density");
    expect(p.sizes()).toEqual({ canvas: 600, controls: 300 });
  });

  it("fits each entry again when no height was dragged", async () => {
    const p = await page();
    await p.pick("Other default");
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 900 - FIT_PX, controls: FIT_PX });
    expect(read().controlsHeight).toBeUndefined();
  });

  it("keeps collapsed when switching entries", async () => {
    const p = await page();
    await click(p.button("Collapse controls"));
    await p.pick("Other default");
    expectCollapsed(p, 900);
    await p.pick("Compact density");
    expectCollapsed(p, 900);
  });

  it("keeps full when switching entries, then resizing", async () => {
    const p = await page();
    await click(p.button("Expand controls to full"));
    await p.pick("Other default");
    expectFull(p, 900);
    await p.pick("Compact density");
    expectFull(p, 900);
    await resizeTo(1300);
    expectFull(p, 1300);
  });
});

describe("bad stored prefs", () => {
  const bad: [string, string][] = [
    ["garbage", "{ not json"],
    ["a string", JSON.stringify("full")],
    ["an array", JSON.stringify(["full", 300])],
    ["null", "null"],
    [
      "out-of-range numbers",
      JSON.stringify({ controlsHeight: -4, controls: "open" }),
    ],
    ["zero height", JSON.stringify({ controlsHeight: 0 })],
    ["a huge height", JSON.stringify({ controlsHeight: 1e9 })],
    ["an infinite height", '{"controlsHeight": 1e400}'],
    ["a string height", JSON.stringify({ controlsHeight: "300" })],
    ["an unknown state", JSON.stringify({ controls: "huge" })],
    ["a wrong-type state", JSON.stringify({ controls: 1, sidebar: "no" })],
  ];
  for (const [what, raw] of bad) {
    it(`falls back to the default panel for ${what}`, async () => {
      localStorage.setItem(KEY, raw);
      reloadCanvasPrefs();
      expect(read()).toEqual(DEFAULT_PREFS);
      const p = await page();
      expect(p.state()).toBe("open");
      expect(p.sizes()).toEqual({ canvas: 900 - FIT_PX, controls: FIT_PX });
    });
  }

  it("clamps a stored height that no longer fits the main area", async () => {
    // A valid height from a taller window: the canvas keeps its minimum.
    setCanvasPrefs({ controlsHeight: 2000 });
    reloadCanvasPrefs();
    const p = await page();
    expect(p.state()).toBe("open");
    expect(p.sizes()).toEqual({ canvas: 120, controls: 780 });
  });
});
