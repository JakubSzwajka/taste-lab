import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, type Task, tasks } from "@/fixtures";
import { cn } from "@/lib/utils";

const STATUS: Record<Task["status"], string> = {
  todo: "Not started",
  "in-progress": "In progress",
  "in-review": "In review",
  blocked: "Blocked",
  done: "Done",
};

/** Calm, editorial: big title, the full description, one quiet meta line. No priority, tags or ids. */
export default function CalmEditorial() {
  return (
    <div className="flex flex-col gap-4">
      {tasks.map((t) => {
        return (
          <Card
            key={t.id}
            className="gap-5 shadow-sm ring-foreground/5 [--card-spacing:--spacing(6)]"
          >
            <CardHeader className="gap-2">
              <CardTitle className="text-lg leading-snug tracking-tight text-balance">
                {t.title}
              </CardTitle>
              <CardDescription className="leading-relaxed text-pretty">
                {t.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>{t.assignee.initials}</AvatarFallback>
                </Avatar>
                <span className="text-foreground">{t.assignee.name}</span>
              </span>
              <Separator orientation="vertical" className="h-4 self-center" />
              <span className="tabular-nums">Due {formatDate(t.due)}</span>
              <span
                className={cn(
                  "ml-auto flex items-center gap-1.5",
                  t.status === "blocked" && "text-destructive",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full bg-current",
                    t.status === "todo" && "opacity-40",
                  )}
                />
                {STATUS[t.status]}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
