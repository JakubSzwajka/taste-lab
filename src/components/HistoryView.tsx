import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VariantFrame } from "@/components/VariantFrame";
import type { LoadedRound } from "@/lib/rounds";
import type { TasteEntry } from "@/lib/taste";
import type { Theme } from "@/lib/theme";

function Winner({
  entry,
  rounds,
  theme,
}: {
  entry: TasteEntry;
  rounds: LoadedRound[];
  theme: Theme;
}) {
  if (entry.pick === "none") {
    return (
      <p className="text-sm text-muted-foreground">None of the variants.</p>
    );
  }
  if (entry.pick === "mix") {
    return (
      <p className="text-sm text-muted-foreground">
        Mix: {entry.reason || "no reason given"}
      </p>
    );
  }
  const round = rounds.find((r) => r.id === entry.round);
  if (!round?.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Round {entry.round} is not available, so variant {entry.pick} cannot be
        shown.
      </p>
    );
  }
  const spec = round.spec.variants.find((v) => v.id === entry.pick);
  const load = round.loaders[entry.pick];
  if (!spec || !load) {
    return (
      <p className="text-sm text-muted-foreground">
        Variant {entry.pick} no longer exists in {entry.round}.
      </p>
    );
  }
  return <VariantFrame spec={spec} load={load} theme={theme} />;
}

export function HistoryView({
  entries,
  skipped,
  rounds,
  theme,
}: {
  entries: TasteEntry[];
  skipped: number;
  rounds: LoadedRound[];
  theme: Theme;
}) {
  const sorted = entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.ts.localeCompare(a.e.ts) || b.i - a.i)
    .map((x) => x.e);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      {skipped > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {skipped} line(s) in .taste-lab/taste.jsonl could not be read and are
          hidden.
        </p>
      )}
      {sorted.length === 0 && (
        <p className="text-muted-foreground">No answers yet.</p>
      )}
      <ul className="flex flex-col gap-4">
        {sorted.map((e) => (
          <li key={`${e.ts}-${e.round}-${e.pick}-${e.reason}`}>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {e.round}
                  <Badge variant="outline">{e.component}</Badge>
                  <Badge>
                    {e.pick === "none" ? "None" : `Pick: ${e.pick}`}
                  </Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {new Date(e.ts).toLocaleString()} · {e.theme}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {(e.tags.length > 0 || e.reason) && (
                  <div className="flex flex-col gap-2">
                    {e.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {e.reason && e.pick !== "mix" && (
                      <p className="text-sm">{e.reason}</p>
                    )}
                  </div>
                )}
                <Winner entry={e} rounds={rounds} theme={theme} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
