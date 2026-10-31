// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { applyTabBadge, TAB_ICONS, tabTitle } from "../src/lib/tab-badge";

const icons = { plain: "/plain.svg", open: "/open.svg" };
const icon = () =>
  document
    .querySelector<HTMLLinkElement>('link[rel~="icon"]')
    ?.getAttribute("href");

afterEach(() => {
  document.head.innerHTML = "";
  document.title = "";
});

describe("tab badge", () => {
  it("counts open rounds in the title", () => {
    expect(tabTitle(0, "board-app")).toBe("board-app · taste.lab");
    expect(tabTitle(3, "board-app")).toBe("(3) board-app · taste.lab");
  });

  it("swaps to the dot icon while rounds wait, and back at 0", () => {
    document.head.innerHTML =
      '<link rel="icon" type="image/svg+xml" href="/plain.svg" />';
    applyTabBadge(document, 2, "acme", icons);
    expect(document.title).toBe("(2) acme · taste.lab");
    expect(icon()).toBe("/open.svg");
    applyTabBadge(document, 0, "acme", icons);
    expect(document.title).toBe("acme · taste.lab");
    expect(icon()).toBe("/plain.svg");
    expect(document.querySelectorAll('link[rel~="icon"]')).toHaveLength(1);
  });

  it("adds an icon link when the page has none", () => {
    applyTabBadge(document, 1, "acme", icons);
    expect(icon()).toBe("/open.svg");
  });

  it("ships two different icons", () => {
    // Vite may inline small SVGs as data URLs, so compare, do not match paths.
    expect(TAB_ICONS.plain).toBeTruthy();
    expect(TAB_ICONS.open).not.toBe(TAB_ICONS.plain);
  });
});
