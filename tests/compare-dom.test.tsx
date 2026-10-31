// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompareScreen } from "../src/components/CompareScreen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../src/components/ui/dropdown-menu";
import { TooltipProvider } from "../src/components/ui/tooltip";
import type { LoadedRound } from "../src/lib/rounds";
import type { Answer } from "../src/lib/submit";
import { click, mount, one, press, settle, type, unmountAll } from "./dom";

type OkRound = Extract<LoadedRound, { ok: true }>;

const never = () => new Promise<never>(() => {});

const round: OkRound = {
  ok: true,
  id: "round-009",
  loaders: { a: never, b: never, c: never },
  spec: {
    id: "round-009",
    level: "layout",
    component: "compare-page",
    question: "Which reason input feels right?",
    fixture: "lab",
    basedOn: null,
    preview: "flip",
    variants: ["a", "b", "c"].map((id) => ({
      id,
      file: `${id}.tsx`,
      label: `Label ${id}`,
      changes: `Changes ${id}`,
    })),
  },
};

/** Mounts the compare screen, plus an open menu when asked. */
async function setup(withMenu = false) {
  const onSubmit = vi.fn<(a: Answer) => void>();
  const host = await mount(
    <TooltipProvider>
      {withMenu && (
        <DropdownMenu defaultOpen modal={false}>
          <DropdownMenuTrigger>Rounds</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>round-001</DropdownMenuItem>
            <DropdownMenuItem>round-002</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <CompareScreen
        round={round}
        theme="dark"
        previous={undefined}
        submitting={false}
        error={null}
        onSubmit={onSubmit}
      />
    </TooltipProvider>,
  );
  const bar = one(host, 'form[aria-label="Answer"]');
  const reason = one<HTMLTextAreaElement>(bar, 'textarea[aria-label="Reason"]');
  // The pick toggles: A, B, C, None, Mix. "on" marks the pressed one.
  const picked = () =>
    [...bar.querySelectorAll<HTMLElement>('[role="radio"]')]
      .filter((b) => b.dataset.state === "on")
      .map((b) => b.textContent?.trim().charAt(0).toLowerCase());
  return { host, onSubmit, bar, reason, picked };
}

afterEach(unmountAll);

describe("Compare answer bar, mounted", () => {
  it("marks the picked tab with the plain medium Sparkles icon", async () => {
    const { host } = await setup();
    await press(document.body, "2");
    const picked = one(host, '[role="tab"][data-variant="b"] .lucide-sparkles');
    expect(picked.getAttribute("stroke-width")).toBe("1.75");
    expect(picked.classList.contains("size-5")).toBe(true);
    expect(picked.parentElement?.className).toContain("[&>svg]:size-5!");
    expect(picked.parentElement?.textContent).toBe("Picked");
  });

  it("renders real variants inside their token scope, not in the chrome header", async () => {
    const rendered: OkRound = {
      ...round,
      spec: {
        ...round.spec,
        variants: round.spec.variants.map((v) => ({
          ...v,
          tokens: { "--radius": "2rem", "--primary": "var(--chart-2)" },
        })),
      },
      loaders: Object.fromEntries(
        round.spec.variants.map((v) => [
          v.id,
          async () => ({
            default: () => <p data-live={v.id}>Fixture {v.id}</p>,
          }),
        ]),
      ),
    };
    const host = await mount(
      <TooltipProvider>
        <CompareScreen
          round={rendered}
          theme="dark"
          previous={undefined}
          submitting={false}
          error={null}
          onSubmit={() => {}}
        />
      </TooltipProvider>,
    );
    await settle();
    const frame = one(host, 'section[aria-label="Variant a: Label a"]');
    const content = one<HTMLElement>(frame, '[data-live="a"]').parentElement;
    expect(content?.style.getPropertyValue("--radius")).toBe("2rem");
    expect(content?.style.getPropertyValue("--primary")).toBe("var(--chart-2)");
    expect(content?.style.colorScheme).toBe("dark");
    expect(one(frame, "header").getAttribute("style")).toBeNull();
    expect(one(frame, '[data-live="a"]').textContent).toBe("Fixture a");
    await press(document.body, "2");
    expect(
      one(host, '[role="tabpanel"]:not([hidden]) [data-live="b"]').textContent,
    ).toBe("Fixture b");
  });

  it("keeps Enter and Shift+Enter native and preserves pasted newlines", async () => {
    const { onSubmit, reason } = await setup();
    await press(document.body, "2");
    reason.focus();
    for (const modifiers of [{}, { shiftKey: true }]) {
      const e = await press(reason, "Enter", modifiers);
      expect(e.defaultPrevented).toBe(false);
    }
    // happy-dom has no default text insertion; a browser verifies real typing.
    await type(reason, "less noise\nmore air\n");
    expect(reason.value).toBe("less noise\nmore air\n");
    expect(onSubmit).not.toHaveBeenCalled();
    await press(reason, "Enter", { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      pick: "b",
      reason: "less noise\nmore air\n",
      view: "flip",
    });
  });

  it("submits exactly once for one Cmd+Enter in the reason", async () => {
    const { onSubmit, reason } = await setup();
    await press(document.body, "2");
    reason.focus();
    await type(reason, "less noise");
    const e = await press(reason, "Enter", { metaKey: true });
    expect(e.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      pick: "b",
      reason: "less noise",
      view: "flip",
    });
  });

  it("submits exactly once for one Ctrl+Enter in the reason", async () => {
    const { onSubmit, reason } = await setup();
    await press(document.body, "1");
    reason.focus();
    await press(reason, "Enter", { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("leaves the reason with Escape and restores page shortcuts", async () => {
    const { reason, picked } = await setup();
    await press(document.body, "r");
    expect(document.activeElement).toBe(reason);
    await press(reason, "Escape");
    expect(document.activeElement).not.toBe(reason);
    await press(document.body, "3");
    expect(picked()).toEqual(["c"]);
  });

  it("does not submit during IME composition", async () => {
    const { reason, onSubmit } = await setup();
    await press(document.body, "1");
    reason.focus();
    const e = await press(reason, "Enter", {
      ctrlKey: true,
      isComposing: true,
    });
    expect(e.defaultPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the Mac shortcut hint on Mac", async () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    try {
      const { bar, reason } = await setup();
      expect(bar.textContent).toContain("⌘↵");
      expect(reason.getAttribute("aria-keyshortcuts")).toBe("Meta+Enter");
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("submits once for Enter on the page", async () => {
    const { onSubmit } = await setup();
    await press(document.body, "3");
    await press(document.body, "Enter");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0].pick).toBe("c");
  });

  it("picks with 1-4, n and m from the page", async () => {
    const { picked, reason } = await setup();
    await press(document.body, "2");
    expect(picked()).toEqual(["b"]);
    await press(document.body, "n");
    expect(picked()).toEqual(["n"]);
    await press(document.body, "m");
    expect(picked()).toEqual(["m"]);
    expect(document.activeElement).toBe(reason);
  });

  it("ignores 1-4, n and m while typing in the reason", async () => {
    const { picked, reason, onSubmit } = await setup();
    await press(document.body, "1");
    reason.focus();
    for (const key of ["2", "3", "n", "m"]) {
      const e = await press(reason, key);
      // The letter still reaches the field.
      expect(e.defaultPrevented).toBe(false);
    }
    expect(picked()).toEqual(["a"]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores 1-4, n and m while a menu is open", async () => {
    const { picked } = await setup(true);
    const item = document.querySelector('[role="menuitem"]');
    expect(item).not.toBeNull();
    for (const key of ["2", "n", "m"]) {
      await press(item as Element, key);
    }
    expect(picked()).toEqual([]);
  });

  it("does not submit Mix with a blank reason", async () => {
    const { onSubmit, reason, bar } = await setup();
    await press(document.body, "m");
    expect(document.activeElement).toBe(reason);
    await press(reason, "Enter");
    await type(reason, " \n\n  ");
    await press(reason, "Enter");
    await press(document.body, "Enter");
    const submit = one<HTMLButtonElement>(bar, 'button[type="submit"]');
    expect(submit.disabled).toBe(true);
    await click(submit);
    expect(onSubmit).not.toHaveBeenCalled();

    await type(reason, "header of b, rows of c");
    await press(reason, "Enter", { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      pick: "mix",
      reason: "header of b, rows of c",
    });
  });
});
