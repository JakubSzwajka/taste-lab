import {
  Blend,
  ChevronDown,
  CircleArrowLeft,
  CircleArrowRight,
  Columns3,
  GalleryHorizontal,
  GitBranch,
  Layers,
  Library,
  type LucideIcon,
  Moon,
  Paintbrush,
  PanelsTopLeft,
  ScrollText,
  SendHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { lab, type SampleVariant } from "@/fixtures";
import { cn } from "@/lib/utils";

const round = lab.rounds.find((r) => r.id === lab.sample.round);
const variants = lab.sample.variants;
const ids = variants.map((v) => v.id);

/**
 * round-019: the Compare page as built (rounds 012 to 016), with a full-length
 * question from the fixture. Only where and how big the question sits differs.
 */
export default function TierToday() {
  const [active, setActive] = useState(ids[0] ?? "");
  const [pick, setPick] = useState("");
  const [view, setView] = useState<"columns" | "flip">("flip");
  const flip = view === "flip";

  function handlePick(id: string) {
    setPick(id);
    if (ids.includes(id)) setActive(id);
  }

  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-xl border bg-background text-foreground">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-linear-to-b from-primary/10 via-muted/40 to-accent/30 gap-8 px-8 pt-8 pb-8">
          <RoundBadges />
          <Tabs
            value={active}
            onValueChange={setActive}
            className="flex-1 gap-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {flip ? (
                <TabsList
                  aria-label="Variants"
                  className="group-data-horizontal/tabs:h-10"
                >
                  {variants.map((v, i) => (
                    <TabsTrigger
                      key={v.id}
                      value={v.id}
                      className="flex-none px-3 transition-none"
                    >
                      <span className="uppercase">{v.id}</span>
                      <span className="hidden max-w-48 truncate font-normal text-muted-foreground sm:inline">
                        {v.label}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {i + 1}
                      </Badge>
                      {pick === v.id && (
                        <Badge>
                          <Sparkles
                            data-icon="inline-start"
                            strokeWidth={STROKE}
                          />
                          Picked
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {ids.length} variants side by side
                </span>
              )}
              <ViewSwitch view={view} onChange={setView} />
            </div>

            <div
              className={
                flip ? "flex flex-1 flex-col" : "grid flex-1 grid-cols-3 gap-4"
              }
            >
              {variants.map((v, i) => (
                <TabsContent
                  key={v.id}
                  value={v.id}
                  forceMount
                  hidden={flip && active !== v.id}
                  className="flex min-w-0 flex-col text-base"
                >
                  <Frame variant={v} hotkey={i + 1} selected={pick === v.id} />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>

        <AnswerBar pick={pick} onPick={handlePick} />
      </main>
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
 * The lab header (library/app-header, round-002 b), copied in so this round
 * can swap its icons and spacing. The round menu is a plain label here.
 */
function Header() {
  const shown = lab.rounds.find((r) => r.id === lab.current);
  const answered = lab.rounds.filter((r) => r.status === "answered").length;
  return (
    <header className="shrink-0 bg-background text-foreground">
      <div className="flex h-16 gap-4 px-8 items-center border-b">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="font-semibold text-foreground">
              taste.lab
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
          {lab.sample.longQuestion}
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

function RoundBadges() {
  const based = lab.sample.basedOn;
  return (
    <div className="flex flex-wrap items-center gap-3 [&>*]:rounded-full [&>*]:border-transparent [&>*]:bg-accent [&>*]:text-accent-foreground">
      <Badge variant="secondary">{round?.id}</Badge>
      <Badge variant="outline">
        <Layers data-icon="inline-start" strokeWidth={STROKE} />
        {round?.level}
      </Badge>
      <Badge variant="outline">
        <Blend data-icon="inline-start" strokeWidth={STROKE} />
        {round?.component}
      </Badge>
      {based && (
        <Badge variant="outline">
          <GitBranch data-icon="inline-start" strokeWidth={STROKE} />
          based on {based.round} / {based.pick}
        </Badge>
      )}
    </div>
  );
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: "columns" | "flip";
  onChange: (v: "columns" | "flip") => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={view}
      onValueChange={(v) => (v === "columns" || v === "flip") && onChange(v)}
      aria-label="Preview mode"
    >
      <ToggleGroupItem value="columns">
        <Columns3 strokeWidth={STROKE} />
        Side by side
      </ToggleGroupItem>
      <ToggleGroupItem value="flip">
        <PanelsTopLeft strokeWidth={STROKE} />
        Full width
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** VariantFrame: label header on a card strip, the variant on the page color. */
function Frame({
  variant,
  hotkey,
  selected,
}: {
  variant: SampleVariant;
  hotkey: number;
  selected: boolean;
}) {
  return (
    <section
      aria-label={`Variant ${variant.id}: ${variant.label}`}
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-md",
        selected && "ring-2 ring-primary",
      )}
    >
      <header className="flex flex-col bg-linear-to-r from-primary/15 via-card to-card gap-1.5 px-7 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Badge className="font-mono uppercase">
            {variant.id} · {hotkey}
          </Badge>
          <h2 className="text-base font-semibold tracking-tight">
            {variant.label}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{variant.changes}</p>
      </header>
      <div className="min-w-0 flex-1 bg-card px-7 pb-7 [&_td]:py-3.5 [&_th]:h-12">
        <SampleTable variant={variant.id} />
      </div>
    </section>
  );
}

const STATUS: Record<string, string> = {
  todo: "Todo",
  "in-progress": "In progress",
  "in-review": "In review",
  blocked: "Blocked",
  done: "Done",
};

/** Status colors come from the chart tokens; blocked uses destructive. */
const STATUS_CLASS: Record<string, string> = {
  todo: "border-transparent bg-chart-4/15 text-chart-4",
  "in-progress": "border-transparent bg-chart-1/15 text-chart-1",
  "in-review": "border-transparent bg-chart-2/15 text-chart-2",
  blocked: "border-transparent bg-destructive/15 text-destructive",
  done: "border-transparent bg-chart-3/15 text-chart-3",
};

const AVATAR_CLASS = [
  "bg-chart-1/20 text-chart-1",
  "bg-chart-5/20 text-chart-5",
  "bg-chart-2/20 text-chart-2",
];

/** The round on screen (round-010: owner avatars in rows). */
function SampleTable({ variant }: { variant: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lab.sample.tasks.map((t, i) => (
          <TableRow key={t.id}>
            <TableCell>
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {t.id}
              </span>
              {t.title}
            </TableCell>
            <TableCell>
              <Badge className={STATUS_CLASS[t.status]}>
                {STATUS[t.status]}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {variant !== "b" && (
                  <Avatar size="sm">
                    <AvatarFallback
                      className={AVATAR_CLASS[i % AVATAR_CLASS.length]}
                    >
                      {t.owner.initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                {variant !== "c" && t.owner.name}
              </div>
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">
              {t.due}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** One row, no tags: pick, a single-line reason, submit. */
function AnswerBar({
  pick,
  onPick,
}: {
  pick: string;
  onPick: (id: string) => void;
}) {
  const [reason, setReason] = useState("");
  const canSubmit = pick !== "" && !(pick === "mix" && reason.trim() === "");
  return (
    <form
      aria-label="Answer"
      className="m-3 flex shrink-0 flex-wrap items-center rounded-xl border bg-card gap-4 px-8 py-4 text-card-foreground shadow-lg"
      onSubmit={(e) => e.preventDefault()}
    >
      <ToggleGroup
        type="single"
        variant="outline"
        value={pick}
        onValueChange={(v) => v && onPick(v)}
        aria-label="Pick a variant"
      >
        {ids.map((id, i) => (
          <ToggleGroupItem key={id} value={id} aria-label={`Variant ${id}`}>
            <span className="uppercase">{id}</span>
            <Badge variant="outline" className="font-mono">
              {i + 1}
            </Badge>
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="none">
          None{" "}
          <Badge variant="outline" className="font-mono">
            n
          </Badge>
        </ToggleGroupItem>
        <ToggleGroupItem value="mix">
          Mix{" "}
          <Badge variant="outline" className="font-mono">
            m
          </Badge>
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator
        orientation="vertical"
        className="data-vertical:h-6 data-vertical:self-center"
      />

      <Textarea
        aria-label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => {
          // One line: Enter submits instead of adding a line break.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={
          pick === "mix"
            ? "Required: say which parts to mix"
            : "Why? A few words is enough."
        }
        rows={1}
        className="field-sizing-fixed h-8 min-h-8 min-w-48 flex-1 resize-none overflow-hidden py-1.5 whitespace-nowrap"
      />

      <Button type="submit" disabled={!canSubmit}>
        Submit
        <SendHorizontal data-icon="inline-end" strokeWidth={STROKE} />
      </Button>
    </form>
  );
}
