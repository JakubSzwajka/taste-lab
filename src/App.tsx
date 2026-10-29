import labConfig from "virtual:taste-lab/config";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Answer } from "@/components/AnswerPanel";
import { CompareScreen } from "@/components/CompareScreen";
import { HistoryView } from "@/components/HistoryView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fetchLog, type LogResponse, postEntry } from "@/lib/api";
import type { PreviewMode } from "@/lib/flip";
import type { LoadedRound } from "@/lib/rounds";
import { hrefFor, useRoute } from "@/lib/route";
import { submitEntry } from "@/lib/submit";
import type { TasteEntry } from "@/lib/taste";
import { useTheme } from "@/lib/theme";
import { rounds as defaultRounds } from "@/lib/variants";

export default function App({
  rounds = defaultRounds,
}: {
  rounds?: LoadedRound[];
}) {
  const [theme, toggleTheme] = useTheme();
  const route = useRoute();
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

  const shown =
    route.page === "round"
      ? rounds.find((r) => r.id === route.id)
      : route.page === "current"
        ? nextOpen
        : undefined;

  async function submit(a: Answer & { view: PreviewMode }) {
    if (!shown?.ok || inFlight.current) return; // state lags, the ref does not
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    let seqForSubmit = 0;
    try {
      await submitEntry(
        () =>
          postEntry({
            round: shown.id,
            component: shown.spec.component,
            level: shown.spec.level,
            shown: shown.spec.variants.map((v) => v.id),
            pick: a.pick,
            tags: a.tags,
            reason: a.reason.trim(),
            theme,
            view: a.view,
          }),
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
      <div className="min-h-svh bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto flex max-w-[120rem] flex-wrap items-center gap-3 px-4 py-3">
            <a href={hrefFor({ page: "current" })} className="font-semibold">
              taste-lab
              <span className="font-normal text-muted-foreground">
                {" "}
                / {labConfig.name}
              </span>
            </a>
            <nav
              aria-label="Rounds"
              className="flex flex-1 flex-wrap items-center gap-1"
            >
              {rounds.map((r) => (
                <Button
                  key={r.id}
                  asChild
                  size="sm"
                  variant={shown?.id === r.id ? "secondary" : "ghost"}
                >
                  <a href={hrefFor({ page: "round", id: r.id })}>
                    {r.id}
                    {!r.ok ? (
                      <Badge variant="destructive">error</Badge>
                    ) : answered.has(r.id) ? (
                      <Badge variant="outline">done</Badge>
                    ) : null}
                  </a>
                </Button>
              ))}
            </nav>
            <Button
              asChild
              size="sm"
              variant={route.page === "history" ? "secondary" : "ghost"}
            >
              <a href={hrefFor({ page: "history" })}>History</a>
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="mx-auto flex max-w-[120rem] flex-col gap-6 px-4 py-6">
          {logError && (
            <p role="alert" className="text-sm text-destructive">
              Could not reach the taste log: {logError}. Run the app with pnpm
              dev or pnpm preview.
            </p>
          )}

          {refreshError && (
            <p role="status" className="text-sm text-muted-foreground">
              Your answer was saved, but the log could not be reloaded:{" "}
              {refreshError}. History may be out of date until you reload.
            </p>
          )}

          {broken.length > 0 && route.page !== "history" && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-lg border border-destructive p-4"
            >
              <p className="text-sm font-medium text-destructive">
                {broken.length} round(s) could not be loaded. Other rounds still
                work.
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

          {route.page === "history" ? (
            <HistoryView
              entries={entries}
              skipped={skipped}
              rounds={rounds}
              theme={theme}
            />
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
        <Separator />
      </div>
    </TooltipProvider>
  );
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
