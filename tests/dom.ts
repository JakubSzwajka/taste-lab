// Helpers for mounted tests. A test file opts in to the DOM with
// `// @vitest-environment happy-dom` on its first line; the default stays node.
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// React warns about updates outside act() unless it knows this is a test.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; host: HTMLElement }[] = [];

/** Renders into a fresh element on <body>. Undo with `unmountAll`. */
export async function mount(node: ReactNode): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  mounted.push({ root, host });
  return host;
}

export async function unmountAll() {
  for (const { root, host } of mounted.splice(0)) {
    await act(async () => root.unmount());
    host.remove();
  }
  document.body.innerHTML = "";
}

/** Lets pending promises (module loads) settle inside act(). */
export const settle = () => act(async () => {});

/**
 * Dispatches one keydown that bubbles from `target` to window, like a real key
 * press. Returns the event, so a test can read `defaultPrevented`.
 */
export async function press(
  target: Element | Document,
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const e = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  await act(async () => {
    target.dispatchEvent(e);
  });
  return e;
}

/** Sets a text field's value the way typing does, so React's onChange fires. */
export async function type(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto = Object.getPrototypeOf(field);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  await act(async () => {
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export async function click(el: Element) {
  await act(async () => {
    (el as HTMLElement).click();
  });
}

/** The one element matching `selector`, or a thrown error naming it. */
export function one<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const all = root.querySelectorAll<T>(selector);
  if (all.length !== 1) {
    throw new Error(`expected one ${selector}, found ${all.length}`);
  }
  return all[0] as T;
}
