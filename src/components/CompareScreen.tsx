import { useState } from "react";
import { type Answer, AnswerPanel } from "@/components/AnswerPanel";
import { Badge } from "@/components/ui/badge";
import { VariantFrame } from "@/components/VariantFrame";
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
  onSubmit: (a: Answer) => void;
}) {
  const { spec } = round;
  const [pick, setPick] = useState("");
  const ids = spec.variants.map((v) => v.id);

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

      <div className={`grid gap-4 ${GRID[spec.variants.length] ?? GRID[2]}`}>
        {spec.variants.map((v, i) => (
          <VariantFrame
            key={v.id}
            spec={v}
            load={round.loaders[v.id]}
            theme={theme}
            hotkey={i + 1}
            selected={pick === v.id}
          />
        ))}
      </div>

      <AnswerPanel
        key={spec.id}
        variantIds={ids}
        pick={pick}
        onPick={setPick}
        submitting={submitting}
        error={error}
        onSubmit={onSubmit}
      />
    </div>
  );
}
