import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleSlash,
  type LucideIcon,
  MessageSquare,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  TriangleAlert,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, type Task, tasks } from "@/fixtures";
import { cn } from "@/lib/utils";

const STATUS: Record<
  Task["status"],
  { label: string; icon: LucideIcon; className: string }
> = {
  todo: {
    label: "Todo",
    icon: CircleDashed,
    className: "text-muted-foreground",
  },
  "in-progress": {
    label: "In progress",
    icon: CircleDot,
    className: "text-foreground",
  },
  "in-review": {
    label: "In review",
    icon: CircleDotDashed,
    className: "text-foreground",
  },
  blocked: {
    label: "Blocked",
    icon: CircleSlash,
    className: "text-destructive",
  },
  done: {
    label: "Done",
    icon: CircleCheck,
    className: "text-muted-foreground",
  },
};

const PRIORITY: Record<
  Task["priority"],
  { label: string; icon: LucideIcon; className: string }
> = {
  low: { label: "Low", icon: SignalLow, className: "text-muted-foreground" },
  medium: {
    label: "Medium",
    icon: SignalMedium,
    className: "text-muted-foreground",
  },
  high: { label: "High", icon: SignalHigh, className: "text-foreground" },
  urgent: {
    label: "Urgent",
    icon: TriangleAlert,
    className: "text-destructive",
  },
};

/** Dense, scannable: two tight lines per card, icons carry status and priority. */
export default function DenseList() {
  return (
    <div className="flex flex-col gap-1.5">
      {tasks.map((t) => {
        const status = STATUS[t.status];
        const priority = PRIORITY[t.priority];
        const StatusIcon = status.icon;
        const PriorityIcon = priority.icon;
        const done = t.status === "done";
        return (
          <Card key={t.id} size="sm" className="py-2.5">
            <CardContent className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex shrink-0">
                      <StatusIcon
                        aria-hidden
                        className={cn("size-4", status.className)}
                      />
                      <span className="sr-only">{status.label}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{status.label}</TooltipContent>
                </Tooltip>
                <CardTitle
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative flex shrink-0">
                      {t.priority !== "urgent" && (
                        // Faint full bar set behind, so low and medium still read as bars.
                        <Signal
                          aria-hidden
                          className="absolute inset-0 size-4 text-muted-foreground/30"
                        />
                      )}
                      <PriorityIcon
                        aria-hidden
                        className={cn("relative size-4", priority.className)}
                      />
                      <span className="sr-only">{priority.label} priority</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{priority.label} priority</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex min-w-0 items-center gap-3 pl-6 text-xs text-muted-foreground tabular-nums">
                <span className="font-mono">{t.id}</span>
                <span>{formatDate(t.due)}</span>
                {t.comments > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare aria-hidden className="size-3" />
                    {t.comments}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  {t.tags.join(", ")}
                </span>
                <Avatar size="sm" aria-label={t.assignee.name}>
                  <AvatarFallback>{t.assignee.initials}</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
