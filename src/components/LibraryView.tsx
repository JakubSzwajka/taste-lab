import { CircleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { LibraryCanvas } from "@/components/library/LibraryCanvas";
import { LibraryDocs, StatusBadge } from "@/components/library/LibraryDocs";
import { LibraryTree } from "@/components/library/LibraryTree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LibraryEntry } from "@/lib/library";
import type { LoadedRound } from "@/lib/rounds";
import { hrefFor } from "@/lib/route";
import { lightTokens, type TokenMap } from "@/lib/taste-theme";
import { useThemeData } from "@/lib/theme-data";

export { StatusBadge };

/** `#/library`: the Library page on its first entry. */
export function LibraryView({
  entries,
  rounds,
}: {
  entries: LibraryEntry[];
  rounds?: LoadedRound[];
}) {
  return <LibraryLive entries={entries} rounds={rounds} />;
}

/** `#/library/<name>[/<example>]`: the Library page on one entry. */
export function LibraryEntryView({
  name,
  example,
  entries,
  rounds,
}: {
  name: string;
  example?: string;
  entries: LibraryEntry[];
  rounds?: LoadedRound[];
}) {
  return (
    <LibraryLive
      entries={entries}
      rounds={rounds}
      name={name}
      example={example}
    />
  );
}

function LibraryLive(props: Omit<LibraryPageProps, "light">) {
  const { stock, theme } = useThemeData();
  const light = useMemo(() => lightTokens(stock, theme), [stock, theme]);
  return <LibraryPage {...props} light={light} />;
}

type LibraryPageProps = {
  entries: LibraryEntry[];
  rounds?: LoadedRound[];
  /** Undefined: the first entry. */
  name?: string;
  /** Undefined or unknown: the entry's first example. */
  example?: string;
  light: TokenMap;
};

/**
 * The Library page, Storybook style (round-008 c): a tree of entries and their
 * examples, then a Canvas tab (toolbar, live example, Controls) and a Docs tab.
 */
export function LibraryPage({
  entries,
  rounds,
  name,
  example,
  light,
}: LibraryPageProps) {
  // A click on an example sets this before the hash changes, so the canvas
  // switches even when the route does not carry the example.
  const [picked, setPicked] = useState<{ name?: string; example?: string }>({
    name,
    example,
  });
  const [prev, setPrev] = useState({ name, example });
  if (prev.name !== name || prev.example !== example) {
    setPrev({ name, example });
    setPicked({ name, example });
  }
  const [tab, setTab] = useState("canvas");
  const known = useMemo(
    () => (rounds ? new Set(rounds.map((r) => r.id)) : undefined),
    [rounds],
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="max-w-prose text-muted-foreground">
          No components yet. When a direction is settled, the agent promotes the
          winner into .taste-lab/library/&lt;name&gt;/. See the taste-lab
          AGENTS.md.
        </p>
      </div>
    );
  }

  const entryName = picked.name ?? entries[0]?.name;
  const entry = entries.find((e) => e.name === entryName);
  const shown =
    entry?.ok &&
    (entry.meta.examples.find((x) => x.export === picked.example) ??
      entry.meta.examples[0]);

  const open = (x: string) => {
    if (!entry) return;
    setPicked({ name: entry.name, example: x });
    setTab("canvas");
    location.hash = hrefFor({
      page: "library-entry",
      name: entry.name,
      example: x,
    });
  };

  return (
    <div className="flex h-[calc(100svh-6.5rem)] min-h-[32rem] overflow-hidden rounded-lg border bg-background">
      <LibraryTree
        entries={entries}
        entryName={entry?.name}
        exampleName={shown ? shown.export : undefined}
        onExample={(n, x) => {
          setPicked({ name: n, example: x });
          setTab("canvas");
        }}
      />
      {!entry ? (
        <p className="p-6 text-muted-foreground">
          No library entry called {entryName}.
        </p>
      ) : !entry.ok ? (
        <Errors name={entry.name} errors={entry.errors} />
      ) : (
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="min-w-0 flex-1 gap-0"
        >
          <div className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
            <TabsList variant="line">
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="docs">Docs</TabsTrigger>
            </TabsList>
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
              {entry.name}
              {shown && ` / ${shown.export}`}
            </p>
          </div>
          <TabsContent value="canvas" className="min-h-0">
            {shown && (
              <LibraryCanvas
                key={`${entry.name}/${shown.export}`}
                entry={entry}
                example={shown}
                light={light}
              />
            )}
          </TabsContent>
          <TabsContent value="docs" className="min-h-0 overflow-y-auto">
            <LibraryDocs entry={entry} rounds={known} onOpen={open} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Errors({ name, errors }: { name: string; errors: string[] }) {
  return (
    <div role="alert" className="flex min-w-0 flex-col gap-3 p-6">
      <h1 className="flex items-center gap-2 font-mono text-lg font-semibold">
        {name}
        <StatusBadge status="error" />
      </h1>
      <p className="text-sm text-muted-foreground">
        Nothing to preview until these are fixed.
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {errors.map((m) => (
          <li key={m} className="flex items-start gap-2 text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
