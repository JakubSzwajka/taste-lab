// Pure so it can be tested without a DOM.
export type KeyTarget = {
  tagName?: string;
  role?: string | null;
  isContentEditable?: boolean;
};

export type EnterEvent = {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

const TEXT_TAGS = new Set(["TEXTAREA", "INPUT"]);
const NATIVE_TAGS = new Set(["BUTTON", "A", "SELECT", "SUMMARY"]);
const NATIVE_ROLES = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "menu",
  "tab",
  "option",
]);

export const isTextTarget = (t: KeyTarget | null) =>
  !!t && (TEXT_TAGS.has(t.tagName ?? "") || t.isContentEditable === true);

/**
 * What the global Enter handler should do.
 * - "submit": send the answer.
 * - "native": leave the event alone. A focused button, link or toggle keeps its own Enter.
 * - "ignore": modifier combos we do not own, or Enter in a text field without Ctrl/Cmd.
 */
export function enterAction(
  e: EnterEvent,
  target: KeyTarget | null,
): "submit" | "native" | "ignore" {
  if (e.altKey || e.shiftKey) return "ignore";
  if (isTextTarget(target)) {
    return e.ctrlKey || e.metaKey ? "submit" : "ignore";
  }
  if (
    target &&
    (NATIVE_TAGS.has(target.tagName ?? "") ||
      NATIVE_ROLES.has(target.role ?? ""))
  ) {
    return "native";
  }
  return "submit";
}

export type ArrowEvent = EnterEvent & { key: string };

/** Roles whose widgets move focus or values with the arrow keys. */
const ARROW_ROLES = new Set([
  "tab",
  "radio",
  "slider",
  "spinbutton",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "combobox",
  "listbox",
  "tree",
  "treeitem",
  "grid",
  "gridcell",
]);

/**
 * What the global ArrowLeft/ArrowRight handler should do: flip the variant
 * view, or nothing. It never acts in text fields, selects, or inside a widget
 * that uses arrows itself (tabs, toggle groups, menus). `inArrowWidget` is true
 * when the target sits inside such a group (checked by the caller via the DOM).
 */
export function arrowAction(
  e: ArrowEvent,
  target: KeyTarget | null,
  inArrowWidget = false,
): "prev" | "next" | "ignore" {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return "ignore";
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return "ignore";
  if (isTextTarget(target) || inArrowWidget) return "ignore";
  if (target?.tagName === "SELECT") return "ignore";
  if (ARROW_ROLES.has(target?.role ?? "")) return "ignore";
  return e.key === "ArrowLeft" ? "prev" : "next";
}

/** DOM selector for widgets that own plain keys. Callers test `target.closest`. */
export const MENU_SELECTOR =
  "[role=menu],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=listbox],[role=option],[role=combobox]";

export type ReasonKeyEvent = EnterEvent & {
  key: string;
  isComposing?: boolean;
};

/**
 * What a key does inside the multiline reason.
 * - "submit": Ctrl/Cmd+Enter sends the answer.
 * - "leave": Escape hands focus back to the page, so pick keys work again.
 * - "ignore": anything else, or Enter while an IME is composing.
 * The caller calls preventDefault for all but "ignore"; the global handler
 * skips defaultPrevented events, so one Enter never submits twice.
 */
export function reasonKeyAction(
  e: ReasonKeyEvent,
): "submit" | "leave" | "ignore" {
  if (e.isComposing) return "ignore";
  if (e.key === "Escape") return "leave";
  if (e.key !== "Enter") return "ignore";
  if (e.shiftKey || e.altKey) return "ignore";
  return e.ctrlKey || e.metaKey ? "submit" : "ignore";
}

/**
 * What a plain answer-bar key does, or null: 1-4 pick a variant by position,
 * n none, m mix (and focus the reason, which mix needs), r focus the reason.
 */
export function pickKey(
  key: string,
  ids: readonly string[],
): { pick: string; focusReason: boolean } | { focusReason: true } | null {
  const n = Number(key);
  if (Number.isInteger(n) && n >= 1 && n <= 4 && ids[n - 1]) {
    return { pick: ids[n - 1] as string, focusReason: false };
  }
  if (key === "n") return { pick: "none", focusReason: false };
  if (key === "m") return { pick: "mix", focusReason: true };
  if (key === "r") return { focusReason: true };
  return null;
}

/**
 * Whether a plain key (1-4, n, m, r) may act as a pick shortcut. Never in text
 * fields, with modifiers, or inside a menu or listbox: those own digits and
 * letters (typeahead) and portal outside the variant frame. `inMenu` is true
 * when the target sits inside such a widget (checked by the caller via the DOM).
 */
export function pickShortcutAllowed(
  e: Pick<EnterEvent, "ctrlKey" | "metaKey" | "altKey">,
  target: KeyTarget | null,
  inMenu = false,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (isTextTarget(target) || inMenu) return false;
  return true;
}
