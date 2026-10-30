import { useSyncExternalStore } from "react";

export type CanvasMode = "light" | "dark";
export type CanvasSurface = "plain" | "muted";
/** Controls panel: open at its height, only the header bar, or the whole main area. */
export type ControlsState = "open" | "collapsed" | "full";
export type CanvasPrefs = {
  /** Unset until the operator picks one: the canvas follows the lab theme. */
  mode: CanvasMode | undefined;
  surface: CanvasSurface;
  /** The entry sidebar is open (desktop). The mobile sheet always starts closed. */
  sidebar: boolean;
  controls: ControlsState;
  /** Controls panel height in px after a drag. Unset: fit the controls. */
  controlsHeight: number | undefined;
};

export const DEFAULT_PREFS: CanvasPrefs = {
  mode: undefined,
  surface: "plain",
  sidebar: true,
  controls: "open",
  controlsHeight: undefined,
};

const KEY = "taste-lab-canvas";
// Only in a browser. Node has a global localStorage that warns when touched.
const storage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;

const isHeight = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v < 100_000;

export function read(): CanvasPrefs {
  try {
    const raw = JSON.parse(storage()?.getItem(KEY) ?? "null");
    return {
      mode:
        raw?.mode === "light" || raw?.mode === "dark" ? raw.mode : undefined,
      surface: raw?.surface === "muted" ? "muted" : "plain",
      sidebar: raw?.sidebar !== false,
      controls:
        raw?.controls === "collapsed" || raw?.controls === "full"
          ? raw.controls
          : "open",
      controlsHeight: isHeight(raw?.controlsHeight)
        ? Math.round(raw.controlsHeight)
        : undefined,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// Module state, so the toolbar survives the remount when the route changes entry.
let prefs: CanvasPrefs | null = null;
const subs = new Set<() => void>();
const get = () => {
  prefs ??= read();
  return prefs;
};

/** Drops the in-memory copy, so the next read comes from storage, as after a reload. */
export function reloadCanvasPrefs() {
  prefs = null;
  for (const fn of subs) fn();
}

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
