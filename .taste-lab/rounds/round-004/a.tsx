import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HistoryEntry, lab } from "@/fixtures";
import { AppHeader } from "@/library/app-header/AppHeader";

// Newest first, as the app sorts the log.
const sorted = [...lab.history].reverse();

/**
 * Control: today's History page (HistoryView). One card per answer: round,
 * component, pick, time and theme; tags as badges, the reason, then the
 * winning variant rendered in its frame.
 */
export default function Today() {
  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="History"
        className="shrink-0"
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <ul className="flex flex-col gap-4">
            {sorted.map((e) => (
              <li key={`${e.ts}-${e.round}-${e.pick}`}>
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
                    <Winner entry={e} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

/** The winner as today's page shows it: the picked variant in its frame. */
function Winner({ entry }: { entry: HistoryEntry }) {
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
  const question = lab.rounds.find((r) => r.id === entry.round)?.question;
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/30">
      <header className="flex flex-col gap-1 border-b bg-card px-4 py-3">
        <h2 className="text-sm font-medium">
          Variant {entry.pick.toUpperCase()}
        </h2>
        <p className="text-xs text-muted-foreground">{question}</p>
      </header>
      {/* Stands in for the rendered variant: today it is the full component. */}
      <div className="grid grid-cols-3 gap-3 bg-background p-4">
        <div className="h-28 rounded-md border bg-muted/40" />
        <div className="h-28 rounded-md border bg-muted/40" />
        <div className="h-28 rounded-md border bg-muted/40" />
      </div>
    </section>
  );
}
