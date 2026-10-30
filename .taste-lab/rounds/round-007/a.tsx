import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lab } from "@/fixtures";
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

/**
 * Round-004 B with less per row: date, round, pick, reason. No Tags column:
 * tags follow the reason as muted text. An empty reason shows a dash.
 */
export default function Quieter() {
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
                  <TableHead className="w-20">Pick</TableHead>
                  <TableHead className="pr-4">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => {
                  const tags = e.tags.join(", ");
                  const full = [e.reason, tags].filter(Boolean).join(" · ");
                  return (
                    <TableRow key={`${e.ts}-${e.round}-${e.pick}`}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">
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
                          variant={e.pick === "none" ? "outline" : "secondary"}
                          className="w-12 font-mono"
                        >
                          {e.pick}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-0 truncate pr-4"
                        title={full || undefined}
                      >
                        {e.reason ? (
                          e.reason
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                        {tags && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {tags}
                          </span>
                        )}
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
