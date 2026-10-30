import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type LibraryItem, lab } from "@/fixtures";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/library/app-header/AppHeader";

// Every pill shares one size, per the operator's prior.
const PILL = "h-5 w-16 justify-center";

/**
 * Two panes: the entry list on the left, the selected entry on the right
 * with its examples, provenance and rules. No separate detail page.
 */
export default function TwoPanes() {
  const [selected, setSelected] = useState(lab.library[0]?.name ?? "");
  const entry = lab.library.find((e) => e.name === selected);
  return (
    <div className="@container flex h-[85svh] min-h-[40rem] flex-col overflow-hidden rounded-lg border bg-background text-foreground">
      <AppHeader
        labName={lab.name}
        rounds={lab.rounds}
        current={lab.current}
        page="Library"
        className="shrink-0"
      />
      <main className="flex min-h-0 flex-1">
        <nav
          aria-label="Library entries"
          className="flex w-72 shrink-0 flex-col gap-1 overflow-y-auto border-r p-3"
        >
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            {lab.library.length} entries
          </p>
          {lab.library.map((e) => (
            <Button
              key={e.name}
              variant="ghost"
              aria-current={e.name === selected ? "true" : undefined}
              onClick={() => setSelected(e.name)}
              className="h-auto flex-col items-stretch gap-1 px-2 py-2 text-left font-normal aria-[current=true]:bg-muted"
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {e.ok ? e.title : e.name}
                </span>
                <StatusPill entry={e} />
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {e.ok
                  ? `${e.name} · ${e.examples.length} examples`
                  : `${e.errors.length} problems`}
              </span>
            </Button>
          ))}
        </nav>

        <div className="@container min-w-0 flex-1 overflow-y-auto">
          {entry && <Detail entry={entry} />}
        </div>
      </main>
    </div>
  );
}

function StatusPill({ entry }: { entry: LibraryItem }) {
  if (!entry.ok) {
    return (
      <Badge variant="destructive" className={PILL}>
        error
      </Badge>
    );
  }
  return (
    <Badge
      variant={entry.status === "agreed" ? "secondary" : "outline"}
      className={PILL}
    >
      {entry.status}
    </Badge>
  );
}

function Detail({ entry }: { entry: LibraryItem }) {
  if (!entry.ok) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <h1 className="flex items-center gap-2 font-mono text-lg font-semibold">
          {entry.name}
          <StatusPill entry={entry} />
        </h1>
        <ul className="flex flex-col gap-1.5 text-sm">
          {entry.errors.map((m) => (
            <li key={m} className="flex items-start gap-2 text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {m}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          {entry.title}
          <StatusPill entry={entry} />
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {entry.description}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          @/library/{entry.name}/
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Examples</h2>
        <div className="grid gap-3 @2xl:grid-cols-2">
          {entry.examples.map((ex) => (
            <figure
              key={ex.export}
              className={cn(
                "flex flex-col overflow-hidden rounded-lg border",
                ex.width === "full" && "@2xl:col-span-2",
              )}
            >
              {/* Stands in for the rendered example. */}
              <div className="flex h-24 flex-col gap-2 bg-muted/30 p-3">
                <div className="h-3 w-2/3 rounded-sm bg-muted" />
                <div className="h-3 w-1/2 rounded-sm bg-muted" />
              </div>
              <figcaption className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
                <span>{ex.title}</span>
                <span className="font-mono text-muted-foreground">
                  {ex.export} · {ex.width}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Separator />

      <div className="grid gap-6 @4xl:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Provenance</h2>
          {entry.provenance.length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {entry.provenance.map((p) => (
                <li key={`${p.round}-${p.pick}`} className="flex gap-2">
                  <span className="font-mono text-xs leading-5 underline underline-offset-4">
                    {p.round}
                  </span>
                  <Badge variant="outline" className="w-14 font-mono">
                    pick {p.pick}
                  </Badge>
                  {p.note && (
                    <span className="text-muted-foreground">{p.note}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Rules</h2>
          {entry.rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {entry.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
