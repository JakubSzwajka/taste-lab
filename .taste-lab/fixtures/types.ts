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
  /**
   * A full-length question as real rounds write them (2 to 4 sentences), for
   * rounds that judge where the question sits (round-019).
   */
  longQuestion: string;
  variants: SampleVariant[];
  tasks: SampleTask[];
};

/** Where a token's value comes from in one mode. */
export type TokenSource = "theme" | "stock";

/** A token's value in one mode, after stock and theme.css are merged. */
export type TokenCell = { value: string; source: TokenSource };

/** The role a token plays, for grouping on the Theme page. */
export type TokenGroup =
  | "Surfaces"
  | "Brand"
  | "States"
  | "Charts"
  | "Sidebar"
  | "Shape";

/** One shadcn token as the Theme page reads it. */
export type ThemeToken = {
  /** The variable, e.g. "--primary". */
  name: string;
  group: TokenGroup;
  light: TokenCell;
  dark: TokenCell;
  /**
   * A semantic class that paints the live token: "bg-primary", or
   * "rounded-lg" for --radius. Inside a `.dark` wrapper it paints the dark
   * value.
   */
  swatch: string;
  /** For a surface with a -foreground pair: both classes, for an "Aa" chip. */
  sample?: string;
};

/** A part of theme.css the lab dropped, as `taste-lab check` reports it. */
export type ThemeProblem = {
  /** 1-based line in theme.css, 0 when the problem has no line. */
  line: number;
  message: string;
  /** The rejected text from theme.css. */
  excerpt: string;
};

/** What the Theme page shows: every token, plus rejected theme.css parts. */
export type ThemeState = {
  /** Path of the theme file, relative to the repo. */
  file: string;
  groups: { name: TokenGroup; hint: string }[];
  tokens: ThemeToken[];
  /** Sample problems. The real .taste-lab/theme.css has none today. */
  problems: ThemeProblem[];
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
  theme: ThemeState;
};
