import { ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type HistoryEntry, lab } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

// Newest first, as the app sorts the log.
const sorted = [...lab.history].reverse();

// "Oct 29, 10:05", in UTC so a capture never shifts a day.
const when = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const keyOf = (e: HistoryEntry) => `${e.ts}-${e.round}-${e.pick}`;

/** The detail lines for one answer, from its round.json. */
function Detail({ entry }: { entry: HistoryEntry }) {
  const round = lab.rounds.find((r) => r.id === entry.round);
  const winner = round?.variants?.find((v) => v.id === entry.pick);
  const shown = entry.shown.join(", ");
  return (
    <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-1.5 text-sm">
      <dt className="text-muted-foreground">Winner</dt>
      <dd>
        {winner ? (
          <>
            <span className="font-medium">{winner.label}</span>
            <span className="text-muted-foreground"> · {winner.changes}</span>
          </>
        ) : entry.pick === "mix" ? (
          <span className="text-muted-foreground">
            A mix of {shown}. The reason says which parts.
          </span>
        ) : entry.pick === "none" ? (
          <span className="text-muted-foreground">None of {shown}.</span>
        ) : (
          <span className="text-muted-foreground">No label in round.json.</span>
        )}
      </dd>
      <dt className="text-muted-foreground">Question</dt>
      <dd>{round?.question ?? "Round not found."}</dd>
      <dt className="text-muted-foreground">Answered in</dt>
      <dd className="text-muted-foreground">
        {entry.theme} theme, {entry.view} view
      </dd>
    </dl>
  );
}

/**
 * Round-004 B unchanged, plus click-to-expand: a detail row under the entry
 * names the winning variant, the round question, and theme and view.
 */
export default function Expandable() {
  // The two newest answers start open: one "none", one with a named winner.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(sorted.slice(0, 2).map(keyOf)),
  );
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="History"
        className="shrink-0"
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-6">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-lg font-semibold">History</h1>
            <span className="text-xs text-muted-foreground tabular-nums">
              {sorted.length} answers
            </span>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 pl-2">Date</TableHead>
                  <TableHead className="w-48">Round</TableHead>
                  <TableHead className="w-20">Pick</TableHead>
                  <TableHead className="w-44">Tags</TableHead>
                  <TableHead className="pr-4">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => {
                  const k = keyOf(e);
                  const isOpen = open.has(k);
                  return (
                    <Fragment key={k}>
                      <TableRow
                        className={cn(
                          "cursor-pointer",
                          isOpen && "border-b-0 bg-muted/50 hover:bg-muted/50",
                        )}
                        onClick={() => toggle(k)}
                      >
                        <TableCell className="pl-2 text-muted-foreground tabular-nums">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Hide" : "Show"} details for ${e.round}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              toggle(k);
                            }}
                            className="mr-1"
                          >
                            <ChevronRight
                              className={cn(
                                "transition-transform",
                                isOpen && "rotate-90",
                              )}
                            />
                          </Button>
                          {when.format(new Date(e.ts))}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{e.round}</span>
                          <span className="ml-2 text-muted-foreground">
                            {e.component}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.pick === "none" ? "outline" : "secondary"
                            }
                            className="w-12 font-mono"
                          >
                            {e.pick}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.tags.join(", ")}
                        </TableCell>
                        <TableCell
                          className="max-w-0 truncate pr-4"
                          title={e.reason || undefined}
                        >
                          {e.reason}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell
                            colSpan={5}
                            className="whitespace-normal py-3 pr-4 pl-10"
                          >
                            <Detail entry={e} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
