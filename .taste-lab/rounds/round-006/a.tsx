import { Check } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { lab, type SampleVariant } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

const round = lab.rounds.find((r) => r.id === lab.sample.round);
const variants = lab.sample.variants;
const ids = variants.map((v) => v.id);

/**
 * Round-003 c with one change: tags. The bar has two rows, and the second
 * shows every tag as a small toggle, always in view.
 */
export default function TwoRowBar() {
  const [active, setActive] = useState(ids[0] ?? "");
  const [pick, setPick] = useState("");
  const [view, setView] = useState<"columns" | "flip">("flip");
  const flip = view === "flip";

  function handlePick(id: string) {
    setPick(id);
    if (ids.includes(id)) setActive(id);
  }

  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Compare"
        className="shrink-0"
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-6 pb-4">
          <RoundBadges />
          <Tabs
            value={active}
            onValueChange={setActive}
            className="flex-1 gap-4"
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
                          <Check data-icon="inline-start" />
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

function RoundBadges() {
  const based = lab.sample.basedOn;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">{round?.id}</Badge>
      <Badge variant="outline">{round?.level}</Badge>
      <Badge variant="outline">{round?.component}</Badge>
      {based && (
        <Badge variant="outline">
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
      <ToggleGroupItem value="columns">Side by side</ToggleGroupItem>
      <ToggleGroupItem value="flip">Full width</ToggleGroupItem>
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
        "flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/30",
        selected && "ring-2 ring-primary",
      )}
    >
      <header className="flex flex-col gap-1 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono uppercase">
            {variant.id} · {hotkey}
          </Badge>
          <h2 className="text-sm font-medium">{variant.label}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{variant.changes}</p>
      </header>
      <div className="min-w-0 flex-1 bg-background p-4">
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
        {lab.sample.tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {t.id}
              </span>
              {t.title}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{STATUS[t.status]}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {variant !== "b" && (
                  <Avatar size="sm">
                    <AvatarFallback>{t.owner.initials}</AvatarFallback>
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

/**
 * The answer bar in two rows. Row 1: pick, reason, submit. Row 2: every tag
 * as a small toggle, always in view, so a tag is one click.
 */
function AnswerBar({
  pick,
  onPick,
}: {
  pick: string;
  onPick: (id: string) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const canSubmit = pick !== "" && !(pick === "mix" && reason.trim() === "");
  return (
    <form
      aria-label="Answer"
      className="flex shrink-0 flex-col gap-2 border-t bg-card px-4 py-3 text-card-foreground"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-wrap items-center gap-3">
        <PickGroup pick={pick} onPick={onPick} />
        <Textarea
          aria-label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            pick === "mix"
              ? "Required: say which parts to mix"
              : "Why? A few words is enough."
          }
          rows={1}
          className="min-h-8 min-w-48 flex-1 resize-none py-1.5"
        />
        <Button type="submit" disabled={!canSubmit}>
          Submit
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Tags</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={1}
          value={tags}
          onValueChange={setTags}
          aria-label="Tags"
          className="flex-wrap"
        >
          {lab.tags.map((t) => (
            <ToggleGroupItem key={t} value={t} className="min-w-16">
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </form>
  );
}

/** Pick a variant, none or mix. Same as round-003 c. */
function PickGroup({
  pick,
  onPick,
}: {
  pick: string;
  onPick: (id: string) => void;
}) {
  return (
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
  );
}
