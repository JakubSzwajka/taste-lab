export type Level = "token" | "component" | "layout";

/** The tag list the answer panel offers. */
export type Tag =
  | "airy"
  | "cramped"
  | "loud"
  | "quiet"
  | "dated"
  | "clean"
  | "playful"
  | "serious"
  | "too much"
  | "too little";

type RoundBase = {
  /** Folder name, e.g. "round-001". */
  id: string;
  component: string;
  level: Level;
  /** Short form of the round question. */
  question: string;
  /** round.json `variants`: label and changes per id. Absent when unknown. */
  variants?: SampleVariant[];
};

/** One round as the header sees it: answered, still open, or broken. */
export type LabRound =
  | (RoundBase & {
      status: "answered";
      /** A variant id, "none" or "mix". */
      pick: string;
      tags: Tag[];
    })
  | (RoundBase & { status: "open" })
  | (RoundBase & {
      status: "error";
      /** The first problem the app reports for this round. */
      error: string;
    });

export type RoundStatus = LabRound["status"];

export type Page = "Compare" | "Library" | "Theme" | "History";

export type Theme = "light" | "dark";
export type View = "columns" | "flip";

/** One taste.jsonl line, as the History page reads it. */
export type HistoryEntry = {
  /** ISO time the server set. */
  ts: string;
  round: string;
  component: string;
  level: Level;
  shown: string[];
  /** A variant id from `shown`, "none" or "mix". */
  pick: string;
  tags: Tag[];
  /** May be empty, except for "mix". */
  reason: string;
  theme: Theme;
  view: View;
};

export type LibraryStatus = "draft" | "agreed";

/** One library entry, as the Library page reads its meta.json. */
export type LibraryItem =
  | {
      ok: true;
      name: string;
      title: string;
      status: LibraryStatus;
      description: string;
      examples: { export: string; title: string; width: "column" | "full" }[];
      provenance: { round: string; pick: string; note: string }[];
      rules: string[];
    }
  | {
      ok: false;
      name: string;
      /** What `taste-lab check` reports for this entry. */
      errors: string[];
    };

/** One variant of the round the Compare page shows. */
export type SampleVariant = {
  id: string;
  label: string;
  changes: string;
};

/** A row of plain content for the sample variant frame. */
export type SampleTask = {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "in-review" | "blocked" | "done";
  owner: { name: string; initials: string };
  /** Short due label, e.g. "Nov 4". */
  due: string;
};

/** What a variant frame on the mock Compare page shows. */
export type Sample = {
  /** The round on screen: the current one. */
  round: string;
  basedOn: { round: string; pick: string } | null;
  variants: SampleVariant[];
  tasks: SampleTask[];
};

export type LabState = {
  /** The served data dir's name, from config.json. */
  name: string;
  rounds: LabRound[];
  pages: Page[];
  activePage: Page;
  /** Id of the current round: the first open one. */
  current: string;
  /** The tag list the answer panel offers, in its order. */
  tags: Tag[];
  /** taste.jsonl, oldest first, as the app reads it. */
  history: HistoryEntry[];
  library: LibraryItem[];
  sample: Sample;
};
