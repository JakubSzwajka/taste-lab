import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Moon,
  Sun,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type LabRound, type LibraryItem, lab, type Page } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

// Every pill shares one size, per the operator's prior.
const PILL = "h-5 w-16 justify-center";

// The lab's real library entry, from library/app-header/meta.json. Rounds
// cannot import meta.json, so its fields are copied here.
const APP_HEADER: LibraryItem = {
  ok: true,
  name: "app-header",
  title: "App header",
  status: "agreed",
  description:
    'The lab\'s header: breadcrumb taste-lab / <lab> / <round menu>, icon-only page toggles and theme switch in a 56px top bar, and on Compare a round tier with arrows, the question, the pick or error badge and "n of N answered" with a bar.',
  examples: [
    { export: "Compare", title: "Compare page, current round", width: "full" },
    {
      export: "LibraryPage",
      title: "Library page: page crumb, no round tier",
      width: "full",
    },
    { export: "AllAnswered", title: "All rounds answered", width: "full" },
    {
      export: "BrokenRound",
      title: "A round that could not be loaded",
      width: "full",
    },
  ],
  provenance: [
    {
      round: "round-001",
      pick: "mix",
      note: "D's breadcrumb and round menu, C's round tier, D's icons made bigger in round-002.",
    },
    {
      round: "round-002",
      pick: "b",
      note: '"< and > icons should be slightly bigger. other then dat. perfect"',
    },
  ],
  rules: [
    "Two tiers. Top bar: breadcrumb taste-lab / <name> / <round menu>.",
    'Round tier on Compare pages only: prev and next, the question, the pick or error badge, "n of N answered" with a bar.',
    "Page nav as icon-only outline toggles with names in tooltips, 40px tall with 20px icons.",
    "Off Compare, the breadcrumb names the page and the round tier is hidden.",
    "Never list every round as a button in the header.",
  ],
};

const ENTRIES: LibraryItem[] = [APP_HEADER, ...lab.library];

// AllAnswered example: every round answered, so none is open.
const allAnswered: LabRound[] = lab.rounds.map((r) =>
  r.status === "answered"
    ? r
    : {
        id: r.id,
        component: r.component,
        level: r.level,
        question: r.question,
        status: "answered",
        pick: "a",
        tags: [],
      },
);
const brokenId = lab.rounds.find((r) => r.status === "error")?.id;

type Width = "column" | "full";
type Mode = "light" | "dark";
type Surface = "plain" | "muted";
type Tier = "auto" | "on" | "off";

/** AppHeader's props as controls, plus one fixture switch (all answered). */
type Args = {
  page: Page;
  current: string | undefined;
  tier: Tier;
  allAnswered: boolean;
};

/** Each example of app-header is a preset of the controls. */
const PRESETS: Record<string, Args> = {
  Compare: {
    page: "Compare",
    current: lab.current,
    tier: "auto",
    allAnswered: false,
  },
  LibraryPage: {
    page: "Library",
    current: lab.current,
    tier: "auto",
    allAnswered: false,
  },
  AllAnswered: {
    page: "Compare",
    current: undefined,
    tier: "auto",
    allAnswered: true,
  },
  BrokenRound: {
    page: "Compare",
    current: brokenId,
    tier: "auto",
    allAnswered: false,
  },
};

/**
 * Round-005 C's two panes as a Storybook: a tree of entries and examples, a
 * large canvas, and a controls panel that edits the component's props live.
 */
export default function CanvasControls() {
  const first = ENTRIES[0];
  const [entryName, setEntryName] = useState(first.name);
  const [exampleName, setExampleName] = useState(
    first.ok ? first.examples[0]?.export : undefined,
  );
  const [open, setOpen] = useState<string[]>([first.name]);
  const [width, setWidth] = useState<Width>("full");
  const [mode, setMode] = useState<Mode>("light");
  const [surface, setSurface] = useState<Surface>("plain");
  const [tab, setTab] = useState("canvas");
  const [args, setArgs] = useState<Args>(PRESETS.Compare);

  const entry = ENTRIES.find((e) => e.name === entryName) ?? first;
  const example = entry.ok
    ? entry.examples.find((x) => x.export === exampleName)
    : undefined;

  const pick = (e: LibraryItem, x?: string) => {
    setEntryName(e.name);
    const ex = e.ok
      ? (e.examples.find((y) => y.export === x) ?? e.examples[0])
      : undefined;
    setExampleName(ex?.export);
    // Opening an example, from the tree or the Docs list, shows its canvas.
    setTab("canvas");
    if (ex) setWidth(ex.width);
    if (ex && PRESETS[ex.export] && e.name === "app-header") {
      setArgs(PRESETS[ex.export]);
    }
  };

  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Library"
        className="shrink-0"
      />
      <main className="flex min-h-0 flex-1">
        <nav
          aria-label="Library entries and examples"
          className="flex w-72 shrink-0 flex-col gap-0.5 overflow-y-auto border-r p-3"
        >
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            {ENTRIES.length} entries
          </p>
          {ENTRIES.map((e) => {
            const expanded = open.includes(e.name);
            const Chevron = expanded ? ChevronDown : ChevronRight;
            return (
              <div key={e.name} className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  aria-expanded={e.ok ? expanded : undefined}
                  aria-current={
                    !e.ok && e.name === entryName ? "true" : undefined
                  }
                  onClick={() => {
                    setOpen((o) =>
                      expanded ? o.filter((n) => n !== e.name) : [...o, e.name],
                    );
                    if (!expanded || !e.ok) pick(e);
                  }}
                  className="h-8 justify-start gap-1.5 px-2 font-normal aria-[current=true]:bg-muted"
                >
                  {e.ok ? (
                    <Chevron className="size-4 text-muted-foreground" />
                  ) : (
                    <CircleAlert className="size-4 text-destructive" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-left font-medium">
                    {e.ok ? e.title : e.name}
                  </span>
                  <StatusPill entry={e} />
                </Button>
                {e.ok &&
                  expanded &&
                  e.examples.map((x) => (
                    <Button
                      key={x.export}
                      variant="ghost"
                      aria-current={
                        e.name === entryName && x.export === exampleName
                          ? "true"
                          : undefined
                      }
                      onClick={() => pick(e, x.export)}
                      className="h-7 justify-start gap-2 pr-2 pl-8 font-normal text-muted-foreground aria-[current=true]:bg-muted aria-[current=true]:text-foreground"
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        {x.export}
                      </span>
                      <span className="font-mono text-xs">{x.width}</span>
                    </Button>
                  ))}
              </div>
            );
          })}
        </nav>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="min-w-0 flex-1 gap-0"
        >
          <div className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
            <TabsList variant="line">
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="docs">Docs</TabsTrigger>
            </TabsList>
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
              {entry.name}
              {example && ` / ${example.export}`}
            </p>
          </div>

          <TabsContent value="canvas" className="flex min-h-0 flex-col">
            {!entry.ok ? (
              <Errors entry={entry} />
            ) : (
              <>
                <Toolbar
                  width={width}
                  setWidth={setWidth}
                  mode={mode}
                  setMode={setMode}
                  surface={surface}
                  setSurface={setSurface}
                />
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-auto",
                    mode === "dark" && "dark",
                  )}
                >
                  <div
                    className={cn(
                      "flex min-h-full flex-col items-center gap-3 p-8 text-foreground",
                      surface === "plain" ? "bg-background" : "bg-muted",
                    )}
                  >
                    {example && (
                      <>
                        <div
                          className={cn(
                            width === "column" ? "w-105 max-w-full" : "w-full",
                          )}
                        >
                          {entry.name === "app-header" ? (
                            <div className="overflow-hidden rounded-lg border">
                              <AppHeader
                                labName={lab.name}
                                rounds={
                                  args.allAnswered ? allAnswered : lab.rounds
                                }
                                current={args.current}
                                page={args.page}
                                showRoundTier={
                                  args.tier === "auto"
                                    ? undefined
                                    : args.tier === "on"
                                }
                                onPageChange={(page) =>
                                  setArgs((a) => ({ ...a, page }))
                                }
                                onRoundChange={(current) =>
                                  setArgs((a) => ({ ...a, current }))
                                }
                              />
                            </div>
                          ) : (
                            <Example
                              key={`${entry.name}/${example.export}`}
                              entry={entry.name}
                              name={example.export}
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {example.title}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Controls entry={entry.name} args={args} setArgs={setArgs} />
              </>
            )}
          </TabsContent>

          <TabsContent value="docs" className="min-h-0 overflow-y-auto">
            {entry.ok ? (
              <Docs entry={entry} onOpen={(x) => pick(entry, x)} />
            ) : (
              <Errors entry={entry} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Toolbar({
  width,
  setWidth,
  mode,
  setMode,
  surface,
  setSurface,
}: {
  width: Width;
  setWidth: (w: Width) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  surface: Surface;
  setSurface: (s: Surface) => void;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label="Canvas width"
        value={width}
        onValueChange={(v) => v && setWidth(v as Width)}
      >
        <ToggleGroupItem value="column">Column 420</ToggleGroupItem>
        <ToggleGroupItem value="full">Full</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label="Canvas theme"
        value={mode}
        onValueChange={(v) => v && setMode(v as Mode)}
      >
        <ToggleGroupItem value="light" aria-label="Light canvas">
          <Sun />
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Dark canvas">
          <Moon />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label="Canvas background"
        value={surface}
        onValueChange={(v) => v && setSurface(v as Surface)}
      >
        <ToggleGroupItem value="plain">Plain</ToggleGroupItem>
        <ToggleGroupItem value="muted">Muted</ToggleGroupItem>
      </ToggleGroup>
      {/* The canvas can only add .dark; a light canvas needs the lab in light. */}
      <span className="hidden text-xs text-muted-foreground dark:inline">
        Light canvas follows the lab theme.
      </span>
    </div>
  );
}

/** Storybook-style args table under the canvas. */
function Controls({
  entry,
  args,
  setArgs,
}: {
  entry: string;
  args: Args;
  setArgs: (f: (a: Args) => Args) => void;
}) {
  const set = (patch: Partial<Args>) => setArgs((a) => ({ ...a, ...patch }));
  const roundLabel = (id: string | undefined) => {
    if (!id) return "undefined";
    const r = (args.allAnswered ? allAnswered : lab.rounds).find(
      (x) => x.id === id,
    );
    return r ? `${id} (${r.status})` : id;
  };
  return (
    <section
      aria-label="Controls"
      className="flex max-h-80 shrink-0 flex-col border-t"
    >
      <h2 className="flex h-9 shrink-0 items-center border-b px-4 text-xs font-medium">
        Controls
      </h2>
      {entry !== "app-header" ? (
        <p className="p-4 text-sm text-muted-foreground">
          No controls: this entry is fixture data, not a component in library/.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36 pl-4">Prop</TableHead>
                <TableHead>Control</TableHead>
                <TableHead className="hidden @5xl:table-cell">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="pl-4 font-mono text-xs">page</TableCell>
                <TableCell>
                  <ToggleGroup
                    type="single"
                    size="sm"
                    variant="outline"
                    spacing={0}
                    aria-label="page"
                    value={args.page}
                    onValueChange={(v) => v && set({ page: v as Page })}
                  >
                    {lab.pages.map((p) => (
                      <ToggleGroupItem key={p} value={p}>
                        {p}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </TableCell>
                <TableCell className="hidden text-muted-foreground @5xl:table-cell">
                  The active page. Off Compare it ends the crumb.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-4 font-mono text-xs">
                  current
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="font-mono">
                        {roundLabel(args.current)}
                        <ChevronDown className="text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onSelect={() => set({ current: lab.current })}
                      >
                        {roundLabel(lab.current)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => set({ current: brokenId })}
                      >
                        {roundLabel(brokenId)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => set({ current: undefined })}
                      >
                        undefined
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="hidden text-muted-foreground @5xl:table-cell">
                  The round Compare shows. The arrows and menu change it.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-4 font-mono text-xs">
                  showRoundTier
                </TableCell>
                <TableCell>
                  <ToggleGroup
                    type="single"
                    size="sm"
                    variant="outline"
                    spacing={0}
                    aria-label="showRoundTier"
                    value={args.tier}
                    onValueChange={(v) => v && set({ tier: v as Tier })}
                  >
                    <ToggleGroupItem value="auto">auto</ToggleGroupItem>
                    <ToggleGroupItem value="on">true</ToggleGroupItem>
                    <ToggleGroupItem value="off">false</ToggleGroupItem>
                  </ToggleGroup>
                </TableCell>
                <TableCell className="hidden text-muted-foreground @5xl:table-cell">
                  The second tier. auto means Compare only.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-4 font-mono text-xs">rounds</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="round-008-c-all-answered"
                      checked={args.allAnswered}
                      onCheckedChange={(c) => set({ allAnswered: c === true })}
                    />
                    <label htmlFor="round-008-c-all-answered">
                      all answered
                    </label>
                  </div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground @5xl:table-cell">
                  Fixture switch: every round gets a pick.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function Errors({ entry }: { entry: LibraryItem }) {
  if (entry.ok) return null;
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="flex items-center gap-2 font-mono text-lg font-semibold">
        {entry.name}
        <StatusPill entry={entry} />
      </h1>
      <p className="text-sm text-muted-foreground">
        Nothing to preview until these are fixed.
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {entry.errors.map((m) => (
          <li key={m} className="flex items-start gap-2 text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Docs({
  entry,
  onOpen,
}: {
  entry: Extract<LibraryItem, { ok: true }>;
  onOpen: (example: string) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          {entry.title}
          <StatusPill entry={entry} />
        </h1>
        <p className="text-sm text-muted-foreground">{entry.description}</p>
        <p className="font-mono text-xs text-muted-foreground">
          @/library/{entry.name}/
        </p>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Examples</h2>
        <ul className="flex flex-col text-sm">
          {entry.examples.map((x) => (
            <li key={x.export}>
              <Button
                variant="link"
                className="h-7 px-0"
                onClick={() => onOpen(x.export)}
              >
                {x.title}
              </Button>
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {x.export} · {x.width}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Rules</h2>
        {entry.rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {entry.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Provenance</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {entry.provenance.map((p) => (
            <li key={`${p.round}-${p.pick}`} className="flex gap-2">
              <span className="font-mono text-xs leading-5 underline underline-offset-4">
                {p.round}
              </span>
              <Badge variant="outline" className="w-16 font-mono">
                pick {p.pick}
              </Badge>
              {p.note && (
                <span className="text-muted-foreground">{p.note}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusPill({ entry }: { entry: LibraryItem }) {
  if (!entry.ok) {
    return (
      <Badge variant="destructive" className={PILL}>
        error
      </Badge>
    );
  }
  return (
    <Badge
      variant={entry.status === "agreed" ? "secondary" : "outline"}
      className={PILL}
    >
      {entry.status}
    </Badge>
  );
}

/** One example, live. app-header is the real component; others stand in. */
function Example({ entry, name }: { entry: string; name: string }) {
  if (entry === "app-header") {
    return (
      <div className="overflow-hidden rounded-lg border">
        <AppHeader
          labName={lab.name}
          rounds={name === "AllAnswered" ? allAnswered : lab.rounds}
          current={
            name === "AllAnswered"
              ? undefined
              : name === "BrokenRound"
                ? brokenId
                : lab.current
          }
          page={name === "LibraryPage" ? "Library" : "Compare"}
        />
      </div>
    );
  }
  return <Placeholder entry={entry} name={name} />;
}

/** Stand-ins built from primitives: these entries are fixture data only. */
function Placeholder({ entry, name }: { entry: string; name: string }) {
  const tasks = lab.sample.tasks;
  let body: ReactNode = null;
  if (entry === "task-card") {
    body = (
      <div className="grid gap-2">
        {tasks.slice(0, name === "Default" ? 3 : 1).map((t) => (
          <Card key={t.id} size="sm">
            <CardHeader>
              <CardTitle>{t.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 w-20 justify-center">
                {t.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{t.due}</span>
              <Avatar size="sm" className="ml-auto">
                <AvatarFallback>{t.owner.initials}</AvatarFallback>
              </Avatar>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } else if (entry === "project-table") {
    body = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {name === "Empty" ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No projects.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.title}</TableCell>
                <TableCell>{t.owner.name}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell className="text-right">{t.due}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  } else {
    body = (
      <div className="flex flex-wrap gap-2">
        {["todo", "in-progress", "in-review", "blocked", "done"].map((s) => (
          <Badge key={s} variant="outline" className="h-5 w-24 justify-center">
            {s}
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {body}
      <p className="text-xs text-muted-foreground">
        Placeholder: this entry is fixture data, so primitives stand in for it.
      </p>
    </div>
  );
}
