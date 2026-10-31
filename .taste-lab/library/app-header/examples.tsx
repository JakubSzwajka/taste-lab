import type { ReactNode } from "react";
import { type LabRound, lab, type Page } from "@/fixtures";
import { AppHeader } from "./AppHeader";

/**
 * Props the Library Controls panel sets (meta.json `controls`). Set ones win
 * over the example's own values.
 */
export type AppHeaderArgs = {
  page?: Page;
  /** Fixture round to show: the current one, the broken one, or none. */
  round?: "current" | "broken" | "none";
  /** Unset: the component default, the tier on Compare only. */
  showRoundTier?: boolean;
  /** Fixture switch: every round gets a pick. */
  allAnswered?: boolean;
  labName?: string;
};

/** The roomy round-016 b header alone, framed like the top of a page. */
function Frame({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border">{children}</div>;
}

// Every round answered: no round is open, so none is shown.
const allAnswered: LabRound[] = lab.rounds.map((r) =>
  r.status === "answered"
    ? r
    : {
        id: r.id,
        component: r.component,
        level: r.level,
        question: r.question,
        status: "answered",
        pick: "a",
        tags: [],
      },
);
const brokenId = lab.rounds.find((r) => r.status === "error")?.id;

/** The example's own values, then the set controls over them. */
function Preview({
  base,
  args,
}: {
  base: Required<Pick<AppHeaderArgs, "page" | "round">> & AppHeaderArgs;
  args: AppHeaderArgs;
}) {
  const round = args.round ?? base.round;
  return (
    <Frame>
      <AppHeader
        // The header keeps its own round state: a new round or fixture resets it.
        key={`${round}/${args.allAnswered ?? base.allAnswered}`}
        labName={args.labName ?? base.labName ?? lab.name}
        rounds={
          (args.allAnswered ?? base.allAnswered) ? allAnswered : lab.rounds
        }
        current={
          round === "current"
            ? lab.current
            : round === "broken"
              ? brokenId
              : undefined
        }
        page={args.page ?? base.page}
        showRoundTier={args.showRoundTier ?? base.showRoundTier}
      />
    </Frame>
  );
}

/** Compare: crumb menu, round id and component, count. Question lives in the answer bar (round-019 d). */
export function Compare(args: AppHeaderArgs) {
  return <Preview base={{ page: "Compare", round: "current" }} args={args} />;
}

/** Off Compare: the crumb names the page and the round tier is hidden. */
export function LibraryPage(args: AppHeaderArgs) {
  return <Preview base={{ page: "Library", round: "current" }} args={args} />;
}

/** All rounds answered: "all answered" crumb, full bar, only the back arrow. */
export function AllAnswered(args: AppHeaderArgs) {
  return (
    <Preview
      base={{ page: "Compare", round: "none", allAnswered: true }}
      args={args}
    />
  );
}

/** A round that failed to load: error badge, no question. */
export function BrokenRound(args: AppHeaderArgs) {
  return <Preview base={{ page: "Compare", round: "broken" }} args={args} />;
}
