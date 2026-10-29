import { ChevronRight, CircleCheck } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, type Row, rows } from "@/fixtures";
import { cn } from "@/lib/utils";

const STATUS: Record<
  Row["status"],
  { label: string; variant: "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "secondary" },
  "at-risk": { label: "At risk", variant: "destructive" },
  paused: { label: "Paused", variant: "outline" },
  done: { label: "Done", variant: "outline" },
};

/** Round-002 B with three columns. Owner, progress and updated move into a
 * detail row that opens from the chevron. */
export default function Expandable() {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Table className="tabular-nums">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-px pl-0">
            <span className="sr-only">Details</span>
          </TableHead>
          <TableHead className="text-xs font-normal text-muted-foreground">
            Project
          </TableHead>
          <TableHead className="text-xs font-normal text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="pr-0 text-right text-xs font-normal text-muted-foreground">
            Budget
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const status = STATUS[r.status];
          const isOpen = open.has(r.id);
          const detailId = `${r.id}-details`;
          return [
            <TableRow key={r.id} className={cn(isOpen && "border-b-0")}>
              <TableCell className="w-px py-4 pl-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? detailId : undefined}
                  aria-label={`Details for ${r.name}`}
                  onClick={() => toggle(r.id)}
                >
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </Button>
              </TableCell>
              <TableCell className="py-4 font-medium">{r.name}</TableCell>
              <TableCell className="py-4">
                <Badge variant={status.variant}>
                  {r.status === "done" && (
                    <CircleCheck aria-hidden data-icon="inline-start" />
                  )}
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="py-4 pr-0 text-right font-medium">
                {formatCurrency(r.amount)}
              </TableCell>
            </TableRow>,
            isOpen && (
              <TableRow
                key={detailId}
                id={detailId}
                className="bg-muted/50 hover:bg-muted/50"
              >
                <TableCell />
                <TableCell colSpan={3} className="pt-0 pb-4 whitespace-normal">
                  <dl className="flex flex-wrap gap-x-12 gap-y-3 text-xs">
                    <div className="flex min-w-36 flex-col gap-1">
                      <dt className="text-muted-foreground">Owner</dt>
                      <dd className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback>{r.owner.initials}</AvatarFallback>
                        </Avatar>
                        {r.owner.name}
                      </dd>
                    </div>
                    <div className="flex min-w-36 flex-col gap-1">
                      <dt className="text-muted-foreground">Progress</dt>
                      <dd className="flex items-center gap-2">
                        <Progress
                          value={r.progress}
                          aria-label={`${r.name} progress`}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">
                          {r.progress}%
                        </span>
                      </dd>
                    </div>
                    <div className="flex min-w-36 flex-col gap-1">
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd>{formatDate(r.updated)}</dd>
                    </div>
                  </dl>
                </TableCell>
              </TableRow>
            ),
          ];
        })}
      </TableBody>
    </Table>
  );
}
