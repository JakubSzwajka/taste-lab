import {
  ChevronDown,
  Circle,
  CircleAlert,
  CircleArrowLeft,
  CircleArrowRight,
  CircleCheck,
  GalleryHorizontal,
  Library,
  type LucideIcon,
  Moon,
  Paintbrush,
  ScrollText,
  Sun,
} from "lucide-react";
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
import {
  answeredCount,
  idleNotice,
  PAGES,
  type Page,
  pageOf,
  type RoundItem,
  type RoundStatus,
  roundItems,
  stepTargets,
} from "@/lib/header";
import type { LoadedRound } from "@/lib/rounds";
import { hrefFor, type Route } from "@/lib/route";
import type { TasteEntry } from "@/lib/taste";
import type { Theme } from "@/lib/theme";

const ICON: Record<Page, LucideIcon> = {
  compare: GalleryHorizontal,
  library: Library,
  theme: Paintbrush,
  history: ScrollText,
};

const go = (href: string) => {
  location.hash = href;
};

/**
 * Two tiers from round-002 b. Roomy spacing and the C icon set from round-015
 * mix, with plain 20px icons at stroke 1.75 from round-016 b.
 */
export function AppHeader({
  labName,
  route,
  rounds,
  entries,
  shown,
  theme,
  onToggleTheme,
}: {
  labName: string;
  route: Route;
  rounds: LoadedRound[];
  entries: TasteEntry[];
  /** The round the Compare page shows: the routed one, or the current round. */
  shown: LoadedRound | undefined;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const page = pageOf(route);
  const items = roundItems(rounds, entries);
  // A routed id that matches no round still shows in the breadcrumb.
  const roundLabel =
    shown?.id ?? (route.page === "round" ? route.id : idleNotice(items).crumb);

  return (
    <header className="shrink-0 bg-background text-foreground">
      <div className="border-b">
        <div className="flex h-16 items-center gap-4 px-8">
          {/* Below sm the lab crumbs hide, so the page crumb keeps the room. */}
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem className="hidden font-semibold text-foreground sm:inline-flex">
                taste-lab
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block">
                /
              </BreadcrumbSeparator>
              <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
                <BreadcrumbLink
                  href={hrefFor({ page: "current" })}
                  title={labName}
                  className="max-w-40 truncate lg:max-w-96"
                >
                  {labName}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block">
                /
              </BreadcrumbSeparator>
              {page === "compare" ? (
                <BreadcrumbItem className="min-w-0">
                  <RoundMenu
                    label={roundLabel}
                    items={items}
                    shownId={shown?.id}
                  />
                </BreadcrumbItem>
              ) : (
                <PageCrumbs route={route} />
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            aria-label="Pages"
            value={page}
            // Items navigate on click. The route, not this group, owns the value.
            onValueChange={() => {}}
            className="ml-auto"
          >
            {PAGES.map((p) => {
              const Icon = ICON[p.id];
              // The tooltip trigger overwrites data-state, so the active item
              // is styled by aria-checked (as in .taste-lab round-002 b).
              return (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value={p.id}
                      aria-label={p.label}
                      aria-current={page === p.id ? "page" : undefined}
                      onClick={() => go(p.href)}
                      className="h-11 min-w-12 text-muted-foreground aria-checked:bg-muted aria-checked:text-foreground"
                    >
                      <Icon strokeWidth={1.75} className="size-5" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>{p.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </ToggleGroup>
          <Separator
            orientation="vertical"
            className="data-vertical:h-6 data-vertical:self-center"
          />
          <Button
            size="icon-lg"
            variant="ghost"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun strokeWidth={1.75} className="size-5" />
            ) : (
              <Moon strokeWidth={1.75} className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {page === "compare" && items.length > 0 && (
        <RoundTier
          route={route}
          items={items}
          shown={shown}
          shownItem={items.find((i) => i.id === shown?.id)}
        />
      )}
    </header>
  );
}

/** Last crumbs off the Compare page: the page name, plus the library entry. */
function PageCrumbs({ route }: { route: Route }) {
  const label = PAGES.find((p) => p.id === pageOf(route))?.label ?? "";
  if (route.page !== "library-entry") {
    return (
      <BreadcrumbItem>
        <BreadcrumbPage>{label}</BreadcrumbPage>
      </BreadcrumbItem>
    );
  }
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbLink href={hrefFor({ page: "library" })}>
          {label}
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem className="min-w-0">
        <BreadcrumbPage className="truncate font-mono" title={route.name}>
          {route.name}
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

/** round-001 d's last crumb: a menu of every round with its status. */
function RoundMenu({
  label,
  items,
  shownId,
}: {
  label: string;
  items: RoundItem[];
  shownId: string | undefined;
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
          <ChevronDown
            strokeWidth={1.75}
            className="size-5 shrink-0 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex justify-between">
          <span>Rounds</span>
          <span className="font-normal">
            {answeredCount(items)} of {items.length} answered
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <p className="px-1.5 py-1 text-sm text-muted-foreground">
            No rounds yet
          </p>
        )}
        {items.map((r) => (
          <DropdownMenuItem key={r.id} asChild>
            <a
              href={r.href}
              aria-current={r.id === shownId ? "page" : undefined}
              className="aria-[current=page]:bg-muted"
            >
              <StatusIcon status={r.status} />
              <span className="font-mono text-xs">{r.id}</span>
              <span className="truncate">{r.component}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {statusText(r.status)}
              </span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const statusText = (s: RoundStatus) =>
  s.kind === "answered" ? `pick ${s.pick}` : s.kind;

/** round-001 c's second tier: arrows, the question, the answered count. */
function RoundTier({
  route,
  items,
  shown,
  shownItem,
}: {
  route: Route;
  items: RoundItem[];
  shown: LoadedRound | undefined;
  shownItem: RoundItem | undefined;
}) {
  const { prev, next } = stepTargets(items, route, shown?.id);
  const answered = answeredCount(items);
  // The full text for the title, since the line truncates when narrow.
  const tierText = shown?.ok
    ? `${shown.spec.component}: ${shown.spec.question}`
    : undefined;
  return (
    <div className="border-b bg-muted/40">
      <div className="flex h-12 items-center gap-4 px-8">
        <div className="flex items-center gap-1">
          <Button
            size="icon-lg"
            variant="ghost"
            aria-label="Previous round"
            disabled={!prev}
            onClick={() => prev && go(prev.href)}
          >
            <CircleArrowLeft strokeWidth={1.75} className="size-5" />
          </Button>
          <Button
            size="icon-lg"
            variant="ghost"
            aria-label="Next round"
            disabled={!next}
            onClick={() => next && go(next.href)}
          >
            <CircleArrowRight strokeWidth={1.75} className="size-5" />
          </Button>
        </div>

        <p className="min-w-0 flex-1 truncate text-sm" title={tierText}>
          {shown?.ok ? (
            <>
              <span className="text-muted-foreground">
                {shown.spec.component}:{" "}
              </span>
              {shown.spec.question}
            </>
          ) : shown ? (
            <span className="text-muted-foreground">
              This round could not be loaded.
            </span>
          ) : (
            <span className="text-muted-foreground">
              {route.page === "round"
                ? `No round called ${route.id}.`
                : idleNotice(items).message}
            </span>
          )}
        </p>

        {shownItem?.status.kind === "answered" && (
          <Badge variant="outline">pick {shownItem.status.pick}</Badge>
        )}
        {shownItem?.status.kind === "error" && (
          <Badge variant="destructive">error</Badge>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {answered} of {items.length} answered
          </span>
          <Progress
            aria-hidden="true"
            value={(answered / items.length) * 100}
            className="hidden w-24 sm:block"
          />
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: RoundStatus }) {
  if (status.kind === "answered")
    return <CircleCheck strokeWidth={1.75} className="size-5 text-primary" />;
  if (status.kind === "error")
    return (
      <CircleAlert strokeWidth={1.75} className="size-5 text-destructive" />
    );
  return <Circle strokeWidth={1.75} className="size-5 text-muted-foreground" />;
}
