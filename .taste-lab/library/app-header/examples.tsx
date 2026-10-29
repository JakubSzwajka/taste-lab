import type { ReactNode } from "react";
import { type LabRound, lab } from "@/fixtures";
import { AppHeader } from "./AppHeader";

/** The header alone, framed like the top of a page. */
function Frame({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border">{children}</div>;
}

/** Compare page on the current round: crumb menu, tier with question and count. */
export function Compare() {
  return (
    <Frame>
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Compare"
      />
    </Frame>
  );
}

/** Off Compare: the crumb names the page and the round tier is hidden. */
export function LibraryPage() {
  return (
    <Frame>
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Library"
      />
    </Frame>
  );
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

/** All rounds answered: "all answered" crumb, full bar, only the back arrow. */
export function AllAnswered() {
  return (
    <Frame>
      <AppHeader
        labName={lab.name}
        rounds={allAnswered}
        current={undefined}
        page="Compare"
      />
    </Frame>
  );
}

/** A round that failed to load: error badge, no question. */
export function BrokenRound() {
  const broken = lab.rounds.find((r) => r.status === "error");
  return (
    <Frame>
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={broken?.id}
        page="Compare"
      />
    </Frame>
  );
}
