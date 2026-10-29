import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  Columns2,
  History,
  LibraryBig,
  type LucideIcon,
  Moon,
  Palette,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { type LabRound, lab, type Page } from "@/fixtures";
import { cn } from "@/lib/utils";

const answered = lab.rounds.filter((r) => r.status === "answered").length;

const ICON: Record<Page, LucideIcon> = {
  Compare: Columns2,
  Library: LibraryBig,
  Theme: Palette,
  History: History,
};

/** D's breadcrumb and C's round tier. Pages as icon plus label in the top bar. */
export default function LabeledIcons() {
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
          <RoundCrumb round={round} onPick={go} />

          <nav aria-label="Pages" className="ml-auto flex items-center gap-1">
            {lab.pages.map((p) => {
              const Icon = ICON[p];
              return (
                <Button
                  key={p}
                  variant={page === p ? "secondary" : "ghost"}
                  aria-current={page === p ? "page" : undefined}
                  onClick={() => setPage(p)}
                  className={cn(page !== p && "text-muted-foreground")}
                >
                  <Icon data-icon="inline-start" />
                  {p}
                </Button>
              );
            })}
          </nav>
          <Separator
            orientation="vertical"
            className="data-vertical:h-5 data-vertical:self-center"
          />
          <Button size="icon" variant="ghost" aria-label="Switch theme">
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>

        <RoundTier index={index} shown={shown} onPick={go} />
      </header>
      <PageStub page={page} />
    </div>
  );
}

/** D's breadcrumb: the last segment is a menu of all rounds. */
function RoundCrumb({
  round,
  onPick,
}: {
  round: string;
  onPick: (id: string) => void;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="font-semibold text-foreground">
          taste-lab
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>{lab.name}</BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="-mx-2 font-mono font-normal text-foreground"
              >
                {round}
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel className="flex justify-between">
                <span>Rounds</span>
                <span className="font-normal">
                  {answered} of {lab.rounds.length} answered
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={round} onValueChange={onPick}>
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
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** C's second tier: stepper, the question, answered count with a bar. */
function RoundTier({
  index,
  shown,
  onPick,
}: {
  index: number;
  shown: LabRound;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex h-11 items-center gap-3 border-b bg-muted/40 px-4">
      <div className="flex items-center gap-1">
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Previous round"
          disabled={index === 0}
          onClick={() => onPick(lab.rounds[index - 1].id)}
        >
          <ChevronLeft />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Next round"
          disabled={index === lab.rounds.length - 1}
          onClick={() => onPick(lab.rounds[index + 1].id)}
        >
          <ChevronRight />
        </Button>
      </div>

      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="text-muted-foreground">{shown.component}: </span>
        {shown.question}
      </p>

      {shown.status === "answered" && (
        <Badge variant="outline">pick {shown.pick}</Badge>
      )}
      {shown.status === "error" && <Badge variant="destructive">error</Badge>}

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
    <div className="flex min-h-80 flex-col gap-3 p-4">
      <p className="text-xs text-muted-foreground">{page} page</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-md border bg-muted/40" />
        <div className="h-24 rounded-md border bg-muted/40" />
        <div className="h-24 rounded-md border bg-muted/40" />
      </div>
    </div>
  );
}
