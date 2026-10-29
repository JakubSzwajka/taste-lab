import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { type LabRound, lab, type Page } from "@/fixtures";
import { cn } from "@/lib/utils";

const answered = lab.rounds.filter((r) => r.status === "answered").length;

/** One bar: pages on the left, one round chip with prev, next and a menu of all rounds. */
export default function OneBar() {
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
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <span className="font-semibold">
          taste-lab
          <span className="font-normal text-muted-foreground">
            {" "}
            / {lab.name}
          </span>
        </span>
        <Separator
          orientation="vertical"
          className="data-vertical:h-5 data-vertical:self-center"
        />
        <nav aria-label="Pages" className="flex items-center gap-1">
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

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Previous round"
            disabled={index === 0}
            onClick={() => go(lab.rounds[index - 1].id)}
          >
            <ChevronLeft />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="font-normal">
                <StatusIcon status={shown.status} />
                <span className="font-mono">{shown.id}</span>
                <span className="text-muted-foreground">{shown.component}</span>
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex justify-between">
                <span>Rounds</span>
                <span className="font-normal">
                  {answered} of {lab.rounds.length} answered
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={round} onValueChange={go}>
                {lab.rounds.map((r) => (
                  <DropdownMenuRadioItem key={r.id} value={r.id}>
                    <StatusIcon status={r.status} />
                    <span className="font-mono text-xs">{r.id}</span>
                    <span>{r.component}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {r.status === "answered"
                        ? `pick ${r.pick}`
                        : r.status === "error"
                          ? "error"
                          : r.id === lab.current
                            ? "current"
                            : ""}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Next round"
            disabled={index === lab.rounds.length - 1}
            onClick={() => go(lab.rounds[index + 1].id)}
          >
            <ChevronRight />
          </Button>
        </div>

        <Separator
          orientation="vertical"
          className="data-vertical:h-5 data-vertical:self-center"
        />
        <Button size="icon-sm" variant="ghost" aria-label="Switch theme">
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>
      </header>
      <PageStub page={page} />
    </div>
  );
}

function StatusIcon({
  status,
  className,
}: {
  status: LabRound["status"];
  className?: string;
}) {
  if (status === "answered")
    return <CircleCheck className={cn("text-primary", className)} />;
  if (status === "error")
    return <CircleAlert className={cn("text-destructive", className)} />;
  return <Circle className={cn("text-muted-foreground", className)} />;
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
