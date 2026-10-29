// Pure header state, so the header logic is testable without a DOM.
import type { LoadedRound } from "./rounds.ts";
import { hrefFor, type Route } from "./route.ts";
import type { TasteEntry } from "./taste.ts";

export type Page = "compare" | "library" | "theme" | "history";

export const PAGES: { id: Page; label: string; href: string }[] = [
  { id: "compare", label: "Compare", href: hrefFor({ page: "current" }) },
  { id: "library", label: "Library", href: hrefFor({ page: "library" }) },
  { id: "theme", label: "Theme", href: hrefFor({ page: "theme" }) },
  { id: "history", label: "History", href: hrefFor({ page: "history" }) },
];

/** The page a route belongs to. A round link is the Compare page. */
export function pageOf(route: Route): Page {
  switch (route.page) {
    case "current":
    case "round":
      return "compare";
    case "library":
    case "library-entry":
      return "library";
    default:
      return route.page;
  }
}

export type RoundStatus =
  | { kind: "answered"; pick: string }
  | { kind: "open" }
  | { kind: "error" };

export type RoundItem = {
  id: string;
  href: string;
  /** Empty for a round that did not load. */
  component: string;
  status: RoundStatus;
};

/** Every round with its status. The pick is the latest log line for that round. */
export function roundItems(
  rounds: LoadedRound[],
  entries: TasteEntry[],
): RoundItem[] {
  const picks = new Map<string, string>();
  for (const e of entries) picks.set(e.round, e.pick); // later lines win
  return rounds.map((r) => {
    const pick = picks.get(r.id);
    return {
      id: r.id,
      href: hrefFor({ page: "round", id: r.id }),
      component: r.ok ? r.spec.component : "",
      status: !r.ok
        ? { kind: "error" }
        : pick !== undefined
          ? { kind: "answered", pick }
          : { kind: "open" },
    };
  });
}

/** Answered rounds among the listed ones. Log lines for deleted rounds do not count. */
export const answeredCount = (items: RoundItem[]) =>
  items.filter((i) => i.status.kind === "answered").length;

/** The rounds before and after `id` in list order. Both unset when `id` is not listed. */
export function neighbors(
  items: RoundItem[],
  id: string | undefined,
): { prev?: RoundItem; next?: RoundItem } {
  const i = id === undefined ? -1 : items.findIndex((r) => r.id === id);
  if (i < 0) return {};
  return { prev: items[i - 1], next: items[i + 1] };
}

/**
 * Where the tier arrows go. With every round answered, the current page shows
 * no round, so "previous" steps back to the last round.
 */
export function stepTargets(
  items: RoundItem[],
  route: Route,
  shownId: string | undefined,
): { prev?: RoundItem; next?: RoundItem } {
  if (shownId === undefined && route.page === "current") {
    return { prev: items.at(-1) };
  }
  return neighbors(items, shownId);
}
