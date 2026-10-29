import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type LabRound, lab, type Page } from "@/fixtures";
import { cn } from "@/lib/utils";

const answered = lab.rounds.filter((r) => r.status === "answered").length;

const DOT: Record<LabRound["status"], string> = {
  answered: "bg-primary",
  open: "border border-muted-foreground/60",
  error: "bg-destructive",
};

/** Two tiers: app nav on top, a sub-bar that is only about the round in view. */
export default function TwoTiers() {
  const [round, setRound] = useState(lab.current);
  const [page, setPage] = useState<Page>(lab.activePage);
  const index = lab.rounds.findIndex((r) => r.id === round);
  const shown = lab.rounds[index];

  function go(id: string) {
    setRound(id);
    setPage("Compare");
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <header>
        <div className="flex h-12 items-center gap-3 border-b px-4">
          <span className="font-semibold">
            taste-lab
            <span className="font-normal text-muted-foreground">
              {" "}
              / {lab.name}
            </span>
          </span>
          <nav aria-label="Pages" className="ml-auto flex items-center gap-1">
            {lab.pages.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={page === p ? "secondary" : "ghost"}
                aria-current={page === p ? "page" : undefined}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
          </nav>
          <Button size="icon-sm" variant="ghost" aria-label="Switch theme">
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>

        <div className="flex h-11 items-center gap-4 border-b bg-muted/40 px-4">
          <div className="flex items-center gap-1">
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Previous round"
              disabled={index === 0}
              onClick={() => go(lab.rounds[index - 1].id)}
            >
              <ChevronLeft />
            </Button>
            <span className="w-20 text-center font-mono text-xs">
              {shown.id}
            </span>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Next round"
              disabled={index === lab.rounds.length - 1}
              onClick={() => go(lab.rounds[index + 1].id)}
            >
              <ChevronRight />
            </Button>
          </div>

          <ol aria-label="Rounds" className="flex items-center">
            {lab.rounds.map((r) => (
              <li key={r.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`${r.id}, ${r.status}`}
                      aria-current={r.id === round ? "step" : undefined}
                      onClick={() => go(r.id)}
                      className="size-5 rounded-full"
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          DOT[r.status],
                          r.id === round &&
                            "ring-2 ring-ring ring-offset-1 ring-offset-background",
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {r.id} · {r.component} · {r.status}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ol>

          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">{shown.component}: </span>
            {shown.question}
          </p>

          {shown.status === "answered" && (
            <Badge variant="outline">pick {shown.pick}</Badge>
          )}
          {shown.status === "error" && (
            <Badge variant="destructive">error</Badge>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {answered} of {lab.rounds.length} answered
            </span>
            <Progress
              aria-hidden="true"
              value={(answered / lab.rounds.length) * 100}
              className="w-24"
            />
          </div>
        </div>
      </header>
      <PageStub page={page} />
    </div>
  );
}

/** Same placeholder page under every variant, so only the header differs. */
function PageStub({ page }: { page: Page }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-muted-foreground">{page} page</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-md border bg-muted/40" />
        <div className="h-24 rounded-md border bg-muted/40" />
        <div className="h-24 rounded-md border bg-muted/40" />
      </div>
    </div>
  );
}
