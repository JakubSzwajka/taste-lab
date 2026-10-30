import { CircleAlert, Folder, Inbox, Palette, Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { lab, type ThemeToken, type TokenGroup } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

const { theme } = lab;

// Every pill shares one size (round-004 b, round-007 c).
const PILL = "h-5 w-20 justify-center";

type Mode = "both" | "light" | "dark";
type Pick = TokenGroup | "Problems";

const fromTheme = (t: ThemeToken) =>
  t.light.source === "theme" || t.dark.source === "theme";

/**
 * A pane in one mode. Dark sits under a `.dark` wrapper. Light uses the page's
 * tokens, so in a dark lab it shows a note instead: a variant cannot force
 * light tokens inside a dark page (no style prop).
 */
function ModePane({
  mode,
  children,
}: {
  mode: "light" | "dark";
  children: ReactNode;
}) {
  if (mode === "dark")
    return (
      <div className="dark flex min-w-0 flex-1 flex-col gap-2 rounded-lg border bg-background p-3 text-foreground">
        <p className="text-xs font-medium text-muted-foreground">Dark</p>
        {children}
      </div>
    );
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">Light</p>
      <div className="dark:hidden">{children}</div>
      <p className="hidden flex-1 items-center justify-center rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground dark:flex">
        Light shows with the lab in light.
      </p>
    </div>
  );
}

/** Big swatches for one group, one row per token. */
function Swatches({
  tokens,
  mode,
}: {
  tokens: ThemeToken[];
  mode: "light" | "dark";
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {tokens.map((t) => (
        <li key={t.name} className="flex items-center gap-3">
          {t.name === "--radius" ? (
            <span
              className={cn(
                "h-9 w-16 shrink-0 border-2 border-foreground/60",
                t.swatch,
              )}
            />
          ) : (
            <span
              className={cn(
                "flex h-9 w-16 shrink-0 items-center justify-center rounded-md border text-sm font-medium",
                t.sample ?? t.swatch,
              )}
            >
              {t.sample ? "Aa" : null}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <code className="truncate text-xs">{t.name}</code>
            <code className="truncate text-xs text-muted-foreground">
              {t[mode].value}
            </code>
          </span>
        </li>
      ))}
    </ul>
  );
}

const CHARTS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];
const BAR_HEIGHTS = ["h-6", "h-10", "h-14", "h-9", "h-12"];

/** The group's tokens at work in primitives. */
function InUse({ group }: { group: TokenGroup }) {
  switch (group) {
    case "Surfaces":
      return (
        <div className="flex flex-col gap-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Card on background</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">Card text.</CardContent>
          </Card>
          <div className="rounded-lg border bg-popover p-2 text-sm text-popover-foreground shadow-md">
            Popover
          </div>
        </div>
      );
    case "Brand":
      return (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="secondary">
            Secondary
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="bg-accent text-accent-foreground"
          >
            Accent
          </Button>
          <Badge>primary</Badge>
          <Badge variant="secondary">secondary</Badge>
        </div>
      );
    case "States":
      return (
        <div className="flex flex-col gap-2">
          <Input
            defaultValue="Focused input"
            className="border-ring ring-3 ring-ring/50"
          />
          <Input placeholder="Muted placeholder" />
          <div className="flex gap-1.5">
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">border</Badge>
            <span className="rounded-md bg-muted px-2 text-xs leading-5 text-muted-foreground">
              muted
            </span>
          </div>
        </div>
      );
    case "Charts":
      return (
        <div className="flex h-24 items-end gap-2 rounded-lg border bg-card p-2">
          {CHARTS.map((c, i) => (
            <span
              key={c}
              className={cn("w-full rounded-sm", c, BAR_HEIGHTS[i])}
            />
          ))}
        </div>
      );
    case "Sidebar":
      return (
        <div className="flex flex-col gap-0.5 rounded-lg border border-sidebar-border bg-sidebar p-1.5 text-sm text-sidebar-foreground">
          <span className="flex items-center gap-2 rounded-md bg-sidebar-primary px-2 py-1 text-sidebar-primary-foreground">
            <Inbox className="size-4" /> Inbox
          </span>
          <span className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1 text-sidebar-accent-foreground">
            <Folder className="size-4" /> Projects
          </span>
          <span className="flex items-center gap-2 rounded-md px-2 py-1 ring-2 ring-sidebar-ring">
            <Settings className="size-4" /> Focused
          </span>
        </div>
      );
    case "Shape":
      return (
        <div className="flex items-end gap-3">
          <span className="size-10 rounded-sm border-2 border-foreground/60" />
          <span className="size-10 rounded-md border-2 border-foreground/60" />
          <span className="size-10 rounded-lg border-2 border-foreground/60" />
          <span className="size-10 rounded-xl border-2 border-foreground/60" />
          <span className="text-xs text-muted-foreground">
            sm · md · lg (= --radius) · xl
          </span>
        </div>
      );
  }
}

/**
 * A workbench like the Library page: the groups in the stock sidebar, the
 * picked group on the right with a toolbar (both modes, light or dark), its
 * tokens as big swatches with values and source, and the same tokens at work
 * in primitives. theme.css problems are their own entry.
 */
export default function Workbench() {
  const [pick, setPick] = useState<Pick>("Brand");
  const [mode, setMode] = useState<Mode>("both");
  const group = theme.groups.find((g) => g.name === pick);
  const tokens = theme.tokens.filter((t) => t.group === pick);
  const modes: ("light" | "dark")[] =
    mode === "both" ? ["light", "dark"] : [mode];
  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Theme"
        className="shrink-0"
      />
      <SidebarProvider className="relative min-h-0 flex-1 overflow-hidden">
        <Sidebar className="absolute h-full">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Tokens by role</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {theme.groups.map((g) => {
                    const inGroup = theme.tokens.filter(
                      (t) => t.group === g.name,
                    );
                    const ours = inGroup.filter(fromTheme).length;
                    return (
                      <SidebarMenuItem key={g.name}>
                        <SidebarMenuButton
                          isActive={pick === g.name}
                          onClick={() => setPick(g.name)}
                        >
                          <Palette />
                          <span>{g.name}</span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge
                          className={cn(ours > 0 && "text-primary")}
                        >
                          {ours > 0
                            ? `${ours}/${inGroup.length}`
                            : inGroup.length}
                        </SidebarMenuBadge>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>theme.css</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pick === "Problems"}
                      onClick={() => setPick("Problems")}
                      className="text-destructive"
                    >
                      <CircleAlert />
                      <span>Ignored parts</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="text-destructive">
                      {theme.problems.length}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <p className="px-4 text-xs text-muted-foreground">
              Count in primary: tokens from theme.css / in group. The rest are
              stock.
            </p>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
            <SidebarTrigger aria-label="Toggle groups" />
            <Separator orientation="vertical" className="my-3" />
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="font-medium">
                {pick === "Problems" ? "Ignored parts" : pick}
              </span>
              <span className="text-muted-foreground">
                {" "}
                ·{" "}
                {group
                  ? group.hint
                  : `${theme.problems.length} parts of ${theme.file}`}
              </span>
            </p>
            {pick !== "Problems" && (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={mode}
                onValueChange={(v) => v && setMode(v as Mode)}
              >
                <ToggleGroupItem value="both" className="px-3 text-xs">
                  Both
                </ToggleGroupItem>
                <ToggleGroupItem value="light" className="px-3 text-xs">
                  Light
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" className="px-3 text-xs">
                  Dark
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {pick === "Problems" ? (
              <ul className="flex flex-col divide-y rounded-lg border">
                {theme.problems.map((p) => (
                  <li key={p.line} className="flex flex-col gap-1 px-3 py-2">
                    <p className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        line {p.line}
                      </span>
                      <code className="text-sm">{p.excerpt}</code>
                    </p>
                    <p className="text-xs text-destructive">{p.message}</p>
                  </li>
                ))}
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  The lab drops these parts. The rest of theme.css applies. Run
                  taste-lab check after a fix.
                </li>
              </ul>
            ) : (
              <div className="flex flex-col gap-4">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Light</TableHead>
                      <TableHead>Dark</TableHead>
                      <TableHead className="w-24">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="py-1 font-mono">
                          {t.name}
                        </TableCell>
                        <TableCell className="py-1 font-mono text-muted-foreground">
                          {t.light.value}
                        </TableCell>
                        <TableCell className="py-1 font-mono text-muted-foreground">
                          {t.dark.value}
                        </TableCell>
                        <TableCell className="py-1">
                          {fromTheme(t) ? (
                            <Badge className={PILL}>theme.css</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(PILL, "text-muted-foreground")}
                            >
                              stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex gap-3">
                  {modes.map((m) => (
                    <ModePane key={m} mode={m}>
                      <div className="flex flex-col gap-4">
                        <Swatches tokens={tokens} mode={m} />
                        <Separator />
                        <InUse group={pick as TokenGroup} />
                      </div>
                    </ModePane>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
