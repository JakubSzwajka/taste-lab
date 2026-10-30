import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LibraryStatus, lab } from "@/fixtures";
import { AppHeader } from "@/library/app-header/AppHeader";

function StatusBadge({ status }: { status: LibraryStatus }) {
  return (
    <Badge variant={status === "agreed" ? "default" : "outline"}>
      {status}
    </Badge>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Control: today's Library page (LibraryView). A page heading, then one card
 * per entry: title with status badge, description, example count. A broken
 * entry shows its errors in a red card.
 */
export default function Today() {
  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Library"
        className="shrink-0"
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lab.library.map((e) => (
              <li key={e.name}>
                {e.ok ? (
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {e.title}
                        <StatusBadge status={e.status} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm">
                      <p className="text-muted-foreground">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {plural(e.examples.length, "example")}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {e.name}
                        <Badge variant="destructive">error</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5 text-sm text-destructive">
                        {e.errors.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
