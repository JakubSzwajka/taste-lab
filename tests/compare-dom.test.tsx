// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompareScreen } from "../src/components/CompareScreen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../src/components/ui/dropdown-menu";
import type { LoadedRound } from "../src/lib/rounds";
import type { Answer } from "../src/lib/submit";
import { click, mount, one, press, type, unmountAll } from "./dom";

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
    <>
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
    </>,
  );
  const bar = one(host, 'form[aria-label="Answer"]');
  const reason = one<HTMLTextAreaElement>(bar, 'textarea[aria-label="Reason"]');
  // The pick toggles: A, B, C, None, Mix. "on" marks the pressed one.
  const picked = () =>
    [...bar.querySelectorAll<HTMLElement>('[role="radio"]')]
      .filter((b) => b.dataset.state === "on")
      .map((b) => b.textContent?.trim().charAt(0).toLowerCase());
  return { onSubmit, bar, reason, picked };
}

afterEach(unmountAll);

describe("Compare answer bar, mounted", () => {
  it("submits exactly once for one Enter in the reason", async () => {
    const { onSubmit, reason } = await setup();
    await press(document.body, "2");
    reason.focus();
    await type(reason, "less noise");
    const e = await press(reason, "Enter");
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
    await type(reason, "   ");
    await press(reason, "Enter");
    await press(document.body, "Enter");
    const submit = one<HTMLButtonElement>(bar, 'button[type="submit"]');
    expect(submit.disabled).toBe(true);
    await click(submit);
    expect(onSubmit).not.toHaveBeenCalled();

    await type(reason, "header of b, rows of c");
    await press(reason, "Enter");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      pick: "mix",
      reason: "header of b, rows of c",
    });
  });
});
