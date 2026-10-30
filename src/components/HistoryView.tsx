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
import { formatWhen, historyRows, pickTitle } from "@/lib/history";
import type { LoadedRound } from "@/lib/rounds";
import { hrefFor } from "@/lib/route";
import type { TasteEntry } from "@/lib/taste";

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

/** One dense row per answer: date, round, pick, tags, reason, theme and view. */
export function HistoryView({
  entries,
  skipped,
  rounds,
}: {
  entries: TasteEntry[];
  skipped: number;
  rounds: LoadedRound[];
  /** Accepted so existing callers compile. The page no longer renders variants. */
  theme?: unknown;
}) {
  const rows = historyRows(entries, rounds);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">History</h1>
        <span className="text-xs text-muted-foreground tabular-nums">
          {rows.length} {rows.length === 1 ? "answer" : "answers"}
        </span>
      </div>
      {skipped > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {skipped} line(s) in .taste-lab/taste.jsonl could not be read and are
          hidden.
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No answers yet.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32 pl-4">Date</TableHead>
                <TableHead className="w-48">Round</TableHead>
                <TableHead className="w-52">Pick</TableHead>
                <TableHead className="w-44">Tags</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-16 pr-4">
                  <span className="sr-only">Theme and view</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(
                ({ key, entry: e, label, roundExists, tags, moreTags }) => (
                  <TableRow key={key}>
                    <TableCell className="pl-4 text-muted-foreground tabular-nums">
                      {formatWhen(e.ts)}
                    </TableCell>
                    <TableCell>
                      {roundExists ? (
                        <a
                          href={hrefFor({ page: "round", id: e.round })}
                          className="font-mono text-xs underline-offset-4 hover:text-primary hover:underline"
                        >
                          {e.round}
                        </a>
                      ) : (
                        <span
                          className="font-mono text-xs text-muted-foreground"
                          title="This round is no longer in rounds/"
                        >
                          {e.round}
                        </span>
                      )}
                      <span className="ml-2 text-muted-foreground">
                        {e.component}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={e.pick === "none" ? "outline" : "secondary"}
                        className="w-48 justify-start font-mono"
                        title={pickTitle(e.pick, label)}
                      >
                        <span className="shrink-0">{e.pick}</span>
                        {label && (
                          <span className="truncate font-sans text-muted-foreground">
                            · {label}
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Older answers keep their tags. New ones have none. */}
                      <span className="flex items-center gap-1">
                        {tags.map((t) => (
                          <Badge key={t} variant="outline" className="w-20">
                            <span className="truncate">{t}</span>
                          </Badge>
                        ))}
                        {moreTags > 0 && (
                          <Badge variant="outline" className="w-10">
                            +{moreTags}
                          </Badge>
                        )}
                      </span>
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
                        {e.view && (
                          <Hint label={`Answered in ${e.view} view`}>
                            {e.view === "columns" ? (
                              <Columns2 />
                            ) : (
                              <RectangleHorizontal />
                            )}
                          </Hint>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
