import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { lab, type Page } from "@/fixtures";

/** Today's header from src/App.tsx: every round is a button in one wrapping row. */
export default function Control() {
  const [round, setRound] = useState(lab.current);
  const [page, setPage] = useState<Page>(lab.activePage);

  return (
    <div className="overflow-hidden rounded-lg border">
      <header className="border-b">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-semibold">
            taste-lab
            <span className="font-normal text-muted-foreground">
              {" "}
              / {lab.name}
            </span>
          </span>
          <nav
            aria-label="Rounds"
            className="flex flex-1 flex-wrap items-center gap-1"
          >
            {lab.rounds.map((r) => (
              <Button
                key={r.id}
                size="sm"
                variant={round === r.id ? "secondary" : "ghost"}
                onClick={() => {
                  setRound(r.id);
                  setPage("Compare");
                }}
              >
                {r.id}
                {r.status === "error" ? (
                  <Badge variant="destructive">error</Badge>
                ) : r.status === "answered" ? (
                  <Badge variant="outline">done</Badge>
                ) : null}
              </Button>
            ))}
          </nav>
          {lab.pages
            .filter((p) => p !== "Compare")
            .map((p) => (
              <Button
                key={p}
                size="sm"
                variant={page === p ? "secondary" : "ghost"}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
          <Button size="icon" variant="outline" aria-label="Switch theme">
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>
      </header>
      <PageStub page={page} />
    </div>
  );
}

/** Same placeholder page under every variant, so only the header differs. */
function PageStub({ page }: { page: Page }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-muted-foreground">{page} page</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-md border bg-muted/40" />
        <div className="h-24 rounded-md border bg-muted/40" />
        <div className="h-24 rounded-md border bg-muted/40" />
      </div>
    </div>
  );
}
