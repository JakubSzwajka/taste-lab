import { describe, expect, it } from "vitest";
import { arrowAction, enterAction } from "../src/lib/keys";

const plain = {
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
};

describe("enterAction", () => {
  it("submits from the page body or a non-interactive target", () => {
    expect(enterAction(plain, null)).toBe("submit");
    expect(enterAction(plain, { tagName: "BODY" })).toBe("submit");
    expect(enterAction(plain, { tagName: "DIV" })).toBe("submit");
  });

  it.each([
    ["button", { tagName: "BUTTON" }],
    ["link", { tagName: "A" }],
    ["select", { tagName: "SELECT" }],
    ["summary", { tagName: "SUMMARY" }],
    ["radio toggle", { tagName: "SPAN", role: "radio" }],
    ["role=button", { tagName: "DIV", role: "button" }],
    ["tab", { tagName: "DIV", role: "tab" }],
  ])("leaves Enter alone on a focused %s", (_n, target) => {
    expect(enterAction(plain, target)).toBe("native");
    expect(enterAction({ ...plain, ctrlKey: true }, target)).toBe("native");
  });

  it("needs Ctrl or Cmd in text fields", () => {
    for (const target of [
      { tagName: "TEXTAREA" },
      { tagName: "INPUT" },
      { tagName: "DIV", isContentEditable: true },
    ]) {
      expect(enterAction(plain, target)).toBe("ignore");
      expect(enterAction({ ...plain, ctrlKey: true }, target)).toBe("submit");
      expect(enterAction({ ...plain, metaKey: true }, target)).toBe("submit");
    }
  });

  it("ignores Alt and Shift combos", () => {
    expect(enterAction({ ...plain, shiftKey: true }, null)).toBe("ignore");
    expect(enterAction({ ...plain, altKey: true }, null)).toBe("ignore");
  });
});

describe("arrowAction", () => {
  const left = { ...plain, key: "ArrowLeft" };
  const right = { ...plain, key: "ArrowRight" };

  it("flips from the page body or a plain target", () => {
    expect(arrowAction(left, null)).toBe("prev");
    expect(arrowAction(right, { tagName: "BODY" })).toBe("next");
    expect(arrowAction(right, { tagName: "DIV" })).toBe("next");
  });

  it("ignores other keys", () => {
    expect(arrowAction({ ...plain, key: "ArrowUp" }, null)).toBe("ignore");
    expect(arrowAction({ ...plain, key: "a" }, null)).toBe("ignore");
  });

  it("never acts in text fields", () => {
    for (const target of [
      { tagName: "TEXTAREA" },
      { tagName: "INPUT" },
      { tagName: "DIV", isContentEditable: true },
    ]) {
      expect(arrowAction(left, target)).toBe("ignore");
      expect(arrowAction(right, target)).toBe("ignore");
    }
  });

  it.each([
    ["select", { tagName: "SELECT" }],
    ["tab", { tagName: "BUTTON", role: "tab" }],
    ["radio toggle", { tagName: "BUTTON", role: "radio" }],
    ["slider", { tagName: "SPAN", role: "slider" }],
    ["menu item", { tagName: "DIV", role: "menuitem" }],
  ])("leaves arrows to a focused %s", (_n, target) => {
    expect(arrowAction(left, target)).toBe("ignore");
    expect(arrowAction(right, target)).toBe("ignore");
  });

  it("leaves arrows to a widget that contains the target", () => {
    expect(arrowAction(right, { tagName: "BUTTON" }, true)).toBe("ignore");
  });

  it("still flips from a plain focused button outside any widget", () => {
    expect(arrowAction(right, { tagName: "BUTTON" })).toBe("next");
  });

  it("ignores modifier combos", () => {
    for (const mod of ["ctrlKey", "metaKey", "altKey", "shiftKey"] as const) {
      expect(arrowAction({ ...left, [mod]: true }, null)).toBe("ignore");
    }
  });
});
