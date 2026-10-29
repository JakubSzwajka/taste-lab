import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Answer, AnswerPanel } from "@/components/AnswerPanel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VariantFrame } from "@/components/VariantFrame";
import { flipIndex, type PreviewMode } from "@/lib/flip";
import { arrowAction } from "@/lib/keys";
import type { LoadedRound } from "@/lib/rounds";
import type { TasteEntry } from "@/lib/taste";
import type { Theme } from "@/lib/theme";

type OkRound = Extract<LoadedRound, { ok: true }>;

// Static class names so Tailwind can see them.
const GRID: Record<number, string> = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
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
  onSubmit: (a: Answer & { view: PreviewMode }) => void;
}) {
  const { spec } = round;
  const [pick, setPick] = useState("");
  const [view, setView] = useState<PreviewMode>(spec.preview);
  const ids = spec.variants.map((v) => v.id);
  const [active, setActive] = useState(ids[0] ?? "");
  const boxRef = useRef<HTMLDivElement>(null);
  const flip = view === "flip";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{spec.id}</Badge>
          <Badge variant="outline">{spec.level}</Badge>
          <Badge variant="outline">{spec.component}</Badge>
          {spec.basedOn && (
            <Badge variant="outline">
              based on {spec.basedOn.round} / {spec.basedOn.pick}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {spec.question}
        </h1>
        {previous && (
          <p className="text-sm text-muted-foreground">
            Already answered (pick: {previous.pick}). Submitting adds another
            log line.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {flip ? (
          <Tabs value={active} onValueChange={show}>
            <TabsList
              aria-label="Variants"
              className="group-data-horizontal/tabs:h-10"
            >
              {spec.variants.map((v, i) => (
                <TabsTrigger key={v.id} value={v.id} className="flex-none px-3">
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
          </Tabs>
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
          flip ? "flex flex-col" : `grid gap-4 ${GRID[ids.length] ?? GRID[2]}`
        }
      >
        {spec.variants.map((v, i) => (
          <div
            key={v.id}
            role={flip ? "tabpanel" : undefined}
            hidden={flip && active !== v.id}
            className="min-w-0"
          >
            <VariantFrame
              spec={v}
              load={round.loaders[v.id]}
              theme={theme}
              hotkey={i + 1}
              selected={pick === v.id}
            />
          </div>
        ))}
      </div>

      <AnswerPanel
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
