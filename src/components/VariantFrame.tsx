import { type CSSProperties, lazy, Suspense, useMemo } from "react";
import { Boundary } from "@/components/Boundary";
import { Badge } from "@/components/ui/badge";
import type { VariantLoader, VariantSpec } from "@/lib/rounds";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Renders one variant. Only its content gets prototype tokens, not the header.
 * Inline round overrides beat the scoped stock and theme.css values in both modes.
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
        // grow: on Compare the frame fills the height above the answer bar.
        // Not flex-1: with overflow-hidden its basis 0 would clip the variant.
        "flex min-w-0 grow flex-col overflow-hidden rounded-xl border bg-card shadow-md",
        selected && "ring-2 ring-primary",
      )}
    >
      {!bare && (
        <header className="flex flex-col gap-1.5 bg-linear-to-r from-primary/15 via-card to-card px-7 pt-6 pb-4">
          <div className="flex items-center gap-2">
            {hotkey !== undefined && (
              <Badge className="font-mono uppercase">
                {spec.id} · {hotkey}
              </Badge>
            )}
            <h2 className="text-base font-semibold tracking-tight">
              {spec.label}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{spec.changes}</p>
        </header>
      )}
      <div
        data-taste-scope={theme}
        style={style}
        className="min-w-0 flex-1 bg-background px-7 pt-4 pb-7 text-foreground"
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
