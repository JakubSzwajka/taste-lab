import type { Plugin } from "vite";
import type { TasteEntry } from "../src/lib/taste.ts";

/**
 * `taste-lab serve --events` writes one JSON object per line on stdout. The pi
 * extension reads them. `lan` carries the link token and is the only place it
 * appears: no other event, log line or stderr text holds it.
 */
export type ServeEvent =
  | {
      event: "ready";
      port: number;
      dataDir: string;
      local: string;
      lan: string | null;
    }
  | { event: "answer"; entry: TasteEntry }
  | { event: "error"; message: string };

/** One event as one line, without the trailing newline. */
export const eventLine = (e: ServeEvent): string => JSON.stringify(e);

/** Name of the Vite plugin that carries a server's answer hook. */
export const EVENTS_PLUGIN = "taste-lab:events";

/**
 * Inline plugin `serve --events` adds. It only carries `onAppend`, which the
 * taste API of this one server calls after each append. No module state.
 */
export function tasteEvents(onAppend: (entry: TasteEntry) => void): Plugin {
  return { name: EVENTS_PLUGIN, api: Object.freeze({ onAppend }) };
}

/** The answer hook of the server these plugins belong to, if any. */
export function onAppendOf(
  plugins: readonly { name: string; api?: unknown }[],
): ((entry: TasteEntry) => void) | undefined {
  const api = plugins.find((p) => p.name === EVENTS_PLUGIN)?.api as
    | { onAppend?: (entry: TasteEntry) => void }
    | undefined;
  return api?.onAppend;
}
