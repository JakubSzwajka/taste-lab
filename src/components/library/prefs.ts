import { useSyncExternalStore } from "react";

export type CanvasMode = "light" | "dark";
export type CanvasSurface = "plain" | "muted";
export type CanvasPrefs = {
  /** Unset until the operator picks one: the canvas follows the lab theme. */
  mode: CanvasMode | undefined;
  surface: CanvasSurface;
};

const KEY = "taste-lab-canvas";
// Only in a browser. Node has a global localStorage that warns when touched.
const storage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;

function read(): CanvasPrefs {
  const fallback: CanvasPrefs = { mode: undefined, surface: "plain" };
  try {
    const raw = JSON.parse(storage()?.getItem(KEY) ?? "null");
    return {
      mode:
        raw?.mode === "light" || raw?.mode === "dark" ? raw.mode : undefined,
      surface: raw?.surface === "muted" ? "muted" : "plain",
    };
  } catch {
    return fallback;
  }
}

// Module state, so the toolbar survives the remount when the route changes entry.
let prefs: CanvasPrefs | null = null;
const subs = new Set<() => void>();
const get = () => {
  prefs ??= read();
  return prefs;
};

export function setCanvasPrefs(patch: Partial<CanvasPrefs>) {
  prefs = { ...get(), ...patch };
  try {
    storage()?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be off. The prefs still hold for this tab.
  }
  for (const fn of subs) fn();
}

const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export const useCanvasPrefs = () => useSyncExternalStore(subscribe, get, get);

/** The lab theme, read from the `dark` class on <html>. */
const labDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

function subscribeLab(fn: () => void) {
  if (typeof MutationObserver === "undefined") return () => {};
  const obs = new MutationObserver(fn);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

export const useLabMode = (): CanvasMode =>
  useSyncExternalStore(
    subscribeLab,
    () => (labDark() ? "dark" : "light"),
    () => "light",
  );
