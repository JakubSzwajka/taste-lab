import { type ReactNode, useEffect, useState } from "react";
import { Boundary } from "@/components/Boundary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LibraryEntry, LibraryStatus } from "@/lib/library";
import {
  type LibraryMeta,
  type ModuleExports,
  moduleProblems,
} from "@/lib/library";
import type { LoadedRound } from "@/lib/rounds";
import { hrefFor } from "@/lib/route";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: LibraryStatus }) {
  return (
    <Badge variant={status === "agreed" ? "default" : "outline"}>
      {status}
    </Badge>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The Library page: one card per entry. A broken entry shows its errors in place. */
export function LibraryView({ entries }: { entries: LibraryEntry[] }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
      {entries.length === 0 && (
        <p className="max-w-prose text-muted-foreground">
          No components yet. When a direction is settled, the agent promotes the
          winner into .taste-lab/library/&lt;name&gt;/. See the taste-lab
          AGENTS.md.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((e) => (
          <li key={e.name}>
            {e.ok ? (
              <a
                href={hrefFor({ page: "library-entry", name: e.name })}
                className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {e.meta.title}
                      <StatusBadge status={e.meta.status} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 text-sm">
                    <p className="text-muted-foreground">
                      {e.meta.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plural(e.meta.examples.length, "example")}
                    </p>
                  </CardContent>
                </Card>
              </a>
            ) : (
              <Card role="alert" className="h-full border-destructive">
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
  );
}

type Loaded =
  | { state: "loading" }
  | { state: "error"; message: string }
  | {
      state: "ready";
      component: ModuleExports;
      examples: ModuleExports;
    };

function useModules(entry: Extract<LibraryEntry, { ok: true }>): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    setLoaded({ state: "loading" });
    Promise.all([entry.loadComponent(), entry.loadExamples()]).then(
      ([component, examples]) => {
        if (live) setLoaded({ state: "ready", component, examples });
      },
      (e: unknown) => {
        if (live) {
          setLoaded({
            state: "error",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [entry]);
  return loaded;
}

function Examples({
  meta,
  loaded,
}: {
  meta: LibraryMeta;
  loaded: Loaded;
}): ReactNode {
  if (loaded.state === "loading") {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (loaded.state === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        This entry failed to load: {loaded.message}
      </p>
    );
  }
  const problems = moduleProblems(meta, loaded.component, loaded.examples);
  return (
    <div className="flex flex-col gap-6">
      {problems.component && (
        <p role="alert" className="text-sm text-destructive">
          {problems.component}
        </p>
      )}
      {meta.examples.map((ex) => {
        const Example = loaded.examples[ex.export] as
          | (() => ReactNode)
          | undefined;
        const problem = problems.examples[ex.export];
        return (
          <section
            key={ex.export}
            aria-label={`Example ${ex.export}: ${ex.title}`}
            className="flex flex-col gap-2"
          >
            <h3 className="text-sm font-medium">
              {ex.title}{" "}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {ex.export} · {ex.width}
              </span>
            </h3>
            <div
              className={cn(
                "min-w-0 rounded-lg border bg-background p-4 text-foreground",
                ex.width === "column" ? "w-[420px] max-w-full" : "w-full",
              )}
            >
              {problem || !Example ? (
                <p role="alert" className="text-sm text-destructive">
                  {problem}
                </p>
              ) : (
                <Boundary what="example">
                  <Example />
                </Boundary>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** The detail page for one entry: examples, provenance and rules. */
export function LibraryEntryView({
  name,
  entries,
  rounds,
}: {
  name: string;
  entries: LibraryEntry[];
  rounds: LoadedRound[];
}) {
  const entry = entries.find((e) => e.name === name);
  const back = (
    <a
      href={hrefFor({ page: "library" })}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      ← Library
    </a>
  );
  if (!entry) {
    return (
      <div className="flex flex-col gap-2">
        {back}
        <p className="text-muted-foreground">No library entry called {name}.</p>
      </div>
    );
  }
  if (!entry.ok) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight">{entry.name}</h1>
        <ul role="alert" className="list-disc pl-5 text-sm text-destructive">
          {entry.errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    );
  }
  return <Ready entry={entry} back={back} rounds={rounds} />;
}

function Ready({
  entry,
  back,
  rounds,
}: {
  entry: Extract<LibraryEntry, { ok: true }>;
  back: ReactNode;
  rounds: LoadedRound[];
}) {
  const { meta } = entry;
  const loaded = useModules(entry);
  const known = new Set(rounds.map((r) => r.id));
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        {back}
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          {meta.title}
          <StatusBadge status={meta.status} />
        </h1>
        <p className="max-w-prose text-muted-foreground">{meta.description}</p>
        <p className="font-mono text-xs text-muted-foreground">
          @/library/{meta.name}/
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Examples</h2>
        <Examples meta={meta} loaded={loaded} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Provenance</h2>
        {meta.provenance.length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {meta.provenance.map((p) => (
              <li key={`${p.round}-${p.pick}-${p.note}`}>
                {known.has(p.round) ? (
                  <a
                    href={hrefFor({ page: "round", id: p.round })}
                    className="font-medium underline underline-offset-4"
                  >
                    {p.round}
                  </a>
                ) : (
                  <span className="font-medium">
                    {p.round}{" "}
                    <span className="font-normal text-muted-foreground">
                      (round not found)
                    </span>
                  </span>
                )}{" "}
                <Badge variant="secondary">pick {p.pick}</Badge>
                {p.note && (
                  <span className="text-muted-foreground"> {p.note}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Rules</h2>
        {meta.rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {meta.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
