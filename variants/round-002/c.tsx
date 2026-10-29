import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, type Row, rows } from "@/fixtures";
import { cn } from "@/lib/utils";

// Dot hues: --primary and --chart-4 are set in round.json.
const STATUS: Record<Row["status"], { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-primary" },
  "at-risk": { label: "At risk", dot: "bg-destructive" },
  paused: { label: "Paused", dot: "bg-chart-4" },
  done: { label: "Done", dot: "bg-muted-foreground" },
};

/** Row as card: every row is a small card with labeled fields and a progress bar. */
export default function RowCards() {
  return (
    <div className="@container">
      <ul className="grid gap-2.5 @xl:grid-cols-2">
        {rows.map((r) => {
          const status = STATUS[r.status];
          const atRisk = r.status === "at-risk";
          return (
            <li key={r.id}>
              <Card size="sm" className="gap-3 shadow-xs">
                <CardHeader>
                  <CardTitle>{r.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {r.id}
                  </CardDescription>
                  <CardAction>
                    <Badge variant={atRisk ? "destructive" : "outline"}>
                      <span
                        aria-hidden
                        className={cn("size-1.5 rounded-full", status.dot)}
                      />
                      {status.label}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-5 gap-y-0.5 text-sm tabular-nums">
                    <dt className="text-xs text-muted-foreground">Owner</dt>
                    <dt className="text-xs text-muted-foreground">Budget</dt>
                    <dt className="text-right text-xs text-muted-foreground">
                      Updated
                    </dt>
                    <dd className="flex min-w-0 items-center gap-1.5">
                      <Avatar size="sm">
                        <AvatarFallback>{r.owner.initials}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{r.owner.name}</span>
                    </dd>
                    <dd className="self-center font-medium">
                      {formatCurrency(r.amount)}
                    </dd>
                    <dd className="self-center text-right">
                      {formatDate(r.updated)}
                    </dd>
                  </dl>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={r.progress}
                      aria-label={`${r.name} progress`}
                      className={cn(
                        "h-1.5",
                        atRisk &&
                          "*:data-[slot=progress-indicator]:bg-destructive",
                      )}
                    />
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {r.progress}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
