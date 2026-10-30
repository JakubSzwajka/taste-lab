import { ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import { useState } from "react";
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
  // The sheet covers the page on a phone: close it once something is picked.
  const picked = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar className="absolute h-full">
      <SidebarContent>
        <nav aria-label="Library entries and examples">
          <SidebarGroup>
            <SidebarGroupLabel>
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </SidebarGroupLabel>
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
                        className="pr-8"
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
                            <CircleAlert className="text-destructive" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {e.ok ? e.meta.title : e.name}
                          </span>
                          <StatusBadge
                            status={e.ok ? e.meta.status : "error"}
                          />
                        </a>
                      </SidebarMenuButton>
                      {e.ok && (
                        <SidebarMenuAction
                          aria-expanded={open}
                          aria-label={`${open ? "Hide" : "Show"} examples of ${e.meta.title}`}
                          onClick={() => toggle(e.name)}
                        >
                          <Chevron />
                        </SidebarMenuAction>
                      )}
                      {e.ok && open && (
                        <SidebarMenuSub>
                          {e.meta.examples.map((x) => {
                            const active = current && x.export === exampleName;
                            return (
                              <SidebarMenuSubItem key={x.export}>
                                <SidebarMenuSubButton
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
