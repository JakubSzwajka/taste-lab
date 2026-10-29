import { CircleCheck } from "lucide-react";
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
import { formatCurrency, formatDate, type Row, rows } from "@/fixtures";

const STATUS: Record<
  Row["status"],
  { label: string; variant: "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "secondary" },
  "at-risk": { label: "At risk", variant: "destructive" },
  paused: { label: "Paused", variant: "outline" },
  done: { label: "Done", variant: "outline" },
};

/** Round-002 B with each field in its own column: one line per cell, no stacking. */
export default function OneLine() {
  return (
    <Table className="tabular-nums">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-0 text-xs font-normal text-muted-foreground">
            Project
          </TableHead>
          <TableHead className="text-xs font-normal text-muted-foreground">
            Owner
          </TableHead>
          <TableHead className="text-xs font-normal text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="text-xs font-normal text-muted-foreground">
            Progress
          </TableHead>
          <TableHead className="text-right text-xs font-normal text-muted-foreground">
            Budget
          </TableHead>
          <TableHead className="pr-0 text-right text-xs font-normal text-muted-foreground">
            Updated
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const status = STATUS[r.status];
          return (
            <TableRow key={r.id}>
              <TableCell className="py-4 pl-0 font-medium">{r.name}</TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{r.owner.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">{r.owner.name}</span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant={status.variant}>
                  {r.status === "done" && (
                    <CircleCheck aria-hidden data-icon="inline-start" />
                  )}
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
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
              <TableCell className="py-4 text-right font-medium">
                {formatCurrency(r.amount)}
              </TableCell>
              <TableCell className="py-4 pr-0 text-right text-muted-foreground">
                {formatDate(r.updated)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
