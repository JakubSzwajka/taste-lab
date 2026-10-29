// Pure helpers for the full-width flip view.
export type PreviewMode = "columns" | "flip";
export const PREVIEW_MODES: readonly PreviewMode[] = ["columns", "flip"];

/** Next index after moving `delta` steps, wrapping at both ends. */
export function flipIndex(current: number, delta: number, length: number) {
  if (length <= 0) return 0;
  const start = current >= 0 && current < length ? current : 0;
  return (((start + delta) % length) + length) % length;
}

/** The id to show: `active` if it is a variant of this round, else the first. */
export function resolveActive(ids: readonly string[], active: string) {
  return ids.includes(active) ? active : (ids[0] ?? "");
}

/**
 * Tab selection and panel visibility, both derived from one id. The tab list
 * and the panels must read this and nothing else, so they cannot disagree.
 */
export function flipState(ids: readonly string[], active: string) {
  const current = resolveActive(ids, active);
  return {
    active: current,
    selected: ids.map((id) => id === current),
    hidden: ids.map((id) => id !== current),
  };
}
