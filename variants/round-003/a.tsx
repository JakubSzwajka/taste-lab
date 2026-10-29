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
import { formatDate, type Task, tasks } from "@/fixtures";
import { cn } from "@/lib/utils";

// Status hues come from --chart-* overrides in round.json.
const STATUS: Record<Task["status"], { label: string; dot: string }> = {
  todo: { label: "Todo", dot: "bg-muted-foreground" },
  "in-progress": { label: "In progress", dot: "bg-chart-1" },
  "in-review": { label: "In review", dot: "bg-chart-2" },
  blocked: { label: "Blocked", dot: "bg-destructive" },
  done: { label: "Done", dot: "bg-chart-3" },
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

/** Round-001 C with the tag badges removed. Status and priority stay. */
export default function NoTags() {
  return (
    <div className="@container">
      <div className="grid gap-3 @2xl:grid-cols-2">
        {tasks.map((t) => {
          const status = STATUS[t.status];
          const priority = PRIORITY[t.priority];
          const PriorityIcon = priority.icon;
          return (
            <Card key={t.id} className="gap-3 shadow-xs">
              <CardHeader>
                <CardDescription className="font-mono text-xs">
                  {t.id}
                </CardDescription>
                <CardTitle className="leading-snug">{t.title}</CardTitle>
                <CardAction>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${t.id}`}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Open</DropdownMenuItem>
                      <DropdownMenuItem>Change status</DropdownMenuItem>
                      <DropdownMenuItem>Reassign</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", status.dot)}
                    />
                    {status.label}
                  </Badge>
                  <Badge variant={priority.variant}>
                    <PriorityIcon aria-hidden data-icon="inline-start" />
                    {priority.label}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-muted-foreground">
                  {t.description}
                </p>
              </CardContent>
              <CardFooter className="gap-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{t.assignee.initials}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-foreground">
                    {t.assignee.name}
                  </span>
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  <CalendarDays aria-hidden className="size-3.5" />
                  {formatDate(t.due)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <MessageSquare aria-hidden className="size-3.5" />
                  <span aria-hidden>{t.comments}</span>
                  <span className="sr-only">
                    {t.comments} {t.comments === 1 ? "comment" : "comments"}
                  </span>
                </span>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
