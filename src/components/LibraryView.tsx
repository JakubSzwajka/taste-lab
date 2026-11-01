import {
  CircleAlert,
  GalleryHorizontal,
  History,
  LibraryBig,
} from "lucide-react";
import { useMemo, useState } from "react";
import { IdlePage, IdlePath } from "@/components/IdlePage";
import { StatusBadge } from "@/components/library/LibraryDocs";
import { LibraryTree } from "@/components/library/LibraryTree";
import {
  LibraryWorkbench,
  PageBar,
} from "@/components/library/LibraryWorkbench";
import { setCanvasPrefs, useCanvasPrefs } from "@/components/library/prefs";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
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
 * The Library page, Storybook style (round-008 c), full-bleed under the app
 * header: a sidebar of entries and their examples, then Canvas and Docs tabs
 * over a resizable Controls panel.
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
  const { sidebar } = useCanvasPrefs();
  const known = useMemo(
    () => (rounds ? new Set(rounds.map((r) => r.id)) : undefined),
    [rounds],
  );

  if (entries.length === 0) {
    return (
      <IdlePage
        id="library-empty-title"
        mark={
          <span className="grid size-16 place-items-center rounded-[28%] border bg-card text-primary shadow-lg">
            <LibraryBig className="size-8" strokeWidth={1.75} />
          </span>
        }
        title="No components yet"
        actions={
          <>
            <Button asChild variant="outline">
              <a href={hrefFor({ page: "current" })}>
                <GalleryHorizontal />
                Compare
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={hrefFor({ page: "history" })}>
                <History />
                History
              </a>
            </Button>
          </>
        }
      >
        When you settle a direction, ask your agent to promote the winner into{" "}
        <IdlePath>.taste-lab/library/&lt;name&gt;/</IdlePath>. It shows up here
        with its examples.
      </IdlePage>
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
    <SidebarProvider
      open={sidebar}
      onOpenChange={(open) => setCanvasPrefs({ sidebar: open })}
      // The sidebar is absolute in here, so it starts under the app header.
      className="relative min-h-0 flex-1 overflow-hidden"
    >
      <LibraryTree
        entries={entries}
        entryName={entry?.name}
        exampleName={shown ? shown.export : undefined}
        onExample={(n, x) => {
          setPicked({ name: n, example: x });
          setTab("canvas");
        }}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {!entry ? (
          <>
            <PageBar />
            <p className="px-8 py-8 text-muted-foreground">
              No library entry called {entryName}.
            </p>
          </>
        ) : !entry.ok ? (
          <>
            <PageBar />
            <Errors name={entry.name} errors={entry.errors} />
          </>
        ) : (
          shown && (
            <LibraryWorkbench
              key={`${entry.name}/${shown.export}`}
              entry={entry}
              example={shown}
              light={light}
              tab={tab}
              onTab={setTab}
              rounds={known}
              onOpen={open}
            />
          )
        )}
      </div>
    </SidebarProvider>
  );
}

function Errors({ name, errors }: { name: string; errors: string[] }) {
  return (
    <div role="alert" className="flex min-w-0 flex-col gap-4 px-8 py-8">
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
            <CircleAlert
              className="mt-0.5 size-5 shrink-0"
              strokeWidth={1.75}
            />
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
