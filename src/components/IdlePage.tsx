import type { ReactNode } from "react";

/**
 * A centered "nothing here" page: a mark on a muted disc, an optional corner
 * badge, a title, one line and a row of links. Used when no round waits and
 * when the library is empty (operator requests after the left-aligned notices).
 */
export function IdlePage({
  id,
  mark,
  badge,
  title,
  children,
  actions,
}: {
  /** Id for the heading; the section is labelled by it. */
  id: string;
  mark: ReactNode;
  badge?: ReactNode;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      data-slot="idle-page"
      className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-16 text-center"
    >
      <div aria-hidden="true" className="relative grid place-items-center">
        <span className="absolute size-44 rounded-full border border-dashed" />
        <span className="absolute size-32 rounded-full bg-muted" />
        <span className="relative">
          {mark}
          {badge && (
            <span className="absolute -right-2.5 -bottom-2.5 grid size-7 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground [&_svg]:size-3.5">
              {badge}
            </span>
          )}
        </span>
      </div>
      <div className="mt-8 flex max-w-md flex-col items-center gap-2">
        <h1 id={id} className="text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">{children}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">{actions}</div>
    </section>
  );
}

/** A path in idle copy: monospace, never broken across lines. */
export function IdlePath({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-sm whitespace-nowrap">{children}</code>
  );
}
