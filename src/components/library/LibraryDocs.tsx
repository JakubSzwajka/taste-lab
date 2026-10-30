import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LibraryEntry, LibraryStatus } from "@/lib/library";
import { hrefFor } from "@/lib/route";

/** One size for every status pill, so the tree column lines up. */
export function StatusBadge({ status }: { status: LibraryStatus | "error" }) {
  return (
    <Badge
      variant={
        status === "error"
          ? "destructive"
          : status === "agreed"
            ? "secondary"
            : "outline"
      }
      className="h-5 w-16 justify-center"
    >
      {status}
    </Badge>
  );
}

const head = "text-xs font-normal text-muted-foreground";

/** The Docs tab: description, examples, controls, rules, provenance. */
export function LibraryDocs({
  entry,
  rounds,
  onOpen,
}: {
  entry: Extract<LibraryEntry, { ok: true }>;
  /** Round ids that exist. Undefined: unknown, so every round links. */
  rounds: ReadonlySet<string> | undefined;
  onOpen: (example: string) => void;
}) {
  const { meta } = entry;
  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          {meta.title}
          <StatusBadge status={meta.status} />
        </h1>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
        <p className="font-mono text-xs text-muted-foreground">
          @/library/{meta.name}/
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Examples</h2>
        <ul className="flex flex-col text-sm">
          {meta.examples.map((x) => (
            <li key={x.export} className="flex items-baseline gap-2">
              <Button
                variant="link"
                className="h-7 px-0"
                onClick={() => onOpen(x.export)}
              >
                {x.title}
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                {x.export} · {x.width}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {meta.controls && meta.controls.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Controls</h2>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-0 ${head}`}>Prop</TableHead>
                <TableHead className={head}>Kind</TableHead>
                <TableHead className={head}>Default</TableHead>
                <TableHead className={`pr-0 ${head}`}>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meta.controls.map((c) => (
                <TableRow key={c.prop} className="hover:bg-transparent">
                  <TableCell className="pl-0 font-mono text-xs">
                    {c.prop}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.kind === "select"
                      ? (c.options ?? []).join(" | ")
                      : c.kind}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.default === undefined
                      ? "unset"
                      : JSON.stringify(c.default)}
                  </TableCell>
                  <TableCell className="pr-0 text-muted-foreground">
                    {c.label}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Rules</h2>
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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Provenance</h2>
        {meta.provenance.length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {meta.provenance.map((p) => (
              <li
                key={`${p.round}-${p.pick}-${p.note}`}
                className="flex items-start gap-2"
              >
                {!rounds || rounds.has(p.round) ? (
                  <a
                    href={hrefFor({ page: "round", id: p.round })}
                    className="shrink-0 font-mono text-xs leading-5 underline underline-offset-4"
                  >
                    {p.round}
                  </a>
                ) : (
                  <span className="shrink-0 font-mono text-xs leading-5">
                    {p.round}{" "}
                    <span className="font-sans text-muted-foreground">
                      (round not found)
                    </span>
                  </span>
                )}
                <Badge
                  variant="outline"
                  className="h-5 w-16 shrink-0 justify-center font-mono"
                >
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
    </div>
  );
}
