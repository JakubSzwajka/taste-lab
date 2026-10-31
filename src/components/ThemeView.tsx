import { CircleAlert } from "lucide-react";
import { type CSSProperties, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  resolveTokens,
  type ThemeProblem,
  type TokenBlocks,
  type TokenRow,
} from "@/lib/taste-theme";
import { cn } from "@/lib/utils";
import { groupOf, TOKEN_GROUPS } from "./theme/groups";

type Mode = "light" | "dark";
type Filter = "all" | "theme" | "stock";

// Every pill shares one size (round-004 b, round-007 c).
const PILL = "h-5 w-20 justify-center";

const fromTheme = (r: TokenRow) =>
  r.light.source === "theme" || r.dark.source === "theme";

/** Which modes theme.css sets, for the pill's title and screen readers. */
const themeModes = (r: TokenRow) =>
  r.light.source === "theme" && r.dark.source === "theme"
    ? "light and dark"
    : r.light.source === "theme"
      ? "light only"
      : "dark only";

/**
 * A chip painted with the real value, and the value. The backdrop carries every
 * token of `mode` as inline custom properties (`scope`), so the chip and its
 * backdrop show that mode in either lab theme, and a `var()` value resolves in
 * its own mode. The only inline values on this page are these token values,
 * like the Library canvas's light tokens. `--radius` is a sample box.
 */
function TokenChip({
  row,
  mode,
  scope,
}: {
  row: TokenRow;
  mode: Mode;
  scope: CSSProperties;
}) {
  const cell = row[mode];
  const radius = row.name === "--radius";
  return (
    <div className="flex items-center gap-2" data-source={cell.source}>
      <span
        data-backdrop={mode}
        data-taste-scope={mode}
        style={scope}
        className="flex shrink-0 rounded-sm bg-background p-0.5"
      >
        <span
          role="img"
          aria-label={`${row.name} ${mode}: ${cell.value}`}
          data-swatch={row.name}
          data-mode={mode}
          style={
            radius
              ? { borderRadius: cell.value }
              : { backgroundColor: cell.value }
          }
          className={cn(
            "size-5 shrink-0 border",
            radius ? "border-2 border-foreground/60" : "rounded-sm",
          )}
        />
      </span>
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

function SourcePill({ row }: { row: TokenRow }) {
  if (!fromTheme(row)) {
    return (
      <Badge variant="outline" className={cn(PILL, "text-muted-foreground")}>
        stock
      </Badge>
    );
  }
  const modes = themeModes(row);
  return (
    <Badge className={PILL} title={`theme.css, ${modes}`}>
      theme.css
      {modes !== "light and dark" && <span className="sr-only">, {modes}</span>}
    </Badge>
  );
}

function IgnoredParts({ problems }: { problems: ThemeProblem[] }) {
  const n = problems.length;
  return (
    <div role="alert" className="rounded-lg border border-destructive/50">
      <p className="flex items-center gap-2 border-b border-destructive/30 px-3 py-2 text-sm font-medium text-destructive">
        <CircleAlert
          className="size-5 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        {n === 1
          ? "1 part of theme.css is ignored."
          : `${n} parts of theme.css are ignored.`}{" "}
        Fix them, then run taste-lab check.
      </p>
      <ul className="divide-y">
        {problems.map((p) => (
          <li
            key={`${p.line}:${p.message}`}
            className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 px-3 py-1.5"
          >
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {p.line > 0 ? `line ${p.line}` : "file"}
            </span>
            <span className="text-xs text-muted-foreground">{p.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const EMPTY: Record<Exclude<Filter, "all">, string> = {
  theme: "No token comes from theme.css. Every token is stock.",
  stock: "Every token comes from theme.css.",
};

/**
 * The Theme page (round-010 a): one dense row per token, grouped by role, light
 * and dark side by side with a source pill. A filter shows theme.css or stock
 * tokens, and the rejected parts of theme.css sit on top.
 */
export function ThemeView({
  stock,
  theme,
  problems,
}: {
  stock: TokenBlocks;
  theme: TokenBlocks;
  problems: ThemeProblem[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo(() => resolveTokens(stock, theme), [stock, theme]);
  const scopes = useMemo(() => {
    const of = (mode: Mode) =>
      Object.fromEntries(
        rows.map((r) => [r.name, r[mode].value]),
      ) as CSSProperties;
    return { light: of("light"), dark: of("dark") };
  }, [rows]);
  const overridden = rows.filter(fromTheme).length;
  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "theme" ? fromTheme(r) : !fromTheme(r),
  );
  const groups = TOKEN_GROUPS.map((g) => ({
    ...g,
    rows: shown.filter((r) => groupOf(r.name) === g.name),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-semibold">Theme</h1>
          <span
            data-testid="theme-count"
            className="text-xs text-muted-foreground tabular-nums"
          >
            {overridden} of {rows.length} from <code>theme.css</code>, the rest
            stock
          </span>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Show tokens from"
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

      {problems.length > 0 && <IgnoredParts problems={problems} />}

      <div className="rounded-lg border">
        <Table className="[&_thead_th]:h-12">
          <TableCaption className="sr-only">
            Theme tokens by role: light value, dark value and source
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Token</TableHead>
              <TableHead>Light</TableHead>
              <TableHead>Dark</TableHead>
              <TableHead className="w-28">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 && filter !== "all" && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {EMPTY[filter]}
                </TableCell>
              </TableRow>
            )}
            {groups.flatMap((g) => [
              <TableRow
                key={g.name}
                data-group={g.name}
                className="hover:bg-transparent"
              >
                <TableCell
                  colSpan={4}
                  className="bg-muted/40 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">{g.name}</span>{" "}
                  · <span data-group-count>{g.rows.length}</span> · {g.hint}
                </TableCell>
              </TableRow>,
              ...g.rows.map((r) => (
                <TableRow
                  key={r.name}
                  data-token={r.name}
                  data-source={fromTheme(r) ? "theme" : "stock"}
                  className="h-auto"
                >
                  <TableHead
                    scope="row"
                    className="h-auto py-3.5 font-mono text-xs font-normal"
                  >
                    {r.name}
                  </TableHead>
                  <TableCell className="py-3.5">
                    <TokenChip row={r} mode="light" scope={scopes.light} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <TokenChip row={r} mode="dark" scope={scopes.dark} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <SourcePill row={r} />
                  </TableCell>
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Order: stock, then theme.css, then each variant's round tokens.
      </p>
    </div>
  );
}
