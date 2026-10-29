// Pure helpers for the full-width flip view.
export type PreviewMode = "columns" | "flip";
export const PREVIEW_MODES: readonly PreviewMode[] = ["columns", "flip"];

/** Next index after moving `delta` steps, wrapping at both ends. */
export function flipIndex(current: number, delta: number, length: number) {
  if (length <= 0) return 0;
  const start = current >= 0 && current < length ? current : 0;
  return (((start + delta) % length) + length) % length;
}
