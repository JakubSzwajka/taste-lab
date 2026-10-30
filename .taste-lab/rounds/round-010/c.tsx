import { CircleAlert, Folder, Inbox, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lab, type ThemeToken } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

const { theme } = lab;

// Every pill shares one size (round-004 b, round-007 c).
const PILL = "h-5 w-20 justify-center";

const fromTheme = (t: ThemeToken) =>
  t.light.source === "theme" || t.dark.source === "theme";

const CHARTS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];
const BAR_HEIGHTS = ["h-4", "h-7", "h-10", "h-6", "h-9"];

/** A small UI built from the stock primitives, painted by the live tokens. */
function SampleUi() {
  const task = lab.sample.tasks[0];
  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
          <CardDescription>
            {task.id} · {task.owner.name} · due {task.due}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge>primary</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="outline">outline</Badge>
            <Badge variant="destructive">destructive</Badge>
          </div>
          <Progress value={62} />
          <div className="flex items-center gap-2">
            <Input
              defaultValue="Focused input shows --ring"
              className="border-ring ring-3 ring-ring/50"
            />
            <Checkbox defaultChecked aria-label="Done" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm">Submit</Button>
            <Button size="sm" variant="secondary">
              Secondary
            </Button>
            <Button size="sm" variant="outline">
              Outline
            </Button>
            <Button size="sm" variant="ghost">
              Ghost
            </Button>
            <Button size="sm" variant="destructive">
              Delete
            </Button>
          </div>
          <Tabs defaultValue="canvas">
            <TabsList>
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="docs">Docs</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <div className="flex flex-col gap-0.5 rounded-lg border border-sidebar-border bg-sidebar p-1.5 text-xs text-sidebar-foreground">
          <span className="flex items-center gap-1.5 rounded-md bg-sidebar-primary px-2 py-1 text-sidebar-primary-foreground">
            <Inbox className="size-3.5" /> Inbox
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-sidebar-accent px-2 py-1 text-sidebar-accent-foreground">
            <Folder className="size-3.5" /> Projects
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1">
            <Settings className="size-3.5" /> Settings
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex h-14 items-end gap-1.5 rounded-lg border bg-card px-2 pb-1.5 pt-1">
            {CHARTS.map((c, i) => (
              <span
                key={c}
                className={cn("w-full rounded-sm", c, BAR_HEIGHTS[i])}
              />
            ))}
          </div>
          <div className="rounded-lg border bg-popover p-1 text-xs text-popover-foreground shadow-md">
            <p className="rounded-sm bg-accent px-2 py-1 text-accent-foreground">
              Popover, hovered item
            </p>
            <p className="px-2 py-1 text-muted-foreground">Muted item</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Two tiny chips, light then dark, painted by the live token. */
function Chips({ token }: { token: ThemeToken }) {
  const chip = (light: boolean) =>
    cn(
      "size-4 shrink-0 border",
      token.name === "--radius"
        ? cn(token.swatch, "border-foreground/60")
        : cn("rounded-sm", token.swatch),
      light &&
        token.name !== "--radius" &&
        "dark:bg-transparent dark:border-dashed",
    );
  return (
    <span className="flex items-center gap-1">
      <span className={chip(true)} />
      <span className="dark flex rounded-sm bg-background p-px">
        <span className={chip(false)} />
      </span>
    </span>
  );
}

/**
 * Preview first: the same sample UI in light and dark side by side fills the
 * page, so a token change shows in context. A compact token list sits on the
 * right with chips, values and the theme.css marks, and the rejected parts.
 */
export default function PreviewFirst() {
  const overridden = theme.tokens.filter(fromTheme);
  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Theme"
        className="shrink-0"
      />
      <main className="grid min-h-0 flex-1 grid-cols-[1fr_24rem]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold">Theme</h1>
            <span className="text-xs text-muted-foreground">
              The stock primitives with this theme, light and dark
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <section className="flex flex-col gap-2 rounded-lg border p-3">
              <h2 className="text-xs font-medium text-muted-foreground">
                Light
              </h2>
              <div className="dark:hidden">
                <SampleUi />
              </div>
              <p className="hidden flex-1 items-center justify-center rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground dark:flex">
                The light preview shows with the lab in light. A variant cannot
                force light tokens inside a dark page.
              </p>
            </section>
            <section className="dark flex flex-col gap-2 rounded-lg border bg-background p-3 text-foreground">
              <h2 className="text-xs font-medium text-muted-foreground">
                Dark
              </h2>
              <SampleUi />
            </section>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col border-l">
          <div className="flex flex-col gap-0.5 border-b px-3 py-2.5">
            <p className="text-sm font-medium">Tokens</p>
            <p className="text-xs text-muted-foreground">
              {overridden.length} of {theme.tokens.length} from{" "}
              <code>{theme.file}</code>. Unmarked rows are stock. Chips: light,
              dark.
            </p>
          </div>
          {theme.problems.length > 0 && (
            <div
              role="alert"
              className="flex flex-col gap-1 border-b bg-destructive/5 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <CircleAlert className="size-3.5" />
                {theme.problems.length} theme.css parts ignored
              </p>
              {theme.problems.map((p) => (
                <p key={p.line} className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">:{p.line}</span>{" "}
                  <code className="text-foreground">{p.excerpt}</code>
                  <br />
                  {p.message}
                </p>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {theme.groups.map((g) => (
              <div key={g.name}>
                <p className="sticky top-0 border-b bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {g.name}
                </p>
                <ul>
                  {theme.tokens
                    .filter((t) => t.group === g.name)
                    .map((t) => {
                      const ours = fromTheme(t);
                      return (
                        <li
                          key={t.name}
                          className={cn(
                            "flex flex-col gap-0.5 border-b px-3 py-1.5",
                            ours && "bg-primary/5",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <Chips token={t} />
                              <code className="truncate text-xs">{t.name}</code>
                            </span>
                            {ours && <Badge className={PILL}>theme.css</Badge>}
                          </div>
                          <p className="truncate pl-11 font-mono text-[0.6875rem] text-muted-foreground">
                            {t.light.value}
                            {t.dark.value === t.light.value
                              ? " (both)"
                              : ` · ${t.dark.value}`}
                          </p>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
