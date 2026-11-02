import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type LibraryEntry, moduleProblems } from "@/lib/library";
import { hrefFor } from "@/lib/route";
import { inspectFrom } from "./inspection";

type OkEntry = Extract<LibraryEntry, { ok: true }>;

/** Authored references only. Missing source/exports stay local to this area. */
export function LibraryComposition({
  entry,
  example,
  entries,
}: {
  entry: OkEntry;
  example: string;
  entries: LibraryEntry[];
}) {
  if (!entry.meta.uses?.length) return null;
  return (
    <section
      aria-label="Used components"
      className="flex flex-wrap items-center gap-2 border-b px-8 py-2 text-sm"
    >
      <span className="text-muted-foreground">Used components · authored</span>
      {entry.meta.uses.map((name) => (
        <Reference
          key={name}
          name={name}
          target={entries.find((item) => item.name === name)}
          onInspect={() => {
            if (entry.meta.kind === "screen")
              inspectFrom({ name: entry.name, example, target: name });
          }}
        />
      ))}
    </section>
  );
}

function Reference({
  name,
  target,
  onInspect,
}: {
  name: string;
  target: LibraryEntry | undefined;
  onInspect: () => void;
}) {
  const [checked, setChecked] = useState<{
    target: LibraryEntry;
    error?: string;
  }>();
  useEffect(() => {
    if (!target?.ok) return;
    let live = true;
    Promise.all([target.loadComponent(), target.loadExamples()]).then(
      ([component, examples]) => {
        const problems = moduleProblems(target.meta, component, examples);
        const first = target.meta.examples[0]?.export;
        const error =
          problems.component ??
          (first ? problems.examples[first] : "No examples");
        if (live) setChecked({ target, error: error ?? undefined });
      },
      (error: unknown) => {
        if (live)
          setChecked({
            target,
            error: error instanceof Error ? error.message : String(error),
          });
      },
    );
    return () => {
      live = false;
    };
  }, [target]);
  if (!target?.ok || (checked?.target === target && checked.error)) {
    return (
      <span
        className="text-muted-foreground"
        title={
          !target
            ? "Entry is missing"
            : !target.ok
              ? target.errors.join("; ")
              : checked?.error
        }
      >
        {name} unavailable
      </span>
    );
  }
  if (checked?.target !== target)
    return <span className="text-muted-foreground">Checking {name}…</span>;
  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={hrefFor({
          page: "library-entry",
          name,
          example: target.meta.examples[0]?.export,
        })}
        onClick={onInspect}
      >
        {target.meta.title}
      </a>
    </Button>
  );
}
