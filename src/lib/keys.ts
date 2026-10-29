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
