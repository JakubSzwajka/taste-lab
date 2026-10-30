import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { lab, type ThemeToken, type TokenCell } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

const { theme } = lab;

// Every pill shares one size (round-004 b, round-007 c).
const PILL = "h-5 w-20 justify-center";

// A variant cannot set light tokens inside a dark lab (no style prop), so a
// light swatch turns into a dashed outline there. The value text stays exact.
const LIGHT_ONLY = "dark:bg-transparent dark:border-dashed";

type Filter = "all" | "theme" | "stock";

const fromTheme = (t: ThemeToken) =>
  t.light.source === "theme" || t.dark.source === "theme";

/** A small chip painted by the live token, and its value. */
function Cell({
  token,
  cell,
  mode,
}: {
  token: ThemeToken;
  cell: TokenCell;
  mode: "light" | "dark";
}) {
  const radius = token.name === "--radius";
  const chip = (
    <span
      role="img"
      aria-label={`${token.name} ${mode}`}
      className={cn(
        "size-5 shrink-0 border",
        radius
          ? cn(token.swatch, "border-2 border-foreground/60")
          : cn("rounded-sm", token.swatch),
        mode === "light" && !radius && LIGHT_ONLY,
      )}
    />
  );
  return (
    <div className="flex items-center gap-2">
      {mode === "dark" ? (
        <span className="dark flex rounded-sm bg-background p-0.5">{chip}</span>
      ) : (
        <span className="flex p-0.5">{chip}</span>
      )}
      <code
        className={cn(
          "truncate text-xs",
          cell.source === "theme" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {cell.value}
      </code>
    </div>
  );
}

/**
 * The current page's table, made dense and grouped by role: one row per token,
 * light and dark side by side, a source pill, group rows with counts, a filter
 * for theme.css or stock, and the rejected parts above.
 */
export default function TokenTable() {
  const [filter, setFilter] = useState<Filter>("all");
  const overridden = theme.tokens.filter(fromTheme);
  const shown = theme.tokens.filter((t) =>
    filter === "all" ? true : filter === "theme" ? fromTheme(t) : !fromTheme(t),
  );
  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Theme"
        className="shrink-0"
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h1 className="text-lg font-semibold">Theme</h1>
              <span className="text-xs text-muted-foreground tabular-nums">
                {overridden.length} of {theme.tokens.length} from{" "}
                <code>{theme.file}</code>, the rest stock
              </span>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={filter}
              onValueChange={(v) => v && setFilter(v as Filter)}
            >
              <ToggleGroupItem value="all" className="px-3 text-xs">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="theme" className="px-3 text-xs">
                theme.css
              </ToggleGroupItem>
              <ToggleGroupItem value="stock" className="px-3 text-xs">
                Stock
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {theme.problems.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 text-sm"
            >
              <p className="flex items-center gap-2 border-b border-destructive/30 px-3 py-2 font-medium text-destructive">
                <CircleAlert className="size-4" />
                {theme.problems.length} parts of theme.css are ignored. Fix
                them, then run taste-lab check.
              </p>
              <ul className="divide-y">
                {theme.problems.map((p) => (
                  <li
                    key={p.line}
                    className="grid grid-cols-[4rem_minmax(0,18rem)_1fr] items-baseline gap-3 px-3 py-1.5"
                  >
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      line {p.line}
                    </span>
                    <code className="truncate text-xs">{p.excerpt}</code>
                    <span className="text-xs text-muted-foreground">
                      {p.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Token</TableHead>
                  <TableHead>
                    Light
                    <span className="hidden font-normal text-xs text-muted-foreground dark:inline">
                      {" "}
                      · dashed in a dark lab, switch to light to see
                    </span>
                  </TableHead>
                  <TableHead>Dark</TableHead>
                  <TableHead className="w-28">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {theme.groups.map((g) => {
                  const inGroup = shown.filter((t) => t.group === g.name);
                  if (inGroup.length === 0) return null;
                  return [
                    <TableRow key={g.name} className="hover:bg-transparent">
                      <TableCell
                        colSpan={4}
                        className="bg-muted/40 py-1.5 text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">
                          {g.name}
                        </span>{" "}
                        · {inGroup.length} · {g.hint}
                      </TableCell>
                    </TableRow>,
                    ...inGroup.map((t) => (
                      <TableRow key={t.name} className="h-9">
                        <TableCell className="py-1 font-mono text-xs">
                          {t.name}
                        </TableCell>
                        <TableCell className="py-1">
                          <Cell token={t} cell={t.light} mode="light" />
                        </TableCell>
                        <TableCell className="py-1">
                          <Cell token={t} cell={t.dark} mode="dark" />
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
                    )),
                  ];
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Order: stock, then theme.css, then each variant's round tokens.
          </p>
        </div>
      </main>
    </div>
  );
}
