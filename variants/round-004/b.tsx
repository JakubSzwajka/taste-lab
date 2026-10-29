import { CircleCheck } from "lucide-react";
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

/** Round-002 B without owner avatars: the owner is a quiet text line. */
export default function NoAvatars() {
  return (
    <Table className="tabular-nums">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {/* Two-line headers mirror the two-line cells below. */}
          <TableHead className="h-auto py-2 pl-0 text-xs font-normal text-muted-foreground">
            Project
            <span className="block">Owner</span>
          </TableHead>
          <TableHead className="h-auto py-2 text-xs font-normal text-muted-foreground">
            Status
            <span className="block">Progress</span>
          </TableHead>
          <TableHead className="h-auto py-2 pr-0 text-right text-xs font-normal text-muted-foreground">
            Budget
            <span className="block">Updated</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const status = STATUS[r.status];
          return (
            <TableRow key={r.id}>
              <TableCell className="py-4 pl-0 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium leading-snug">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.owner.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex flex-col gap-2">
                  <Badge variant={status.variant}>
                    {r.status === "done" && (
                      <CircleCheck aria-hidden data-icon="inline-start" />
                    )}
                    {status.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={r.progress}
                      aria-label={`${r.name} progress`}
                      className="w-14"
                    />
                    <span className="text-xs text-muted-foreground">
                      {r.progress}%
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4 pr-0 text-right">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {formatCurrency(r.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.updated)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
