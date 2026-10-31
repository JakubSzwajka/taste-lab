// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeView } from "../src/components/ThemeView";
import { groupOf, TOKEN_GROUPS } from "../src/components/theme/groups";
import { allowedTokens, parseStock, parseTheme } from "../src/lib/taste-theme";
import { click, mount, one, unmountAll } from "./dom";

const repo = resolve(import.meta.dirname, "..");
const stock = parseStock(readFileSync(join(repo, "src/index.css"), "utf8"));
const allowed = allowedTokens(stock);
const tokenCount = allowed.size;

afterEach(unmountAll);

const render = (css: string) => {
  const { theme, problems } = parseTheme(css, allowed);
  return mount(<ThemeView stock={stock} theme={theme} problems={problems} />);
};

/** Custom property or style value from an element's inline style attribute. */
const styleOf = (el: Element, prop: string) =>
  new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`)
    .exec(el.getAttribute("style") ?? "")?.[1]
    ?.trim();

const tokenRows = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>("tr[data-token]")].map(
    (r) => r.dataset.token,
  );
const groupRows = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>("tr[data-group]")].map((r) => [
    r.dataset.group,
    Number(r.querySelector("[data-group-count]")?.textContent),
  ]);
const filterItem = (root: HTMLElement, label: string) => {
  const item = [
    ...root.querySelectorAll<HTMLElement>(
      '[aria-label="Show tokens from"] button',
    ),
  ].find((b) => b.textContent === label);
  if (!item) throw new Error(`no filter ${label}`);
  return item;
};

describe("token groups", () => {
  it("puts every stock token in a named role, none in Other", () => {
    for (const name of allowed) expect(groupOf(name)).not.toBe("Other");
    expect(groupOf("--foreground")).toBe("Surfaces");
    expect(groupOf("--card-foreground")).toBe("Surfaces");
    expect(groupOf("--primary-foreground")).toBe("Brand");
    expect(groupOf("--ring")).toBe("States");
    expect(groupOf("--chart-3")).toBe("Charts");
    expect(groupOf("--sidebar")).toBe("Sidebar");
    expect(groupOf("--sidebar-primary-foreground")).toBe("Sidebar");
    expect(groupOf("--radius")).toBe("Shape");
    expect(groupOf("--brand-new")).toBe("Other");
  });
});

describe("Theme page", () => {
  it("groups one row per token by role, with counts that add up", async () => {
    const root = await render("");
    expect(groupRows(root)).toEqual([
      ["Surfaces", 6],
      ["Brand", 6],
      ["States", 6],
      ["Charts", 5],
      ["Sidebar", 8],
      ["Shape", 1],
    ]);
    expect(tokenRows(root)).toHaveLength(tokenCount);
    // Group order follows TOKEN_GROUPS, and rows follow their group row.
    const order = TOKEN_GROUPS.map((g) => g.name);
    const seen = groupRows(root).map(([g]) => order.indexOf(g as string));
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    const sidebar = root.querySelector('tr[data-group="Sidebar"]');
    expect(sidebar?.nextElementSibling?.getAttribute("data-token")).toBe(
      "--sidebar",
    );
  });

  it("has a table with column and row headers", async () => {
    const root = await render("");
    const heads = [...root.querySelectorAll("thead th")].map(
      (th) => th.textContent,
    );
    expect(heads).toEqual(["Token", "Light", "Dark", "Source"]);
    const rowHead = one(root, 'tr[data-token="--primary"] th[scope="row"]');
    expect(rowHead.textContent).toBe("--primary");
    expect(root.querySelector("caption")?.textContent).toContain(
      "Theme tokens",
    );
  });

  it("counts theme.css tokens and filters with a labelled toggle group", async () => {
    const root = await render(
      ":root { --primary: hotpink; --radius: 1rem; }\n.dark { --ring: teal; }",
    );
    expect(one(root, '[data-testid="theme-count"]').textContent).toBe(
      `3 of ${tokenCount} from theme.css, the rest stock`,
    );
    const group = one(
      root,
      '[role="radiogroup"][aria-label="Show tokens from"]',
    );
    const checked = () =>
      [...group.querySelectorAll('[role="radio"][aria-checked="true"]')].map(
        (b) => b.textContent,
      );
    expect(checked()).toEqual(["All"]);

    await click(filterItem(root, "theme.css"));
    expect(checked()).toEqual(["theme.css"]);
    expect(tokenRows(root)).toEqual(["--primary", "--ring", "--radius"]);
    expect(groupRows(root)).toEqual([
      ["Brand", 1],
      ["States", 1],
      ["Shape", 1],
    ]);

    await click(filterItem(root, "Stock"));
    expect(tokenRows(root)).toHaveLength(tokenCount - 3);
    expect(tokenRows(root)).not.toContain("--primary");

    await click(filterItem(root, "All"));
    expect(tokenRows(root)).toHaveLength(tokenCount);
    // Clicking the pressed item keeps the filter instead of clearing it.
    await click(filterItem(root, "All"));
    expect(tokenRows(root)).toHaveLength(tokenCount);
  });

  it("says so when the theme.css filter is empty", async () => {
    const root = await render("");
    expect(one(root, '[data-testid="theme-count"]').textContent).toContain(
      `0 of ${tokenCount}`,
    );
    await click(filterItem(root, "theme.css"));
    expect(tokenRows(root)).toEqual([]);
    expect(root.textContent).toContain("No token comes from theme.css");
  });

  it("shows one fixed-size source pill per row", async () => {
    const root = await render(
      ":root { --primary: hotpink; }\n.dark { --ring: teal; --primary: navy; }",
    );
    const pill = (name: string) =>
      one(root, `tr[data-token="${name}"] [data-slot="badge"]`);
    for (const name of ["--primary", "--ring", "--card"]) {
      expect(pill(name).className).toContain("h-5 w-20");
    }
    expect(pill("--card").textContent).toBe("stock");
    expect(pill("--primary").textContent).toBe("theme.css");
    expect(pill("--primary").title).toBe("theme.css, light and dark");
    // A dark-only override keeps the same pill; the mode is in title and sr text.
    expect(pill("--ring").textContent).toBe("theme.css, dark only");
    expect(pill("--ring").querySelector(".sr-only")?.textContent).toBe(
      ", dark only",
    );
    expect(pill("--ring").title).toBe("theme.css, dark only");
    const ring = one(root, 'tr[data-token="--ring"]');
    expect(ring.dataset.source).toBe("theme");
    expect(
      [...ring.querySelectorAll<HTMLElement>("td > [data-source]")].map(
        (c) => c.dataset.source,
      ),
    ).toEqual(["stock", "theme"]);
  });

  it("lists ignored parts on top only when theme.css has problems", async () => {
    const clean = await render(":root { --primary: hotpink; }");
    expect(clean.querySelector('[role="alert"]')).toBeNull();
    await unmountAll();

    const root = await render(
      ":root { --primary: hotpink; --nope: red; }\n.x {}\n.dark { color: red; }",
    );
    const alert = one(root, '[role="alert"]');
    expect(alert.textContent).toContain("3 parts of theme.css are ignored.");
    const items = [...alert.querySelectorAll("li")].map((li) => li.textContent);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatch(/^line 1unknown token --nope/);
    expect(items[1]).toMatch(/^line 2selector ".x" is not allowed/);
    expect(items[2]).toMatch(/^line 3"color" is not a custom property/);
    // The list sits above the table.
    const table = one(root, "table");
    expect(
      alert.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("words a single ignored part in the singular", async () => {
    const root = await render(".x {}");
    expect(one(root, '[role="alert"]').textContent).toContain(
      "1 part of theme.css is ignored.",
    );
  });

  it("paints light and dark chips with their real values in their own mode", async () => {
    const root = await render(
      ":root { --primary: hotpink; }\n.dark { --primary: var(--destructive); }",
    );
    const row = one(root, 'tr[data-token="--primary"]');
    const chip = (mode: string) =>
      one(row, `[role="img"][data-mode="${mode}"]`);
    const backdrop = (mode: string) => one(row, `[data-backdrop="${mode}"]`);

    expect(styleOf(chip("light"), "background-color")).toBe("hotpink");
    expect(styleOf(chip("dark"), "background-color")).toBe(
      "var(--destructive)",
    );
    expect(chip("light").getAttribute("aria-label")).toBe(
      "--primary light: hotpink",
    );

    // Each backdrop holds every token of its mode, so it paints that mode's
    // background in either lab theme and a var() resolves in its own mode.
    for (const mode of ["light", "dark"] as const) {
      const b = backdrop(mode);
      expect(b.className).toContain("bg-background");
      expect(b.getAttribute("data-taste-scope")).toBe(mode);
      expect(styleOf(b, "--background")).toBe(stock[mode]["--background"]);
      expect(styleOf(b, "--destructive")).toBe(stock[mode]["--destructive"]);
    }
    expect(styleOf(backdrop("light"), "--primary")).toBe("hotpink");
    expect(styleOf(backdrop("dark"), "--primary")).toBe("var(--destructive)");
    expect(styleOf(backdrop("light"), "--background")).not.toBe(
      styleOf(backdrop("dark"), "--background"),
    );
    // --radius is in :root only, so the dark scope shares the light value.
    expect(styleOf(backdrop("dark"), "--radius")).toBe(stock.light["--radius"]);
  });

  it("keeps both chip modes the same whatever the lab theme is", async () => {
    const html = async () => {
      const root = await render(":root { --primary: hotpink; }");
      const out = one(root, 'tr[data-token="--primary"]').innerHTML;
      await unmountAll();
      return out;
    };
    const inLight = await html();
    document.documentElement.classList.add("dark");
    try {
      expect(await html()).toBe(inLight);
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });

  it("shows --radius as a sample box with that radius", async () => {
    const root = await render(":root { --radius: 1rem; }");
    const row = one(root, 'tr[data-token="--radius"]');
    for (const mode of ["light", "dark"]) {
      const chip = one(row, `[role="img"][data-mode="${mode}"]`);
      expect(styleOf(chip, "border-radius")).toBe("1rem");
      expect(styleOf(chip, "background-color")).toBeUndefined();
    }
  });
});
