import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LibraryEntry } from "@/lib/library";
import { hrefFor } from "@/lib/route";
import { StatusBadge } from "./LibraryDocs";

// Entries the operator collapsed, kept across the remount on each entry change.
const collapsed = new Set<string>();

/**
 * Left sidebar: every entry, and under an open one its examples. The stock
 * shadcn sidebar, positioned in the Library page instead of the viewport so it
 * starts under the app header. On narrow screens it is the primitive's sheet.
 */
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
  const { isMobile, setOpenMobile } = useSidebar();
  const toggle = (name: string) => {
    if (collapsed.has(name)) collapsed.delete(name);
    else collapsed.add(name);
    rerender((n) => n + 1);
  };
  const foldable = entries.filter((e) => e.ok).map((e) => e.name);
  const anyOpen = foldable.some((n) => !collapsed.has(n));
  const anyClosed = foldable.some((n) => collapsed.has(n));
  const foldAll = (fold: boolean) => {
    for (const n of foldable) {
      if (fold) collapsed.add(n);
      else collapsed.delete(n);
    }
    rerender((n) => n + 1);
  };
  const drafts = entries.filter((e) => e.ok && e.meta.status === "draft");
  // The sheet covers the page on a phone: close it once something is picked.
  const picked = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar className="absolute h-full">
      <SidebarContent>
        <nav aria-label="Library entries and examples">
          <SidebarGroup className="gap-3 p-4">
            <div className="flex items-center gap-1 pr-1">
              <SidebarGroupLabel className="flex-1">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
                {drafts.length > 0 &&
                  `, ${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"}`}
              </SidebarGroupLabel>
              {/* Own provider: the Library page also mounts outside App. */}
              <TooltipProvider>
                <FoldButton
                  label="Collapse all"
                  disabled={!anyOpen}
                  onClick={() => foldAll(true)}
                >
                  <ChevronsDownUp />
                </FoldButton>
                <FoldButton
                  label="Expand all"
                  disabled={!anyClosed}
                  onClick={() => foldAll(false)}
                >
                  <ChevronsUpDown />
                </FoldButton>
              </TooltipProvider>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {entries.map((e) => {
                  const current = e.name === entryName;
                  const open = e.ok && !collapsed.has(e.name);
                  const Chevron = open ? ChevronDown : ChevronRight;
                  return (
                    <SidebarMenuItem key={e.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={current && !open}
                        className="h-10 pr-8 [&_svg]:size-5"
                      >
                        <a
                          href={hrefFor({
                            page: "library-entry",
                            name: e.name,
                          })}
                          // The example carries the mark, unless it is hidden.
                          aria-current={current && !open ? "true" : undefined}
                          title={e.ok ? e.meta.title : e.name}
                          onClick={picked}
                        >
                          {!e.ok && (
                            <CircleAlert
                              className="size-5 text-destructive"
                              strokeWidth={1.75}
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {e.ok ? e.meta.title : e.name}
                          </span>
                          {/* Agreed is the normal case: only a draft or a
                              broken entry gets a pill (operator, after the
                              sidebar showed "agreed" 17 times). */}
                          {!(e.ok && e.meta.status === "agreed") && (
                            <StatusBadge
                              status={e.ok ? e.meta.status : "error"}
                            />
                          )}
                        </a>
                      </SidebarMenuButton>
                      {e.ok && (
                        <SidebarMenuAction
                          className="[&>svg]:size-5"
                          aria-expanded={open}
                          aria-label={`${open ? "Hide" : "Show"} examples of ${e.meta.title}`}
                          onClick={() => toggle(e.name)}
                        >
                          <Chevron className="size-5" strokeWidth={1.75} />
                        </SidebarMenuAction>
                      )}
                      {e.ok && open && (
                        <SidebarMenuSub>
                          {e.meta.examples.map((x) => {
                            const active = current && x.export === exampleName;
                            return (
                              <SidebarMenuSubItem key={x.export}>
                                <SidebarMenuSubButton
                                  className="h-9"
                                  isActive={active}
                                  href={hrefFor({
                                    page: "library-entry",
                                    name: e.name,
                                    example: x.export,
                                  })}
                                  aria-current={active ? "true" : undefined}
                                  title={x.title}
                                  onClick={() => {
                                    onExample(e.name, x.export);
                                    picked();
                                  }}
                                >
                                  <span className="min-w-0 flex-1 truncate">
                                    {x.export}
                                  </span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {x.width}
                                  </span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

function FoldButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="text-muted-foreground [&_svg]:size-4"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
