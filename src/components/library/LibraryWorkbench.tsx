import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useGroupRef } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LibraryEntry, LibraryExample } from "@/lib/library";
import {
  type ControlValue,
  type ControlValues,
  initialValues,
  withValue,
} from "@/lib/library-controls";
import type { TokenMap } from "@/lib/taste-theme";
import { LibraryCanvas } from "./LibraryCanvas";
import { CONTROLS_HEADER_PX, LibraryControls } from "./LibraryControls";
import { LibraryDocs } from "./LibraryDocs";
import { type ControlsState, setCanvasPrefs, useCanvasPrefs } from "./prefs";

type OkEntry = Extract<LibraryEntry, { ok: true }>;

/** Below this the canvas panel snaps shut: the controls go full. */
const CANVAS_MIN_PX = 120;
/** Below this the controls panel snaps to its header bar. */
const CONTROLS_MIN_PX = 96;
/** First-frame guess per control row, before the table is measured. */
const ROW_GUESS_PX = 46;

/** The bar above the canvas: sidebar trigger, then the page's own items. */
export function PageBar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
      <SidebarTrigger
        aria-label="Toggle entry sidebar"
        title="Entries (Ctrl+B)"
      />
      <Separator orientation="vertical" className="my-3" />
      {children}
    </div>
  );
}

/**
 * One example on the Library page: Canvas and Docs tabs on top and, when the
 * entry declares `controls`, the Controls panel under a drag handle. Mount it
 * with a key per example, so control values start from the example's `args`.
 */
export function LibraryWorkbench({
  entry,
  example,
  light,
  tab,
  onTab,
  rounds,
  onOpen,
}: {
  entry: OkEntry;
  example: LibraryExample;
  light: TokenMap;
  tab: string;
  onTab: (tab: string) => void;
  rounds: Set<string> | undefined;
  onOpen: (example: string) => void;
}) {
  const { controls } = entry.meta;
  const start = () => initialValues(controls, example.args);
  const [values, setValues] = useState<ControlValues>(start);

  const top = (
    <Tabs
      value={tab}
      onValueChange={onTab}
      className="h-full min-h-0 min-w-0 gap-0"
    >
      <PageBar>
        <TabsList variant="line">
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {entry.name} / {example.export}
        </p>
      </PageBar>
      <TabsContent value="canvas" className="min-h-0">
        <LibraryCanvas
          entry={entry}
          example={example}
          light={light}
          values={values}
        />
      </TabsContent>
      <TabsContent value="docs" className="min-h-0 overflow-y-auto">
        <LibraryDocs entry={entry} rounds={rounds} onOpen={onOpen} />
      </TabsContent>
    </Tabs>
  );

  if (!controls || controls.length === 0) return top;
  return (
    <ControlsSplit rows={controls.length} top={top}>
      {(actions, bodyRef, collapsed) => (
        <LibraryControls
          controls={controls}
          values={values}
          onChange={(prop: string, v: ControlValue | undefined) =>
            setValues((cur) => withValue(cur, prop, v))
          }
          onReset={() => setValues(start())}
          actions={actions}
          bodyRef={bodyRef}
          collapsed={collapsed}
        />
      )}
    </ControlsSplit>
  );
}

/**
 * Vertical split: `top` over the Controls panel. The panel is open (at the
 * dragged height, or fitted to its table), collapsed to its header bar, or
 * full (the top is shut). State and height live in the canvas prefs.
 */
function ControlsSplit({
  rows,
  top,
  children,
}: {
  rows: number;
  top: ReactNode;
  children: (
    actions: ReactNode,
    bodyRef: React.RefObject<HTMLDivElement | null>,
    collapsed: boolean,
  ) => ReactNode;
}) {
  const { controls: state, controlsHeight } = useCanvasPrefs();
  const groupRef = useGroupRef();
  const groupEl = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  /** Sets the panel sizes for a state. A no-op before the group has a height. */
  const layout = (s: ControlsState, height: number | undefined) => {
    const total = groupEl.current?.getBoundingClientRect().height ?? 0;
    const group = groupRef.current;
    if (!group || total <= 0) return;
    // Open: the dragged height, else the whole table. Never over the canvas min.
    const fit = CONTROLS_HEADER_PX + (bodyRef.current?.scrollHeight ?? 0);
    const open = Math.max(
      CONTROLS_MIN_PX,
      Math.min(height ?? fit, total - CANVAS_MIN_PX),
    );
    const px =
      s === "full" ? total : s === "collapsed" ? CONTROLS_HEADER_PX : open;
    const pct = Math.min(100, (px / total) * 100);
    group.setLayout({ canvas: 100 - pct, controls: pct });
  };

  // On mount, size the panel for the saved state: the first frame used a guess.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  useLayoutEffect(() => {
    layout(state, controlsHeight);
  }, []);

  const go = (s: ControlsState) => {
    setCanvasPrefs({ controls: s });
    layout(s, controlsHeight);
  };

  const collapsed = state === "collapsed";
  const full = state === "full";
  const actions = (
    <>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={collapsed ? "Expand controls" : "Collapse controls"}
        title={collapsed ? "Expand controls" : "Collapse controls"}
        onClick={() => go(collapsed ? "open" : "collapsed")}
      >
        {collapsed ? <ChevronUp /> : <ChevronDown />}
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={full ? "Restore controls" : "Expand controls to full"}
        title={full ? "Restore controls" : "Expand controls to full"}
        onClick={() => go(full ? "open" : "full")}
      >
        {full ? <Minimize2 /> : <Maximize2 />}
      </Button>
    </>
  );

  return (
    <ResizablePanelGroup
      orientation="vertical"
      groupRef={groupRef}
      elementRef={groupEl}
      data-controls={state}
      className="min-h-0 flex-1"
      onLayoutChanged={(sizes, meta) => {
        // Drags and keyboard resizes only: mount and button layouts are not
        // a height the operator chose.
        if (!meta.isUserInteraction) return;
        const total = groupEl.current?.getBoundingClientRect().height ?? 0;
        const canvas = sizes.canvas ?? 0;
        const px = ((sizes.controls ?? 0) / 100) * total;
        if (canvas < 0.5) setCanvasPrefs({ controls: "full" });
        else if (px <= CONTROLS_HEADER_PX + 1) {
          setCanvasPrefs({ controls: "collapsed" });
        } else {
          setCanvasPrefs({ controls: "open", controlsHeight: Math.round(px) });
        }
      }}
    >
      <ResizablePanel
        id="canvas"
        collapsible
        collapsedSize={0}
        minSize={CANVAS_MIN_PX}
        defaultSize={full ? "0%" : undefined}
        inert={full}
        className="flex h-full min-h-0 flex-col"
      >
        {top}
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize controls" />
      <ResizablePanel
        id="controls"
        collapsible
        collapsedSize={CONTROLS_HEADER_PX}
        minSize={CONTROLS_MIN_PX}
        // Open and collapsed keep their px height when the window resizes.
        // Full keeps its share (100%): with px, a taller window would hand
        // the extra space to the shut, inert canvas.
        groupResizeBehavior={
          full ? "preserve-relative-size" : "preserve-pixel-size"
        }
        defaultSize={
          full
            ? "100%"
            : collapsed
              ? CONTROLS_HEADER_PX
              : (controlsHeight ??
                CONTROLS_HEADER_PX + 40 + rows * ROW_GUESS_PX)
        }
      >
        {children(actions, bodyRef, collapsed)}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
