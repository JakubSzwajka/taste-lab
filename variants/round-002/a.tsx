import {
  CircleCheck,
  CircleDot,
  CirclePause,
  type LucideIcon,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate, type Row, rows } from "@/fixtures";
import { cn } from "@/lib/utils";

const STATUS: Record<
  Row["status"],
  { label: string; icon: LucideIcon; className: string }
> = {
  active: { label: "Active", icon: CircleDot, className: "text-foreground" },
  "at-risk": {
    label: "At risk",
    icon: TriangleAlert,
    className: "text-destructive",
  },
  paused: {
    label: "Paused",
    icon: CirclePause,
    className: "text-muted-foreground",
  },
  done: {
    label: "Done",
    icon: CircleCheck,
    className: "text-muted-foreground",
  },
};

const total = rows.reduce((sum, r) => sum + r.amount, 0);
const avgProgress = Math.round(
  rows.reduce((sum, r) => sum + r.progress, 0) / rows.length,
);

// Cell padding lives on the table so every cell stays in step.
const GRID =
  "text-xs tabular-nums [&_td]:px-1.5 [&_td]:py-1.5 [&_td:first-child]:pl-2.5 [&_td:last-child]:pr-2.5 [&_th]:h-8 [&_th]:px-1.5 [&_th]:font-normal [&_th]:text-muted-foreground [&_th:first-child]:pl-2.5 [&_th:last-child]:pr-2.5";

// Owner initials drop out only when the frame is phone-narrow.
const OWNER = "hidden @[22rem]:table-cell";

/** Compact grid: one line per row, small type, zebra rows, totals footer. */
export default function CompactGrid() {
  return (
    <div className="@container overflow-hidden rounded-md border bg-card">
      <Table className={GRID}>
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-full">Project</TableHead>
            <TableHead className={OWNER}>Owner</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const status = STATUS[r.status];
            const Icon = status.icon;
            return (
              <TableRow key={r.id} className="even:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="-m-1 size-5"
                        >
                          <Icon
                            aria-hidden
                            className={cn("size-3.5", status.className)}
                          />
                          <span className="sr-only">{status.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{status.label}</TooltipContent>
                    </Tooltip>
                    <span
                      className={cn(
                        "font-medium",
                        r.status === "done" && "text-muted-foreground",
                      )}
                    >
                      {r.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cn(OWNER, "text-muted-foreground")}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="-mx-1 -my-0.5 h-5 px-1 font-normal text-muted-foreground"
                      >
                        {r.owner.initials}
                        <span className="sr-only">, {r.owner.name}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{r.owner.name}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">{r.progress}%</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(r.amount)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDate(r.updated)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className="text-muted-foreground">
              {rows.length} projects
            </TableCell>
            <TableCell className={OWNER} />
            <TableCell className="text-right">{avgProgress}%</TableCell>
            <TableCell className="text-right">
              {formatCurrency(total)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
