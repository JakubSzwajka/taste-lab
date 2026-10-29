import {
  ChevronDown,
  Circle,
  CircleAlert,
  CircleCheck,
  Columns2,
  History,
  LibraryBig,
  type LucideIcon,
  Moon,
  Palette,
  Sun,
} from "lucide-react";
import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type LabRound, lab, type Page } from "@/fixtures";
import { cn } from "@/lib/utils";

const answered = lab.rounds.filter((r) => r.status === "answered").length;

const ICON: Record<Page, LucideIcon> = {
  Compare: Columns2,
  Library: LibraryBig,
  Theme: Palette,
  History: History,
};

/** Minimal: a breadcrumb whose last segment picks the round, pages as icons. */
export default function Minimal() {
  const [round, setRound] = useState(lab.current);
  const [page, setPage] = useState<Page>(lab.activePage);
  const shown = lab.rounds.find((r) => r.id === round) ?? lab.rounds[0];

  function go(id: string) {
    setRound(id);
    setPage("Compare");
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <header className="flex h-12 items-center gap-3 border-b px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="font-semibold text-foreground">
              taste-lab
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>{lab.name}</BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="-mx-2 font-mono font-normal text-foreground"
                  >
                    {shown.id}
                    <ChevronDown className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <DropdownMenuLabel className="flex justify-between">
                    <span>Rounds</span>
                    <span className="font-normal">
                      {answered} of {lab.rounds.length} answered
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={round} onValueChange={go}>
                    {lab.rounds.map((r) => (
                      <DropdownMenuRadioItem key={r.id} value={r.id}>
                        <StatusIcon status={r.status} />
                        <span className="font-mono text-xs">{r.id}</span>
                        <span>{r.component}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {r.status === "answered"
                            ? `pick ${r.pick}`
                            : r.status === "error"
                              ? "error"
                              : r.id === lab.current
                                ? "current"
                                : ""}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          aria-label="Pages"
          value={page}
          onValueChange={(v) => v && setPage(v as Page)}
          className="ml-auto"
        >
          {lab.pages.map((p) => {
            const Icon = ICON[p];
            return (
              <Tooltip key={p}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={p}
                    aria-label={p}
                    className="text-muted-foreground aria-checked:bg-muted aria-checked:text-foreground"
                  >
                    <Icon />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{p}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
        <Separator
          orientation="vertical"
          className="data-vertical:h-5 data-vertical:self-center"
        />
        <Button size="icon-sm" variant="ghost" aria-label="Switch theme">
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>
      </header>
      <PageStub page={page} />
    </div>
  );
}

function StatusIcon({
  status,
  className,
}: {
  status: LabRound["status"];
  className?: string;
}) {
  if (status === "answered")
    return <CircleCheck className={cn("text-primary", className)} />;
  if (status === "error")
    return <CircleAlert className={cn("text-destructive", className)} />;
  return <Circle className={cn("text-muted-foreground", className)} />;
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
