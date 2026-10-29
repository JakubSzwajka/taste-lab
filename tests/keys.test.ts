import { describe, expect, it } from "vitest";
import { enterAction } from "../src/lib/keys";

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
