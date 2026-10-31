import {
  ChevronDown,
  CircleArrowLeft,
  CircleArrowRight,
  GalleryHorizontal,
  Library,
  type LucideIcon,
  Moon,
  Paintbrush,
  ScrollText,
  Sun,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { lab } from "@/fixtures";
import { cn } from "@/lib/utils";

/**
 * round-017: the logo. Header and colors as settled (round-011 to round-016).
 * Each variant defines Mark (the symbol) and Lockup (mark plus name).
 */

export default function SplitDot() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-background text-foreground">
      <Header />
      <div className="bg-linear-to-b from-primary/10 via-muted/40 to-accent/30">
        <Sheet />
      </div>
    </div>
  );
}

/** Two half discs with a gap: A and B, side by side. Teal and coral. */
function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d="M14.5 3 A13 13 0 0 0 14.5 29 Z" className="fill-primary" />
      <path d="M17.5 3 A13 13 0 0 1 17.5 29 Z" className="fill-chart-1" />
    </svg>
  );
}

function Lockup({ large = false }: { large?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", large && "gap-3")}>
      <Mark className={large ? "size-9" : "size-5"} />
      <span className={cn("tracking-tight", large ? "text-2xl" : "text-sm")}>
        <span className="font-semibold">taste</span>
        <span className="text-muted-foreground"> lab</span>
      </span>
    </span>
  );
}

/** The logo at every size it will meet, on the surfaces it will sit on. */
function Sheet() {
  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-xs tracking-wider text-muted-foreground uppercase">
          Mark sizes: 16, 24, 32, 64, 128
        </h3>
        <div className="flex items-end gap-8">
          <Mark className="size-4" />
          <Mark className="size-6" />
          <Mark className="size-8" />
          <Mark className="size-16" />
          <Mark className="size-32" />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex h-28 items-center justify-center">
            <Lockup />
          </CardContent>
        </Card>
        <div className="flex h-28 items-center justify-center rounded-xl bg-muted">
          <Lockup />
        </div>
        <div className="flex h-28 items-center justify-center rounded-xl border bg-background">
          <Lockup large />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-xs tracking-wider text-muted-foreground uppercase">
          Browser tab
        </h3>
        <div className="flex w-72 items-center gap-2 rounded-t-lg border border-b-0 bg-card px-3 py-2 text-sm">
          <Mark className="size-4" />
          <span className="truncate">taste-lab: round-017</span>
        </div>
      </section>
    </div>
  );
}

const PAGES = ["Compare", "Library", "Theme", "History"] as const;
const PAGE_ICON: Record<(typeof PAGES)[number], LucideIcon> = {
  Compare: GalleryHorizontal,
  Library: Library,
  Theme: Paintbrush,
  History: ScrollText,
};
/** Every icon in this variant: one stroke weight, one size. */
const ICON = "size-5";
const STROKE = 1.75;

/** Glyph in this variant's icon treatment. */
function Glyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className={ICON} strokeWidth={STROKE} />;
}

/**
 * The lab header (library/app-header, round-002 b) as settled in round-016 b:
 * roomy, C icons, plain 1.75 stroke. The first crumb is the logo lockup. The round menu is a plain label here.
 */
function Header() {
  const shown = lab.rounds.find((r) => r.id === lab.current);
  const answered = lab.rounds.filter((r) => r.status === "answered").length;
  return (
    <header className="shrink-0 bg-background text-foreground">
      <div className="flex h-16 gap-4 px-8 items-center border-b">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="text-foreground">
              <Lockup />
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>{lab.name}</BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem className="gap-1 font-mono text-xs text-foreground">
              {shown?.id}
              <ChevronDown className="size-3.5" strokeWidth={STROKE} />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-label="Pages"
          value="Compare"
          className="ml-auto"
        >
          {PAGES.map((p) => (
            <Tooltip key={p}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={p}
                  aria-label={p}
                  className="h-11 min-w-12 text-muted-foreground aria-checked:bg-muted aria-checked:text-foreground"
                >
                  <Glyph icon={PAGE_ICON[p]} />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{p}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
        <Separator
          orientation="vertical"
          className="data-vertical:h-6 data-vertical:self-center"
        />
        <Button size="icon-lg" variant="ghost" aria-label="Switch theme">
          <Sun className={cn("hidden dark:block", ICON)} strokeWidth={STROKE} />
          <Moon className={cn("dark:hidden", ICON)} strokeWidth={STROKE} />
        </Button>
      </div>
      <div className="flex h-12 gap-4 px-8 items-center border-b bg-muted/40">
        <div className="flex items-center gap-1">
          <Button size="icon-lg" variant="ghost" aria-label="Previous round">
            <CircleArrowLeft className={ICON} strokeWidth={STROKE} />
          </Button>
          <Button size="icon-lg" variant="ghost" aria-label="Next round">
            <CircleArrowRight className={ICON} strokeWidth={STROKE} />
          </Button>
        </div>
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="text-muted-foreground">{shown?.component}: </span>
          {shown?.question}
        </p>
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {answered} of {lab.rounds.length} answered
        </span>
        <Progress
          value={(answered / Math.max(lab.rounds.length, 1)) * 100}
          className="w-24"
        />
      </div>
    </header>
  );
}
