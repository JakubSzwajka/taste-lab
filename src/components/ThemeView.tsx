import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  resolveTokens,
  type ThemeProblem,
  type TokenBlocks,
  type TokenRow,
} from "@/lib/taste-theme";
import { cn } from "@/lib/utils";

type Cell = TokenRow["light"];

/** A swatch of the resolved value. `--radius` is a sample box with that radius. */
function Swatch({ name, cell }: { name: string; cell: Cell }) {
  const isRadius = name === "--radius";
  return (
    <div className="flex items-center gap-3">
      <span
        role="img"
        aria-label={`${name} ${cell.value}`}
        style={
          isRadius
            ? { borderRadius: cell.value }
            : { backgroundColor: cell.value }
        }
        className={cn(
          "size-8 shrink-0 border",
          isRadius
            ? "rounded-none border-2 border-foreground/60"
            : "rounded-md",
        )}
      />
      <code
        className={cn(
          "break-all text-xs",
          cell.source === "theme" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {cell.value}
      </code>
    </div>
  );
}

/**
 * The Theme page: each shadcn token as a swatch in light and dark. A value that
 * comes from `theme.css` is marked. Everything else is stock.
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
  const rows = resolveTokens(stock, theme);
  const overridden = rows.filter(
    (r) => r.light.source === "theme" || r.dark.source === "theme",
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Theme</h1>
        <p className="max-w-prose text-muted-foreground">
          {overridden.length === 0
            ? "Every token is stock. Nothing comes from theme.css."
            : `${overridden.length} of ${rows.length} tokens come from theme.css. The rest are stock.`}{" "}
          Order: stock, then theme.css, then each variant's round tokens.
        </p>
      </div>

      {problems.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-destructive p-4"
        >
          <p className="text-sm font-medium text-destructive">
            theme.css has problems. These parts are ignored until you fix them
            (run taste-lab check).
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {problems.map((p) => (
              <li key={`${p.line}:${p.message}`}>
                {p.line > 0 ? `theme.css:${p.line}: ` : ""}
                {p.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Light</TableHead>
                <TableHead>Dark</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const lightTheme = r.light.source === "theme";
                const darkTheme = r.dark.source === "theme";
                return (
                  <TableRow
                    key={r.name}
                    data-source={lightTheme || darkTheme ? "theme" : "stock"}
                    className={cn((lightTheme || darkTheme) && "bg-muted/50")}
                  >
                    <TableCell className="font-mono text-xs">
                      {r.name}
                    </TableCell>
                    <TableCell>
                      <Swatch name={r.name} cell={r.light} />
                    </TableCell>
                    <TableCell>
                      <Swatch name={r.name} cell={r.dark} />
                    </TableCell>
                    <TableCell>
                      {lightTheme || darkTheme ? (
                        <Badge>
                          theme.css
                          {lightTheme && darkTheme
                            ? ""
                            : lightTheme
                              ? " (light)"
                              : " (dark)"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          stock
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
