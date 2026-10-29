import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

// The done hue comes from the --chart-3 override in round.json.
const STATUS: Record<Row["status"], { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-primary" },
  "at-risk": { label: "At risk", dot: "bg-destructive" },
  paused: { label: "Paused", dot: "bg-muted-foreground" },
  done: { label: "Done", dot: "bg-chart-3" },
};

/** Round-004 A with status as a colored dot plus plain text, no badge. */
export default function StatusDot() {
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
                <span
                  className={cn(
                    "flex items-center gap-2",
                    r.status === "at-risk" && "text-destructive",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", status.dot)}
                  />
                  {status.label}
                </span>
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
