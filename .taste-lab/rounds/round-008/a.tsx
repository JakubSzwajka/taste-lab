import { CircleAlert } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type LabRound, type LibraryItem, lab } from "@/fixtures";
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

/**
 * Round-005 C's two panes. The right pane is a docs page: every example of
 * the selected entry renders live, stacked at its own width.
 */
export default function DocsPage() {
  const [selected, setSelected] = useState(ENTRIES[0].name);
  const entry = ENTRIES.find((e) => e.name === selected);
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
          aria-label="Library entries"
          className="flex w-72 shrink-0 flex-col gap-1 overflow-y-auto border-r p-3"
        >
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            {ENTRIES.length} entries
          </p>
          {ENTRIES.map((e) => (
            <Button
              key={e.name}
              variant="ghost"
              aria-current={e.name === selected ? "true" : undefined}
              onClick={() => setSelected(e.name)}
              className="h-auto flex-col items-stretch gap-1 px-2 py-2 text-left font-normal aria-[current=true]:bg-muted"
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {e.ok ? e.title : e.name}
                </span>
                <StatusPill entry={e} />
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {e.ok
                  ? `${e.name} · ${e.examples.length} examples`
                  : `${e.errors.length} problems`}
              </span>
            </Button>
          ))}
        </nav>

        <div className="@container min-w-0 flex-1 overflow-y-auto">
          {entry && <Docs key={entry.name} entry={entry} />}
        </div>
      </main>
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

function Docs({ entry }: { entry: LibraryItem }) {
  if (!entry.ok) {
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
  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          {entry.title}
          <StatusPill entry={entry} />
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {entry.description}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          @/library/{entry.name}/
        </p>
      </div>

      {entry.examples.map((ex) => (
        <section
          key={ex.export}
          aria-label={ex.title}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">{ex.title}</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {ex.export} · {ex.width}
            </span>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div
              className={cn(ex.width === "column" ? "w-105 max-w-full" : "")}
            >
              <Example entry={entry.name} name={ex.export} />
            </div>
          </div>
        </section>
      ))}

      <Separator />

      <div className="grid gap-6 @4xl:grid-cols-2">
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
    </div>
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
