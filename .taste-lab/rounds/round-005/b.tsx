import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type LibraryItem, lab } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

// Every pill on a card shares one size, per the operator's prior.
const PILL = "h-5 w-24 justify-center";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * A denser card grid: status and example count as two same-size pills on
 * top, then title, a 2-line description and the rounds it came from. The
 * page heading shrinks to a small title with the entry count.
 */
export default function CardGrid() {
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
        <div className="flex flex-col gap-4 px-4 py-6">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-lg font-semibold">Library</h1>
            <span className="text-xs text-muted-foreground tabular-nums">
              {lab.library.length} entries
            </span>
          </div>
          <ul className="grid gap-3 @2xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
            {lab.library.map((e) => (
              <li key={e.name}>
                <EntryCard entry={e} />
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function EntryCard({ entry }: { entry: LibraryItem }) {
  if (!entry.ok) {
    return (
      <Card size="sm" className="h-full">
        <CardHeader className="gap-3">
          <Badge variant="destructive" className={PILL}>
            error
          </Badge>
          <CardTitle className="font-mono text-sm">{entry.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-xs text-destructive">
            {entry.errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card
      size="sm"
      className="h-full cursor-pointer transition-colors hover:bg-muted/50"
    >
      <CardHeader className="gap-3">
        <div className="flex items-center gap-1.5">
          <Badge
            variant={entry.status === "agreed" ? "secondary" : "outline"}
            className={PILL}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                entry.status === "agreed"
                  ? "bg-primary"
                  : "border border-muted-foreground",
              )}
            />
            {entry.status}
          </Badge>
          <Badge variant="outline" className={cn(PILL, "tabular-nums")}>
            {plural(entry.examples.length, "example")}
          </Badge>
        </div>
        <CardTitle>{entry.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {entry.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto font-mono text-xs text-muted-foreground">
        {entry.provenance.map((p) => p.round).join(" · ")}
      </CardFooter>
    </Card>
  );
}
