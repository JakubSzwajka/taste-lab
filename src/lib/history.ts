import type { LoadedRound } from "./rounds";
import type { TasteEntry } from "./taste";

/** Tags shown per row. Extra tags collapse into one "+n" pill. */
export const MAX_TAG_PILLS = 2;

export type HistoryRow = {
  key: string;
  entry: TasteEntry;
  /** The winning variant's label from round.json. Null for none, mix or a missing round. */
  label: string | null;
  /** True when the round folder exists, even if its round.json is broken. */
  roundExists: boolean;
  tags: string[];
  moreTags: number;
};

/** Newest first. Equal timestamps keep the later log line first. */
export function sortNewestFirst(entries: TasteEntry[]): TasteEntry[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.ts.localeCompare(a.e.ts) || b.i - a.i)
    .map((x) => x.e);
}

/** The winning variant's label, or null when it cannot be told (never throws). */
export function winnerLabel(
  entry: TasteEntry,
  rounds: LoadedRound[],
): string | null {
  if (entry.pick === "none" || entry.pick === "mix") return null;
  const round = rounds.find((r) => r.id === entry.round);
  if (!round?.ok) return null;
  return round.spec.variants.find((v) => v.id === entry.pick)?.label ?? null;
}

export function historyRows(
  entries: TasteEntry[],
  rounds: LoadedRound[],
): HistoryRow[] {
  const seen = new Map<string, number>();
  return sortNewestFirst(entries).map((entry) => {
    const base = `${entry.ts}-${entry.round}-${entry.pick}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return {
      key: n === 0 ? base : `${base}-${n}`,
      entry,
      label: winnerLabel(entry, rounds),
      roundExists: rounds.some((r) => r.id === entry.round),
      tags: entry.tags.slice(0, MAX_TAG_PILLS),
      moreTags: Math.max(0, entry.tags.length - MAX_TAG_PILLS),
    };
  });
}

/** "Oct 29, 10:05". Local time by default, a zone can be passed for tests. */
export function formatWhen(ts: string, timeZone?: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZone && { timeZone }),
  }).format(d);
}

/** Tooltip text for the pick pill. */
export function pickTitle(pick: string, label: string | null): string {
  return label ? `${pick} · ${label}` : pick;
}
