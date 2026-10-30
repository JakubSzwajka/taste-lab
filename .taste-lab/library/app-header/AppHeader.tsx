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
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LabRound, Page } from "@/fixtures";
import { cn } from "@/lib/utils";

const PAGES: Page[] = ["Compare", "Library", "Theme", "History"];

const ICON: Record<Page, LucideIcon> = {
  Compare: Columns2,
  Library: LibraryBig,
  Theme: Palette,
  History: History,
};

export type AppHeaderProps = {
  /** The served data dir's name, from config.json. */
  labName: string;
  rounds: LabRound[];
  /**
   * The round the Compare page shows. Undefined when no round is open: the
   * crumb then says "all answered" or "none open", as in the app.
   */
  current: string | undefined;
  /** The active page. Its icon is lit and, off Compare, its name ends the crumb. */
  page: Page;
  /** Show the round tier under the top bar. Defaults to Compare only. */
  showRoundTier?: boolean;
  /**
   * Called when the round menu or the arrows pick a round. Without it the
   * header keeps the picked round itself, so the menu and arrows still work.
   */
  onRoundChange?: (id: string) => void;
  /** Called when a page icon (or the lab name) is clicked. */
  onPageChange?: (page: Page) => void;
  className?: string;
};

/**
 * The lab header, agreed in round-001 (mix) and round-002 b: a breadcrumb with
 * a round menu, icon-only page toggles at 40px with 20px icons, and a round
 * tier with 20px arrows in 36px buttons, the question, the pick and the count.
 * Mirrors src/components/AppHeader.tsx.
 */
export function AppHeader({
  labName,
  rounds,
  current,
  page,
  showRoundTier = page === "Compare",
  onRoundChange,
  onPageChange,
  className,
}: AppHeaderProps) {
  const [own, setOwn] = useState(current);
  const shownId = onRoundChange ? current : own;
  const pickRound = (id: string) => {
    if (onRoundChange) onRoundChange(id);
    else setOwn(id);
  };

  const index = rounds.findIndex((r) => r.id === shownId);
  const shown = index < 0 ? undefined : rounds[index];
  const idle = idleNotice(rounds);
  // With every round answered, "previous" steps back to the last round.
  const prev = shown ? rounds[index - 1] : rounds.at(-1);
  const next = shown ? rounds[index + 1] : undefined;
  const answered = rounds.filter((r) => r.status === "answered").length;

  return (
    <header className={cn("bg-background text-foreground", className)}>
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="font-semibold text-foreground">
              taste-lab
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild>
                <button
                  type="button"
                  title={labName}
                  onClick={() => onPageChange?.("Compare")}
                  className="max-w-40 truncate lg:max-w-96"
                >
                  {labName}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            {page === "Compare" ? (
              <BreadcrumbItem className="min-w-0">
                <RoundMenu
                  label={shown?.id ?? idle.crumb}
                  rounds={rounds}
                  shownId={shown?.id}
                  answered={answered}
                  onPick={pickRound}
                />
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{page}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-label="Pages"
          value={page}
          // Clicks report the page. The caller, not this group, owns the value.
          onValueChange={() => {}}
          className="ml-auto"
        >
          {PAGES.map((p) => {
            const Icon = ICON[p];
            // The tooltip trigger overwrites data-state, so the active item
            // is styled by aria-checked (as in round-002 b).
            return (
              <Tooltip key={p}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={p}
                    aria-label={p}
                    aria-current={page === p ? "page" : undefined}
                    onClick={() => onPageChange?.(p)}
                    className="h-10 min-w-11 text-muted-foreground aria-checked:bg-muted aria-checked:text-foreground"
                  >
                    <Icon className="size-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{p}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
        <Separator
          orientation="vertical"
          className="data-vertical:h-6 data-vertical:self-center"
        />
        <Button size="icon-lg" variant="ghost" aria-label="Switch theme">
          <Sun className="hidden size-5 dark:block" />
          <Moon className="size-5 dark:hidden" />
        </Button>
      </div>

      {showRoundTier && rounds.length > 0 && (
        <div className="flex h-11 items-center gap-3 border-b bg-muted/40 px-4">
          <div className="flex items-center gap-1">
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label="Previous round"
              disabled={!prev}
              onClick={() => prev && pickRound(prev.id)}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label="Next round"
              disabled={!next}
              onClick={() => next && pickRound(next.id)}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>

          <p
            className="min-w-0 flex-1 truncate text-sm"
            title={
              shown?.status === "error"
                ? undefined
                : shown && `${shown.component}: ${shown.question}`
            }
          >
            {!shown ? (
              <span className="text-muted-foreground">{idle.message}</span>
            ) : shown.status === "error" ? (
              <span className="text-muted-foreground">
                This round could not be loaded.
              </span>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {shown.component}:{" "}
                </span>
                {shown.question}
              </>
            )}
          </p>

          {shown?.status === "answered" && (
            <Badge variant="outline">pick {shown.pick}</Badge>
          )}
          {shown?.status === "error" && (
            <Badge variant="destructive">error</Badge>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {answered} of {rounds.length} answered
            </span>
            <Progress
              aria-hidden="true"
              value={(answered / rounds.length) * 100}
              className="hidden w-24 sm:block"
            />
          </div>
        </div>
      )}
    </header>
  );
}

/** What the Compare page says when no round is open, as in src/lib/header.ts. */
function idleNotice(rounds: LabRound[]): { crumb: string; message: string } {
  if (rounds.length === 0) return { crumb: "no rounds", message: "No rounds." };
  const broken = rounds.filter((r) => r.status === "error").length;
  if (broken > 0) {
    return {
      crumb: "none open",
      message: `No round to answer: ${broken} could not be loaded.`,
    };
  }
  return { crumb: "all answered", message: "All rounds answered." };
}

/** The last crumb on Compare: a menu of every round with its status. */
function RoundMenu({
  label,
  rounds,
  shownId,
  answered,
  onPick,
}: {
  label: string;
  rounds: LabRound[];
  shownId: string | undefined;
  answered: number;
  onPick: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          title={label}
          className="-mx-2 min-w-0 shrink font-mono font-normal text-foreground"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex justify-between">
          <span>Rounds</span>
          <span className="font-normal">
            {answered} of {rounds.length} answered
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {rounds.length === 0 && (
          <p className="px-1.5 py-1 text-sm text-muted-foreground">
            No rounds yet
          </p>
        )}
        {rounds.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onSelect={() => onPick(r.id)}
            aria-current={r.id === shownId ? "page" : undefined}
            className="aria-[current=page]:bg-muted"
          >
            <StatusIcon status={r.status} />
            <span className="font-mono text-xs">{r.id}</span>
            <span className="truncate">{r.component}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {r.status === "answered" ? `pick ${r.pick}` : r.status}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusIcon({ status }: { status: LabRound["status"] }) {
  if (status === "answered") return <CircleCheck className="text-primary" />;
  if (status === "error") return <CircleAlert className="text-destructive" />;
  return <Circle className="text-muted-foreground" />;
}
