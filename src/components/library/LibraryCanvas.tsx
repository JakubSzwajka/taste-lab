import { Moon, Sun } from "lucide-react";
import {
  type ComponentType,
  type CSSProperties,
  useEffect,
  useState,
} from "react";
import { Boundary } from "@/components/Boundary";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type ExampleWidth,
  type LibraryEntry,
  type LibraryExample,
  type ModuleExports,
  moduleProblems,
  ownExport,
} from "@/lib/library";
import {
  type ControlValue,
  type ControlValues,
  initialValues,
  withValue,
} from "@/lib/library-controls";
import type { TokenMap } from "@/lib/taste-theme";
import { cn } from "@/lib/utils";
import { LibraryControls } from "./LibraryControls";
import {
  type CanvasMode,
  type CanvasSurface,
  setCanvasPrefs,
  useCanvasPrefs,
  useLabMode,
} from "./prefs";

type OkEntry = Extract<LibraryEntry, { ok: true }>;

type Loaded =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; component: ModuleExports; examples: ModuleExports };

function useModules(entry: OkEntry): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    setLoaded({ state: "loading" });
    Promise.all([entry.loadComponent(), entry.loadExamples()]).then(
      ([component, examples]) => {
        if (live) setLoaded({ state: "ready", component, examples });
      },
      (e: unknown) => {
        if (live) {
          setLoaded({
            state: "error",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [entry]);
  return loaded;
}

/**
 * Canvas tab for one example: toolbar, the live example and, when the entry
 * declares `controls`, the Controls panel. Mount it with a key per example, so
 * width and control values start fresh from the example's `width` and `args`.
 */
export function LibraryCanvas({
  entry,
  example,
  light,
}: {
  entry: OkEntry;
  example: LibraryExample;
  /** Light token values (stock plus theme.css :root), for a light canvas in a dark lab. */
  light: TokenMap;
}) {
  const { controls } = entry.meta;
  const start = () => initialValues(controls, example.args);
  const [values, setValues] = useState<ControlValues>(start);
  const [width, setWidth] = useState<ExampleWidth>(example.width);
  const prefs = useCanvasPrefs();
  const labMode = useLabMode();
  const mode = prefs.mode ?? labMode;
  const loaded = useModules(entry);

  // Dark: a `.dark` scope picks the dark tokens. Light: the light values inline,
  // so they win over `.dark` on <html>, like round tokens in a variant frame.
  const style = {
    ...(mode === "light" ? light : {}),
    colorScheme: mode,
  } as CSSProperties;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        width={width}
        setWidth={setWidth}
        mode={mode}
        surface={prefs.surface}
      />
      <div
        data-testid="library-canvas"
        data-mode={mode}
        style={style}
        className={cn(
          "min-h-0 flex-1 overflow-auto",
          mode === "dark" && "dark",
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-col items-center gap-3 p-8 text-foreground",
            prefs.surface === "plain" ? "bg-background" : "bg-muted",
          )}
        >
          <div
            className={cn(width === "column" ? "w-105 max-w-full" : "w-full")}
          >
            <Live
              entry={entry}
              example={example}
              loaded={loaded}
              values={values}
            />
          </div>
          <p className="text-xs text-muted-foreground">{example.title}</p>
        </div>
      </div>
      {controls && controls.length > 0 && (
        <LibraryControls
          controls={controls}
          values={values}
          onChange={(prop: string, v: ControlValue | undefined) =>
            setValues((cur) => withValue(cur, prop, v))
          }
          onReset={() => setValues(start())}
        />
      )}
    </div>
  );
}

function Live({
  entry,
  example,
  loaded,
  values,
}: {
  entry: OkEntry;
  example: LibraryExample;
  loaded: Loaded;
  values: ControlValues;
}) {
  if (loaded.state === "loading") {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (loaded.state === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        This entry failed to load: {loaded.message}
      </p>
    );
  }
  const problems = moduleProblems(
    entry.meta,
    loaded.component,
    loaded.examples,
  );
  const problem = Object.hasOwn(problems.examples, example.export)
    ? problems.examples[example.export]
    : problems.component;
  const Example = ownExport(loaded.examples, example.export) as
    | ComponentType<ControlValues>
    | undefined;
  if (problem || !Example) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {problem}
      </p>
    );
  }
  return (
    // Keyed by the values: after a crash, the next control change retries.
    <Boundary key={JSON.stringify(values)} what="example">
      <Example {...values} />
    </Boundary>
  );
}

function Toolbar({
  width,
  setWidth,
  mode,
  surface,
}: {
  width: ExampleWidth;
  setWidth: (w: ExampleWidth) => void;
  mode: CanvasMode;
  surface: CanvasSurface;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label="Canvas width"
        value={width}
        onValueChange={(v) => v && setWidth(v as ExampleWidth)}
      >
        <ToggleGroupItem value="column">Column 420</ToggleGroupItem>
        <ToggleGroupItem value="full">Full width</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label="Canvas theme"
        value={mode}
        onValueChange={(v) => v && setCanvasPrefs({ mode: v as CanvasMode })}
      >
        <ToggleGroupItem value="light" aria-label="Light canvas">
          <Sun />
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Dark canvas">
          <Moon />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label="Canvas background"
        value={surface}
        onValueChange={(v) =>
          v && setCanvasPrefs({ surface: v as CanvasSurface })
        }
      >
        <ToggleGroupItem value="plain">Plain</ToggleGroupItem>
        <ToggleGroupItem value="muted">Muted</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
