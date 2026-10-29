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

export type LabState = {
  /** The served data dir's name, from config.json. */
  name: string;
  rounds: LabRound[];
  pages: Page[];
  activePage: Page;
  /** Id of the current round: the first open one. */
  current: string;
};
