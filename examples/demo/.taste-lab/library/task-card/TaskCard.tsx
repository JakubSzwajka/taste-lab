import {
  CalendarDays,
  ChevronsUp,
  ChevronUp,
  Ellipsis,
  Equal,
  type LucideIcon,
  MessageSquare,
  Minus,
} from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/fixtures";
import { cn } from "@/lib/utils";

// Components take no values from @/fixtures, so the date format lives here.
// "2026-11-04" -> "Nov 4", in UTC so it never shifts a day.
const dueDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Round-005 B used --chart-* hues for the dots. The stock neutral theme has
// gray charts (chart-1 is near white), so the dots use role tokens and shape.
const STATUS: Record<Task["status"], { label: string; dot: string }> = {
  todo: { label: "Todo", dot: "border border-muted-foreground" },
  "in-progress": { label: "In progress", dot: "bg-primary" },
  "in-review": { label: "In review", dot: "border border-primary" },
  blocked: { label: "Blocked", dot: "bg-destructive" },
  done: { label: "Done", dot: "bg-muted-foreground" },
};

const PRIORITY: Record<
  Task["priority"],
  {
    label: string;
    icon: LucideIcon;
    variant: "outline" | "secondary" | "default" | "destructive";
  }
> = {
  low: { label: "Low", icon: Minus, variant: "outline" },
  medium: { label: "Medium", icon: Equal, variant: "secondary" },
  high: { label: "High", icon: ChevronUp, variant: "default" },
  urgent: { label: "Urgent", icon: ChevronsUp, variant: "destructive" },
};

/** Operator rule (round-003): at most 2 tags in the status row, "+n" for the rest. */
const MAX_TAGS = 2;

/**
 * Operator rule (round-005): every pill in the status row has one height and
 * one padding. Both pills get the same box, and the leading mark (dot or icon)
 * sits in the same 12px slot. No data-icon, so Badge keeps px-2 on both sides.
 */
function Pill({
  variant,
  mark,
  children,
}: {
  variant: "outline" | "secondary" | "default" | "destructive";
  mark: ReactNode;
  children: ReactNode;
}) {
  return (
    <Badge variant={variant} className="h-5 gap-1 px-2">
      <span
        aria-hidden
        className="flex size-3 shrink-0 items-center justify-center"
      >
        {mark}
      </span>
      {children}
    </Badge>
  );
}

/** Tags as quiet muted "#tag" text: no chip, no border. */
function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, MAX_TAGS);
  const rest = tags.slice(MAX_TAGS);
  // One group, so the tags wrap to a new line together.
  return (
    <span className="ml-1 flex items-center gap-2 text-xs">
      {shown.map((tag) => (
        <span key={tag}>#{tag}</span>
      ))}
      {rest.length > 0 && (
        <span>
          <span aria-hidden>+{rest.length}</span>
          <span className="sr-only">
            {rest.length} more tags: {rest.join(", ")}
          </span>
        </span>
      )}
    </span>
  );
}

export type TaskCardProps = {
  task: Task;
  className?: string;
};

/**
 * One task in a list. Status row: id, status pill, priority pill, up to 2
 * quiet #tags. Then title, a 2-line description and an owner footer.
 * From round-005 B.
 */
export function TaskCard({ task, className }: TaskCardProps) {
  const status = STATUS[task.status];
  const priority = PRIORITY[task.priority];
  const PriorityIcon = priority.icon;
  return (
    <Card className={cn("gap-3 shadow-xs", className)}>
      <CardHeader className="gap-1.5">
        <CardDescription className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-xs">{task.id}</span>
          <Pill
            variant="outline"
            mark={<span className={cn("size-1.5 rounded-full", status.dot)} />}
          >
            {status.label}
          </Pill>
          <Pill
            variant={priority.variant}
            mark={<PriorityIcon className="size-3" />}
          >
            {priority.label}
          </Pill>
          <Tags tags={task.tags} />
        </CardDescription>
        <CardTitle className="leading-snug">{task.title}</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${task.id}`}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Open</DropdownMenuItem>
              <DropdownMenuItem>Change status</DropdownMenuItem>
              <DropdownMenuItem>Reassign</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-muted-foreground">{task.description}</p>
      </CardContent>
      <CardFooter className="gap-3 py-2.5 text-xs text-muted-foreground tabular-nums">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{task.assignee.initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-foreground">{task.assignee.name}</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <CalendarDays aria-hidden className="size-3.5" />
          {dueDate.format(new Date(task.due))}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <MessageSquare aria-hidden className="size-3.5" />
          <span aria-hidden>{task.comments}</span>
          <span className="sr-only">
            {task.comments} {task.comments === 1 ? "comment" : "comments"}
          </span>
        </span>
      </CardFooter>
    </Card>
  );
}
