import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnswerBar } from "@/components/AnswerPanel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VariantFrame } from "@/components/VariantFrame";
import { flipIndex, flipState, type PreviewMode } from "@/lib/flip";
import { arrowAction } from "@/lib/keys";
import type { LoadedRound } from "@/lib/rounds";
import type { Answer } from "@/lib/submit";
import type { TasteEntry } from "@/lib/taste";
import type { Theme } from "@/lib/theme";

type OkRound = Extract<LoadedRound, { ok: true }>;

// Static class names so Tailwind can see them.
const GRID: Record<number, string> = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
};

// Props that turn a TabsContent into a plain block (undefined removes them).
const COLUMN_PANEL = {
  role: undefined,
  "aria-labelledby": undefined,
  tabIndex: undefined,
};

export function CompareScreen({
  round,
  theme,
  previous,
  submitting,
  error,
  onSubmit,
}: {
  round: OkRound;
  theme: Theme;
  previous: TasteEntry | undefined;
  submitting: boolean;
  error: string | null;
  onSubmit: (a: Answer) => void;
}) {
  const { spec } = round;
  const [pick, setPick] = useState("");
  const [view, setView] = useState<PreviewMode>(spec.preview);
  const ids = spec.variants.map((v) => v.id);
  const [activeId, setActive] = useState(ids[0] ?? "");
  // One source for the highlighted tab and the visible panel.
  const { active, hidden } = flipState(ids, activeId);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const flip = view === "flip";

  // Radix roving focus keeps focus on the tab you last used. After a number
  // key or arrow flip, move focus to the shown tab so the next arrow starts
  // from it, not from a stale tab.
  useEffect(() => {
    const list = listRef.current;
    const focused = document.activeElement;
    if (!flip || !list || !focused || !list.contains(focused)) return;
    // Compare datasets, not a selector: ids are free-form strings.
    const tab = [...list.querySelectorAll<HTMLElement>("[role=tab]")].find(
      (t) => t.dataset.variant === active,
    );
    if (tab && tab !== focused) tab.focus({ preventScroll: true });
  }, [active, flip]);

  // Keep the page from shrinking when a shorter variant is shown, so the scroll
  // position holds. The pinned height is dropped on view switch and on resize.
  const pinHeight = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const pinned = Number.parseFloat(box.style.minHeight) || 0;
    box.style.minHeight = `${Math.max(pinned, box.offsetHeight)}px`;
  }, []);
  const unpinHeight = useCallback(() => {
    if (boxRef.current) boxRef.current.style.minHeight = "";
  }, []);
  useEffect(() => {
    window.addEventListener("resize", unpinHeight);
    return () => window.removeEventListener("resize", unpinHeight);
  }, [unpinHeight]);

  const show = useCallback(
    (id: string) => {
      pinHeight();
      setActive(id);
    },
    [pinHeight],
  );

  // Number keys and the pick buttons pick a variant and also show it.
  function handlePick(id: string) {
    setPick(id);
    if (ids.includes(id)) show(id);
  }

  const latest = useRef({ active, ids, show });
  latest.current = { active, ids, show };
  useEffect(() => {
    if (!flip) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inArrowWidget =
        target?.closest?.(
          "[data-radix-collection-item],[role=tablist],[role=radiogroup],[role=menu],[role=listbox],[role=toolbar]",
        ) != null;
      const act = arrowAction(
        e,
        target && {
          tagName: target.tagName,
          role: target.getAttribute("role"),
          isContentEditable: target.isContentEditable,
        },
        inArrowWidget,
      );
      if (act === "ignore") return;
      const { active, ids, show } = latest.current;
      e.preventDefault();
      const next = ids[
        flipIndex(ids.indexOf(active), act === "next" ? 1 : -1, ids.length)
      ] as string;
      show(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip]);

  // .taste-lab round-003 c + round-009 a: no page heading (the header's round
  // tier carries the question), the frame fills the width and the height
  // left, and a one-row answer bar is pinned to the bottom.
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col gap-4 px-4 pt-6 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{spec.id}</Badge>
          <Badge variant="outline">{spec.level}</Badge>
          <Badge variant="outline">{spec.component}</Badge>
          {spec.basedOn && (
            <Badge variant="outline">
              based on {spec.basedOn.round} / {spec.basedOn.pick}
            </Badge>
          )}
          {previous && (
            <p className="text-sm text-muted-foreground">
              Already answered (pick: {previous.pick}). Submitting adds another
              log line.
            </p>
          )}
        </div>

        <Tabs value={active} onValueChange={show} className="flex-1 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {flip ? (
              <TabsList
                ref={listRef}
                aria-label="Variants"
                className="group-data-horizontal/tabs:h-10"
              >
                {spec.variants.map((v, i) => (
                  <TabsTrigger
                    key={v.id}
                    value={v.id}
                    data-variant={v.id}
                    // No fade: a screenshot or fast key press must not catch the
                    // old tab still lit while the new variant is shown.
                    className="flex-none px-3 transition-none"
                  >
                    <span className="uppercase">{v.id}</span>
                    <span className="hidden max-w-48 truncate font-normal text-muted-foreground sm:inline">
                      {v.label}
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {i + 1}
                    </Badge>
                    {pick === v.id && (
                      <Badge>
                        <Check data-icon="inline-start" />
                        Picked
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : (
              <span className="text-sm text-muted-foreground">
                {ids.length} variants side by side
              </span>
            )}
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={view}
              onValueChange={(v) => {
                if (v !== "columns" && v !== "flip") return;
                unpinHeight();
                setView(v);
              }}
              aria-label="Preview mode"
            >
              <ToggleGroupItem value="columns">Side by side</ToggleGroupItem>
              <ToggleGroupItem value="flip">Full width</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div
            ref={boxRef}
            className={
              flip
                ? "flex flex-1 flex-col"
                : `grid flex-1 gap-4 ${GRID[ids.length] ?? GRID[2]}`
            }
          >
            {spec.variants.map((v, i) => (
              // Always mounted, so flipping is instant and keeps variant state.
              // Stock TabsContent gives each panel its id and aria-labelledby. In
              // columns every variant shows and is not a tab panel, so those
              // attributes are dropped. text-base undoes the primitive's text-sm.
              <TabsContent
                key={v.id}
                value={v.id}
                forceMount
                hidden={flip && hidden[i]}
                {...(flip ? {} : COLUMN_PANEL)}
                className="flex min-w-0 flex-col text-base"
              >
                <VariantFrame
                  spec={v}
                  load={round.loaders[v.id]}
                  theme={theme}
                  hotkey={i + 1}
                  selected={pick === v.id}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      <AnswerBar
        key={spec.id}
        variantIds={ids}
        pick={pick}
        onPick={handlePick}
        submitting={submitting}
        error={error}
        onSubmit={(a) => onSubmit({ ...a, view })}
      />
    </div>
  );
}
