import { Columns2, Moon, RectangleHorizontal, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type HistoryEntry, lab } from "@/fixtures";
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

/** The winning variant's label from round.json, if the pick is a variant. */
function winnerLabel(e: HistoryEntry) {
  const round = lab.rounds.find((r) => r.id === e.round);
  return round?.variants?.find((v) => v.id === e.pick)?.label;
}

/** A small icon with a tooltip, for theme and view. */
function Hint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={label}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Round-004 B with more per row: the pick pill names the winning variant,
 * the round links to its compare screen, and two icons show the theme and
 * view the answer was given in.
 */
export default function Richer() {
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
                  <TableHead className="w-32 pl-4">Date</TableHead>
                  <TableHead className="w-48">Round</TableHead>
                  <TableHead className="w-52">Pick</TableHead>
                  <TableHead className="w-36">Tags</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-16 pr-4">
                    <span className="sr-only">Theme and view</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => {
                  const label = winnerLabel(e);
                  return (
                    <TableRow key={`${e.ts}-${e.round}-${e.pick}`}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">
                        {when.format(new Date(e.ts))}
                      </TableCell>
                      <TableCell>
                        {/* In the app this opens #/round/<id>. The mock stays put. */}
                        <a
                          href={`#/round/${e.round}`}
                          onClick={(ev) => ev.preventDefault()}
                          className="font-mono text-xs underline-offset-4 hover:text-primary hover:underline"
                        >
                          {e.round}
                        </a>
                        <span className="ml-2 text-muted-foreground">
                          {e.component}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={e.pick === "none" ? "outline" : "secondary"}
                          className="w-48 justify-start font-mono"
                          title={label ? `${e.pick} · ${label}` : e.pick}
                        >
                          <span className="shrink-0">{e.pick}</span>
                          {label && (
                            <span className="truncate font-sans text-muted-foreground">
                              · {label}
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-0 truncate text-muted-foreground">
                        {e.tags.join(", ")}
                      </TableCell>
                      <TableCell
                        className="max-w-0 truncate"
                        title={e.reason || undefined}
                      >
                        {e.reason}
                      </TableCell>
                      <TableCell className="pr-4">
                        <span className="flex items-center gap-0.5">
                          <Hint label={`Answered in ${e.theme} theme`}>
                            {e.theme === "dark" ? <Moon /> : <Sun />}
                          </Hint>
                          <Hint label={`Answered in ${e.view} view`}>
                            {e.view === "columns" ? (
                              <Columns2 />
                            ) : (
                              <RectangleHorizontal />
                            )}
                          </Hint>
                        </span>
                      </TableCell>
                    </TableRow>
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
