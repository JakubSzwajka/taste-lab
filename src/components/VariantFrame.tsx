import {
  Component,
  type CSSProperties,
  type ErrorInfo,
  lazy,
  type ReactNode,
  Suspense,
  useMemo,
} from "react";
import { Badge } from "@/components/ui/badge";
import type { VariantLoader, VariantSpec } from "@/lib/rounds";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

class Boundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("variant crashed", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          This variant failed to render: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Renders one variant. Token overrides are inline CSS vars on the frame element.
 * They sit below `.dark` on <html> in the cascade, so they win in both themes.
 * `color-scheme` follows the theme so `light-dark()` values in tokens work.
 */
export function VariantFrame({
  spec,
  load,
  theme,
  hotkey,
  selected,
  bare,
}: {
  spec: VariantSpec;
  load: VariantLoader;
  theme: Theme;
  hotkey?: number;
  selected?: boolean;
  /** Hide the label header (used by history thumbnails). */
  bare?: boolean;
}) {
  const Variant = useMemo(() => lazy(load), [load]);
  const style = { ...spec.tokens, colorScheme: theme } as CSSProperties;
  return (
    <section
      aria-label={`Variant ${spec.id}: ${spec.label}`}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/30",
        selected && "ring-2 ring-primary",
      )}
    >
      {!bare && (
        <header className="flex flex-col gap-1 border-b bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            {hotkey !== undefined && (
              <Badge variant="secondary" className="font-mono uppercase">
                {spec.id} · {hotkey}
              </Badge>
            )}
            <h2 className="text-sm font-medium">{spec.label}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{spec.changes}</p>
        </header>
      )}
      <div
        style={style}
        className="min-w-0 flex-1 bg-background p-4 text-foreground"
      >
        <Boundary>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Loading...</p>
            }
          >
            <Variant />
          </Suspense>
        </Boundary>
      </div>
    </section>
  );
}
