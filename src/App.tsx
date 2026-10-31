import labConfig from "virtual:taste-lab/config";
import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppHeader } from "@/components/AppHeader";
import { CompareScreen } from "@/components/CompareScreen";
import { HistoryView } from "@/components/HistoryView";
import { LibraryEntryView, LibraryView } from "@/components/LibraryView";
import { ThemeView } from "@/components/ThemeView";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  fetchLog,
  type LogResponse,
  postEntry,
  UNAUTHORIZED_MESSAGE,
} from "@/lib/api";
import type { LibraryEntry } from "@/lib/library";
import { library as defaultLibrary } from "@/lib/library-entries";
import type { LoadedRound } from "@/lib/rounds";
import { hrefFor, useRoute } from "@/lib/route";
import { type Answer, answerEntry, submitEntry } from "@/lib/submit";
import type { TasteEntry } from "@/lib/taste";
import { useTheme } from "@/lib/theme";
import { useThemeData } from "@/lib/theme-data";
import { rounds as defaultRounds } from "@/lib/variants";

export default function App({
  rounds = defaultRounds,
  library = defaultLibrary,
}: {
  rounds?: LoadedRound[];
  library?: LibraryEntry[];
}) {
  const [theme, toggleTheme] = useTheme();
  const route = useRoute();
  const themeData = useThemeData();
  const [entries, setEntries] = useState<TasteEntry[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Newest request wins. A slow older GET must not drop a just-saved entry.
  const logSeq = useRef(0);
  const applyLog = useCallback((seq: number, log: LogResponse) => {
    if (seq !== logSeq.current) return;
    setEntries(log.entries);
    setSkipped(log.skipped);
    setLogError(null);
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++logSeq.current;
    try {
      applyLog(seq, await fetchLog());
    } catch (e) {
      if (seq === logSeq.current) {
        setLogError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLoaded(true);
    }
  }, [applyLog]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const answered = useMemo(
    () => new Set(entries.map((e) => e.round)),
    [entries],
  );
  const broken = rounds.filter((r) => !r.ok);
  const nextOpen = rounds.find((r) => r.ok && !answered.has(r.id));

  const onLibrary = route.page === "library" || route.page === "library-entry";
  const shown =
    route.page === "round"
      ? rounds.find((r) => r.id === route.id)
      : route.page === "current"
        ? nextOpen
        : undefined;

  // Compare owns the rest of the page: its frame grows to fill the viewport
  // and its answer bar runs edge to edge at the bottom.
  const comparing = loaded && !!shown?.ok;
  // Library is a full-bleed workbench: exactly the viewport under the header,
  // with its own sidebar and panels. Nothing on it scrolls the page.
  const fullBleed = comparing || onLibrary;

  async function submit(a: Answer) {
    if (!shown?.ok || inFlight.current) return; // state lags, the ref does not
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    let seqForSubmit = 0;
    try {
      await submitEntry(
        () => postEntry(answerEntry(shown.spec, a, theme)),
        fetchLog,
        {
          // Saved. Mark the round answered and move on before the GET returns.
          onSaved: (entry) => {
            const seq = ++logSeq.current; // drops any older in-flight GET
            seqForSubmit = seq;
            setEntries((prev) => [...prev, entry]);
            setRefreshError(null);
            setLoaded(true);
            location.hash = hrefFor({ page: "current" });
          },
          onLog: (log) => applyLog(seqForSubmit, log),
          onRefreshError: (m) => {
            if (seqForSubmit === logSeq.current) setRefreshError(m);
          },
        },
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <TooltipProvider>
      <div
        data-layout={onLibrary ? "library" : comparing ? "compare" : "page"}
        className={
          onLibrary
            ? "flex h-svh flex-col overflow-hidden bg-background text-foreground"
            : "flex min-h-svh flex-col bg-background text-foreground"
        }
      >
        <AppHeader
          labName={labConfig.name}
          route={route}
          rounds={rounds}
          entries={entries}
          shown={shown}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main
          className={
            onLibrary
              ? "flex min-h-0 flex-1 flex-col"
              : comparing
                ? "flex flex-1 flex-col"
                : "flex w-full flex-col gap-6 px-8 py-8"
          }
        >
          <Notices padded={fullBleed}>
            {logError && (
              <p role="alert" className="text-sm text-destructive">
                {logError === UNAUTHORIZED_MESSAGE
                  ? `The taste log needs a link token. ${logError}.`
                  : `Could not reach the taste log: ${logError}. Run the app with pnpm dev or pnpm preview.`}
              </p>
            )}

            {refreshError && (
              <p role="status" className="text-sm text-muted-foreground">
                Your answer was saved, but the log could not be reloaded:{" "}
                {refreshError}. History may be out of date until you reload.
              </p>
            )}

            {broken.length > 0 &&
              route.page !== "history" &&
              route.page !== "theme" &&
              !onLibrary && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-lg border border-destructive p-4"
                >
                  <p className="text-sm font-medium text-destructive">
                    {broken.length} round(s) could not be loaded. Other rounds
                    still work.
                  </p>
                  {broken.map((r) =>
                    r.ok ? null : (
                      <div key={r.id} className="text-sm">
                        <span className="font-medium">{r.id}</span>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {r.errors.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              )}
          </Notices>

          {route.page === "theme" ? (
            <ThemeView {...themeData} />
          ) : route.page === "library" ? (
            <LibraryView entries={library} rounds={rounds} />
          ) : route.page === "library-entry" ? (
            <LibraryEntryView
              key={route.name}
              name={route.name}
              example={route.example}
              entries={library}
              rounds={rounds}
            />
          ) : route.page === "history" ? (
            <HistoryView entries={entries} skipped={skipped} rounds={rounds} />
          ) : !loaded ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : route.page === "round" && !shown ? (
            <p className="text-muted-foreground">No round called {route.id}.</p>
          ) : shown?.ok ? (
            <CompareScreen
              key={shown.id}
              round={shown}
              theme={theme}
              previous={[...entries]
                .reverse()
                .find((e) => e.round === shown.id)}
              submitting={submitting}
              error={submitError}
              onSubmit={submit}
            />
          ) : shown && !shown.ok ? null : (
            <EmptyState hasRounds={rounds.some((r) => r.ok)} />
          )}
        </main>
        {!fullBleed && <Separator />}
      </div>
    </TooltipProvider>
  );
}

/**
 * Log and round notices. On Compare and Library, main has no padding (they are
 * full-bleed), so the notices get their own padded box.
 */
function Notices({
  padded,
  children,
}: {
  padded: boolean;
  children: ReactNode;
}) {
  if (!padded) return children;
  const shown = Children.toArray(children).length > 0;
  return shown ? (
    <div className="flex w-full flex-col gap-4 px-8 pt-8">{children}</div>
  ) : null;
}

function EmptyState({ hasRounds }: { hasRounds: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        {hasRounds ? "All rounds answered" : "No rounds yet"}
      </h1>
      <p className="max-w-prose text-muted-foreground">
        {hasRounds
          ? "Ask your agent to read .taste-lab/taste.jsonl and write the next round under .taste-lab/rounds/. It shows up here on reload."
          : "Ask your agent to write .taste-lab/rounds/round-001/ (a round.json plus 2 to 4 variant files). See the taste-lab AGENTS.md for the contract."}
      </p>
      <Button asChild variant="outline">
        <a href={hrefFor({ page: "history" })}>Open history</a>
      </Button>
    </div>
  );
}
