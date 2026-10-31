import { useEffect } from "react";
import plainIcon from "@/favicon.svg?url";
import openIcon from "@/favicon-open.svg?url";

export const TAB_ICONS = { plain: plainIcon, open: openIcon } as const;

/** "(2) board-app · taste.lab" while rounds wait, else "board-app · taste.lab". */
export function tabTitle(open: number, labName: string): string {
  const base = `${labName} · taste.lab`;
  return open > 0 ? `(${open}) ${base}` : base;
}

/** Sets the tab title and swaps the favicon for the one with a red dot. */
export function applyTabBadge(
  doc: Document,
  open: number,
  labName: string,
  icons: { plain: string; open: string } = TAB_ICONS,
): void {
  doc.title = tabTitle(open, labName);
  let link = doc.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = doc.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    doc.head.append(link);
  }
  const href = open > 0 ? icons.open : icons.plain;
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}

/**
 * Keeps the tab in step with the number of rounds that wait for an answer.
 * `open` is null until the log has loaded, so a fresh tab does not flash
 * every round as open.
 */
export function useTabBadge(open: number | null, labName: string): void {
  useEffect(() => {
    if (open === null) return;
    applyTabBadge(document, open, labName);
  }, [open, labName]);
}
