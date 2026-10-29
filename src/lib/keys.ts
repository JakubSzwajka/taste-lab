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

/**
 * Whether a plain key (1-4, n, m) may act as a pick shortcut. Never in text
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
