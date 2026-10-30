import { CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lab, type ThemeToken } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

const { theme } = lab;

// Every pill shares one size (round-004 b, round-007 c).
const PILL = "h-5 w-20 justify-center";

// A variant cannot set light tokens inside a dark lab (no style prop), so the
// light half of a tile goes blank and dashed there. The value text stays exact.
const LIGHT_ONLY =
  "dark:bg-transparent dark:text-muted-foreground dark:border-r dark:border-dashed";

const fromTheme = (t: ThemeToken) =>
  t.light.source === "theme" || t.dark.source === "theme";

/** The radius as two boxes: light half and dark half look the same. */
function RadiusChip({ token }: { token: ThemeToken }) {
  return (
    <div className="flex h-16 items-center justify-center gap-6 rounded-md border bg-muted/40">
      <span
        className={cn("size-10 border-2 border-foreground/60", token.swatch)}
      />
      <span
        className={cn(
          "h-10 w-20 border-2 border-foreground/60 bg-card",
          token.swatch,
        )}
      />
    </div>
  );
}

/** Light half on the page's tokens, dark half under a `.dark` wrapper. */
function SplitChip({ token }: { token: ThemeToken }) {
  const paint = token.sample ?? token.swatch;
  return (
    <div className="flex h-16 overflow-hidden rounded-md border text-sm font-medium">
      <div
        className={cn(
          "flex flex-1 items-center justify-center",
          paint,
          LIGHT_ONLY,
        )}
      >
        {token.sample ? <span className="dark:hidden">Aa</span> : null}
        <span className="hidden text-xs font-normal dark:inline">
          light view only
        </span>
      </div>
      <div className="dark flex flex-1">
        <div className={cn("flex flex-1 items-center justify-center", paint)}>
          {token.sample ? "Aa" : null}
        </div>
      </div>
    </div>
  );
}

function Tile({ token }: { token: ThemeToken }) {
  const ours = fromTheme(token);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-2",
        ours && "border-primary/50",
      )}
    >
      {token.name === "--radius" ? (
        <RadiusChip token={token} />
      ) : (
        <SplitChip token={token} />
      )}
      <div className="flex items-center justify-between gap-2">
        <code className="truncate text-xs font-medium">{token.name}</code>
        {ours ? (
          <Badge className={PILL}>theme.css</Badge>
        ) : (
          <Badge
            variant="outline"
            className={cn(PILL, "text-muted-foreground")}
          >
            stock
          </Badge>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs text-muted-foreground">
        <dt>Light</dt>
        <dd className={cn("truncate font-mono", ours && "text-foreground")}>
          {token.light.value}
        </dd>
        <dt>Dark</dt>
        <dd className={cn("truncate font-mono", ours && "text-foreground")}>
          {token.dark.value}
        </dd>
      </dl>
    </div>
  );
}

/**
 * A swatch grid by role. Each token is a tile: a chip split light | dark,
 * with "Aa" in its foreground pair, the name, a source pill and both values.
 * Sections: surfaces, brand, states, charts, sidebar, shape.
 */
export default function SwatchGrid() {
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
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-4 py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h1 className="text-lg font-semibold">Theme</h1>
              <span className="text-xs text-muted-foreground tabular-nums">
                {overridden.length} of {theme.tokens.length} from{" "}
                <code>{theme.file}</code>, the rest stock. Each chip: light |
                dark.
              </span>
            </div>
            <span className="hidden text-xs text-muted-foreground dark:inline">
              Light halves show in the light lab only.
            </span>
          </div>

          {theme.problems.length > 0 && (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-lg border border-destructive/50 px-3 py-2 text-sm"
            >
              <p className="flex items-center gap-2 font-medium text-destructive">
                <CircleAlert className="size-4" />
                Ignored from theme.css until fixed
              </p>
              {theme.problems.map((p) => (
                <p key={p.line} className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">:{p.line}</span>{" "}
                  <code className="text-foreground">{p.excerpt}</code>{" "}
                  {p.message}
                </p>
              ))}
            </div>
          )}

          {theme.groups.map((g) => {
            const tokens = theme.tokens.filter((t) => t.group === g.name);
            return (
              <section key={g.name} className="flex flex-col gap-2">
                <h2 className="flex items-baseline gap-2 text-sm font-medium">
                  {g.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {tokens.length} · {g.hint}
                  </span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
                  {tokens.map((t) => (
                    <Tile key={t.name} token={t} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
