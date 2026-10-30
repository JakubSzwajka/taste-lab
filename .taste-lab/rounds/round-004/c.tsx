import { Badge } from "@/components/ui/badge";
import { type HistoryEntry, lab } from "@/fixtures";
import { AppHeader } from "@/library/app-header/AppHeader";

// In UTC so a capture never shifts a day.
const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

// Newest day first, newest answer first within a day.
const days: { day: string; entries: HistoryEntry[] }[] = [];
for (const e of [...lab.history].reverse()) {
  const day = dayFmt.format(new Date(e.ts));
  const last = days.at(-1);
  if (last?.day === day) last.entries.push(e);
  else days.push({ day, entries: [e] });
}

/**
 * A timeline grouped by day. Each answer is one line (time, round, pick,
 * tags) with the operator's reason as a quiet quote under it.
 */
export default function Timeline() {
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
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
          {days.map((d) => (
            <section key={d.day} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {d.day}
              </h2>
              <ol className="flex flex-col border-l">
                {d.entries.map((e) => (
                  <li
                    key={`${e.ts}-${e.round}-${e.pick}`}
                    className="relative flex flex-col gap-1.5 py-2.5 pl-5"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-4 -left-1 size-2 rounded-full bg-muted-foreground"
                    />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="w-11 text-muted-foreground tabular-nums">
                        {timeFmt.format(new Date(e.ts))}
                      </span>
                      <span className="font-mono text-xs">{e.round}</span>
                      <span className="text-muted-foreground">
                        {e.component}
                      </span>
                      <Badge
                        variant={e.pick === "none" ? "outline" : "secondary"}
                        className="w-12 font-mono"
                      >
                        {e.pick}
                      </Badge>
                      {e.tags.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {e.tags.join(" · ")}
                        </span>
                      )}
                    </div>
                    {e.reason && (
                      <blockquote className="ml-14 border-l-2 pl-3 text-sm text-muted-foreground italic">
                        {e.reason}
                      </blockquote>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
