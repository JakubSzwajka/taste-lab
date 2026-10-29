import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Row } from "@/fixtures";
import { cn } from "@/lib/utils";

// Components take no values from @/fixtures, so the formats live here.
// Dates in UTC so they never shift a day: "2026-10-27" -> "Oct 27".
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
// Budgets are whole USD. A `style: "currency"` option trips the variant
// scanner's style-prop rule, so the $ is added by hand: 48500 -> "$48,500".
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usd = (n: number) => `${n < 0 ? "-" : ""}$${whole.format(Math.abs(n))}`;

// Pill variants are round-006 C. The dot is the operator's fix to C.
// Round-006 A colored the dots with --primary and --chart-3 overrides. The
// stock neutral theme has gray charts, so the dots use role tokens and shape.
const STATUS: Record<
  Row["status"],
  {
    label: string;
    variant: "secondary" | "destructive" | "outline";
    dot: string;
  }
> = {
  active: { label: "Active", variant: "secondary", dot: "bg-primary" },
  "at-risk": {
    label: "At risk",
    variant: "destructive",
    dot: "bg-destructive",
  },
  paused: {
    label: "Paused",
    variant: "outline",
    dot: "border border-muted-foreground",
  },
  done: { label: "Done", variant: "outline", dot: "bg-muted-foreground" },
};

const head = "text-xs font-normal text-muted-foreground";
/** Operator pick (round-006 C): compact rows, 10px top and bottom. */
const cell = "py-2.5";

export type ProjectTableProps = {
  rows: Row[];
  className?: string;
};

/**
 * Projects, one line per cell: name, owner, status pill with a dot, progress,
 * budget, last update. From round-006 C.
 */
export function ProjectTable({ rows, className }: ProjectTableProps) {
  return (
    <Table className={cn("tabular-nums", className)}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn("pl-0", head)}>Project</TableHead>
          <TableHead className={head}>Owner</TableHead>
          <TableHead className={head}>Status</TableHead>
          <TableHead className={head}>Progress</TableHead>
          <TableHead className={cn("text-right", head)}>Budget</TableHead>
          <TableHead className={cn("pr-0 text-right", head)}>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={6}
              className="py-6 text-center text-muted-foreground"
            >
              No projects
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => {
          const status = STATUS[r.status];
          return (
            <TableRow key={r.id}>
              <TableCell className={cn("pl-0 font-medium", cell)}>
                {r.name}
              </TableCell>
              <TableCell className={cell}>
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{r.owner.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">{r.owner.name}</span>
                </div>
              </TableCell>
              <TableCell className={cell}>
                <Badge variant={status.variant} className="h-5 gap-1.5 px-2">
                  <span
                    aria-hidden
                    className={cn("size-1.5 shrink-0 rounded-full", status.dot)}
                  />
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className={cell}>
                <div className="flex items-center gap-2">
                  <Progress
                    value={r.progress}
                    aria-label={`${r.name} progress`}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    {r.progress}%
                  </span>
                </div>
              </TableCell>
              <TableCell className={cn("text-right font-medium", cell)}>
                {usd(r.amount)}
              </TableCell>
              <TableCell
                className={cn("pr-0 text-right text-muted-foreground", cell)}
              >
                {date.format(new Date(r.updated))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
