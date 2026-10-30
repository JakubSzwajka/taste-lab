// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { LibraryPage } from "../src/components/LibraryView";
import { LibraryControls } from "../src/components/library/LibraryControls";
import {
  menuOptionId,
  menuOptionValue,
  UNSET_ID,
} from "../src/components/library/menu-options";
import { setCanvasPrefs } from "../src/components/library/prefs";
import { type LibraryGlob, loadLibrary } from "../src/lib/library";
import type {
  ControlValue,
  ControlValues,
  LibraryControl,
} from "../src/lib/library-controls";
import { click, mount, one, press, settle, type, unmountAll } from "./dom";

const sample = resolve(import.meta.dirname, "fixtures/library/task-chip");

const CONTROLS = [
  { prop: "dense", kind: "boolean", label: "Dense rows" },
  { prop: "status", kind: "select", options: ["todo", "done"] },
  { prop: "title", kind: "text", default: "Hello" },
  { prop: "count", kind: "number" },
];

/** The example shows the props it got, so a test can read them back. */
function Probe(props: ControlValues) {
  return <output data-testid="props">{JSON.stringify(props)}</output>;
}

function entries() {
  const m = JSON.parse(readFileSync(join(sample, "meta.json"), "utf8"));
  m.controls = CONTROLS;
  m.examples[0].args = { status: "done", count: 2 };
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

afterEach(async () => {
  await unmountAll();
  setCanvasPrefs({ mode: undefined, surface: "plain" });
});

describe("Library canvas, mounted", () => {
  async function setup() {
    const host = await mount(
      <LibraryPage entries={entries()} light={{}} name="task-chip" />,
    );
    await settle();
    const controls = one(host, 'section[aria-label="Controls"]');
    const props = () =>
      JSON.parse(one(host, '[data-testid="props"]').textContent ?? "null");
    return { host, controls, props };
  }

  it("renders the loaded example with its args, then defaults", async () => {
    const { props } = await setup();
    expect(props()).toEqual({ status: "done", title: "Hello", count: 2 });
  });

  it("re-renders the example with each changed control", async () => {
    const { controls, props } = await setup();

    await click(one(controls, '[role="checkbox"][aria-label="Dense rows"]'));
    expect(props()).toMatchObject({ dense: true });

    const todo = [...controls.querySelectorAll('[role="radio"]')].find(
      (b) => b.textContent === "todo",
    );
    await click(todo as Element);
    expect(props()).toMatchObject({ status: "todo" });

    await type(
      one<HTMLInputElement>(controls, 'input[aria-label="title"]'),
      "Renamed",
    );
    expect(props()).toMatchObject({ title: "Renamed" });

    // Clearing a field unsets the prop: the example keeps its own value.
    await type(
      one<HTMLInputElement>(controls, 'input[aria-label="count"]'),
      "",
    );
    expect(props()).not.toHaveProperty("count");

    expect(props()).toEqual({ dense: true, status: "todo", title: "Renamed" });
  });

  it("restores the example's args on Reset", async () => {
    const { controls, props } = await setup();
    await click(one(controls, '[role="checkbox"][aria-label="Dense rows"]'));
    await type(
      one<HTMLInputElement>(controls, 'input[aria-label="count"]'),
      "7",
    );
    expect(props()).toMatchObject({ dense: true, count: 7 });

    const reset = [...controls.querySelectorAll("button")].find(
      (b) => b.textContent === "Reset",
    );
    await click(reset as Element);
    expect(props()).toEqual({ status: "done", title: "Hello", count: 2 });
    expect(
      one<HTMLInputElement>(controls, 'input[aria-label="count"]').value,
    ).toBe("2");
  });
});

/** One select control with its own state; records each onChange value. */
function SelectHarness({
  options,
  seen,
}: {
  options: string[];
  seen: (ControlValue | undefined)[];
}) {
  const control: LibraryControl = { prop: "size", kind: "select", options };
  const [values, setValues] = useState<ControlValues>({ size: "\u0000unset" });
  return (
    <LibraryControls
      controls={[control]}
      values={values}
      onChange={(_, v) => {
        seen.push(v);
        setValues(v === undefined ? {} : { size: v });
      }}
      onReset={() => {}}
    />
  );
}

describe("select menu option ids", () => {
  // Validation allows any non-empty string, including the old sentinel.
  const options = ["xs", "sm", "md", "lg", "\u0000unset", "unset"];

  it("keeps every option apart from unset", () => {
    expect(menuOptionId(options, undefined)).toBe(UNSET_ID);
    const ids = options.map((o) => menuOptionId(options, o));
    expect(new Set([UNSET_ID, ...ids]).size).toBe(options.length + 1);
    for (const o of options) {
      expect(menuOptionValue(options, menuOptionId(options, o))).toBe(o);
    }
    expect(menuOptionValue(options, UNSET_ID)).toBeUndefined();
  });

  it("checks nothing for a value outside the options", () => {
    expect(menuOptionId(options, "xl")).toBe("");
    expect(menuOptionValue(options, "option-99")).toBeUndefined();
  });

  it("sets and clears an option named like the old sentinel", async () => {
    const seen: (ControlValue | undefined)[] = [];
    await mount(<SelectHarness options={options} seen={seen} />);
    const radios = async () => {
      await press(one(document, 'button[aria-label="size"]'), "Enter");
      return [...document.querySelectorAll('[role="menuitemradio"]')];
    };
    const checked = (items: Element[]) =>
      items
        .filter((i) => i.getAttribute("aria-checked") === "true")
        .map((i) => i.textContent);

    let items = await radios();
    expect(items).toHaveLength(options.length + 1);
    expect(checked(items)).toEqual(["\u0000unset"]);

    await click(items[0] as Element);
    expect(seen).toEqual([undefined]);

    items = await radios();
    expect(checked(items)).toEqual(["unset"]);
    const sentinel = items.find((i) => i.textContent === "\u0000unset");
    await click(sentinel as Element);
    expect(seen).toEqual([undefined, "\u0000unset"]);

    items = await radios();
    const literal = items.filter((i) => i.textContent === "unset");
    // The "unset" item and an option literally named "unset" stay apart.
    expect(literal).toHaveLength(2);
    await click(literal[1] as Element);
    expect(seen).toEqual([undefined, "\u0000unset", "unset"]);
  });
});
