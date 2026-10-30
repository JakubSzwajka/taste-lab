import { ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/lib/library";
import { hrefFor } from "@/lib/route";
import { StatusBadge } from "./LibraryDocs";

// Entries the operator collapsed, kept across the remount on each entry change.
const collapsed = new Set<string>();

/** Left pane: every entry, and under an open one its examples. */
export function LibraryTree({
  entries,
  entryName,
  exampleName,
  onExample,
}: {
  entries: LibraryEntry[];
  entryName: string | undefined;
  exampleName: string | undefined;
  /** Called on an example click, before the hash changes. */
  onExample: (entry: string, example: string) => void;
}) {
  const [, rerender] = useState(0);
  const toggle = (name: string) => {
    if (collapsed.has(name)) collapsed.delete(name);
    else collapsed.add(name);
    rerender((n) => n + 1);
  };
  return (
    <nav
      aria-label="Library entries and examples"
      className="flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto border-r p-3"
    >
      <p className="px-2 pb-1 text-xs text-muted-foreground">
        {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>
      {entries.map((e) => {
        const current = e.name === entryName;
        const open = e.ok && !collapsed.has(e.name);
        const Chevron = open ? ChevronDown : ChevronRight;
        return (
          <div key={e.name} className="flex flex-col gap-0.5">
            <div className="flex items-center">
              {e.ok ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-expanded={open}
                  aria-label={`${open ? "Hide" : "Show"} examples of ${e.meta.title}`}
                  onClick={() => toggle(e.name)}
                  className="text-muted-foreground"
                >
                  <Chevron />
                </Button>
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center">
                  <CircleAlert className="size-4 text-destructive" />
                </span>
              )}
              <Button
                asChild
                variant="ghost"
                className="h-8 min-w-0 flex-1 justify-start gap-1.5 px-2 font-normal aria-[current=true]:bg-muted"
              >
                <a
                  href={hrefFor({ page: "library-entry", name: e.name })}
                  // The example carries the mark, unless it is hidden.
                  aria-current={current && !open ? "true" : undefined}
                  title={e.ok ? e.meta.title : e.name}
                >
                  <span className="min-w-0 flex-1 truncate text-left font-medium">
                    {e.ok ? e.meta.title : e.name}
                  </span>
                  <StatusBadge status={e.ok ? e.meta.status : "error"} />
                </a>
              </Button>
            </div>
            {e.ok &&
              open &&
              e.meta.examples.map((x) => (
                <Button
                  key={x.export}
                  asChild
                  variant="ghost"
                  className="h-7 justify-start gap-2 pr-2 pl-9 font-normal text-muted-foreground aria-[current=true]:bg-muted aria-[current=true]:text-foreground"
                >
                  <a
                    href={hrefFor({
                      page: "library-entry",
                      name: e.name,
                      example: x.export,
                    })}
                    aria-current={
                      current && x.export === exampleName ? "true" : undefined
                    }
                    title={x.title}
                    onClick={() => onExample(e.name, x.export)}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {x.export}
                    </span>
                    <span className="font-mono text-xs">{x.width}</span>
                  </a>
                </Button>
              ))}
          </div>
        );
      })}
    </nav>
  );
}
