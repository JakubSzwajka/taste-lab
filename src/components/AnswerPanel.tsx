import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  enterAction,
  MENU_SELECTOR,
  oneLine,
  pickKey,
  pickShortcutAllowed,
  reasonKeyAction,
} from "@/lib/keys";
import { canSubmit as answerReady } from "@/lib/submit";

export type BarAnswer = { pick: string; reason: string };

/**
 * The answer bar from .taste-lab round-009 a (round-003 c without tags): one
 * row pinned to the bottom with pick, a one-line reason that fills the row,
 * and Submit.
 * Keys: 1-4 pick and show a variant, n none, m mix (focuses the reason),
 * r focus the reason, Esc leave it. Enter submits from the reason, and from
 * the page unless a button, link or toggle has focus.
 */
export function AnswerBar({
  variantIds,
  pick,
  onPick,
  submitting,
  error,
  onSubmit,
}: {
  variantIds: string[];
  pick: string;
  onPick: (pick: string) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: (a: BarAnswer) => void;
}) {
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const mixNeedsReason = pick === "mix" && reason.trim() === "";
  const ready = answerReady(pick, reason, submitting);

  const latest = useRef({ ready, pick, reason, onSubmit, variantIds, onPick });
  latest.current = { ready, pick, reason, onSubmit, variantIds, onPick };
  const submit = () => {
    const s = latest.current;
    if (s.ready) s.onSubmit({ pick: s.pick, reason: s.reason });
  };

  function choose(id: string) {
    onPick(id);
    // Mix needs a reason, so take the cursor there.
    if (id === "mix") reasonRef.current?.focus();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // The reason handled this key itself (Enter, Esc).
      if (e.defaultPrevented) return;
      const s = latest.current;
      const target = e.target as HTMLElement | null;
      if (e.key === "Enter") {
        // Focused buttons, links and toggles keep their own Enter.
        if (enterAction(e, target) !== "submit") return;
        e.preventDefault();
        if (s.ready) s.onSubmit({ pick: s.pick, reason: s.reason });
        return;
      }
      const inMenu = target?.closest?.(MENU_SELECTOR) != null;
      const allowed = pickShortcutAllowed(
        e,
        target && {
          tagName: target.tagName,
          isContentEditable: target.isContentEditable,
        },
        inMenu,
      );
      if (!allowed) return;
      const act = pickKey(e.key, s.variantIds);
      if (!act) return;
      if ("pick" in act) s.onPick(act.pick);
      if (act.focusReason) {
        // Keep the letter out of the reason.
        e.preventDefault();
        reasonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      aria-label="Answer"
      className="sticky bottom-0 z-10 shrink-0 border-t bg-card text-card-foreground"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mx-auto flex max-w-[120rem] flex-wrap items-center gap-3 px-4 py-3">
        <ToggleGroup
          type="single"
          variant="outline"
          value={pick}
          onValueChange={(v) => v && choose(v)}
          aria-label="Pick a variant"
        >
          {variantIds.map((id, i) => (
            <ToggleGroupItem key={id} value={id} aria-label={`Variant ${id}`}>
              <span className="uppercase">{id}</span>
              <Badge variant="outline" className="font-mono">
                {i + 1}
              </Badge>
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="none">
            None{" "}
            <Badge variant="outline" className="font-mono">
              n
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="mix">
            Mix{" "}
            <Badge variant="outline" className="font-mono">
              m
            </Badge>
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator
          orientation="vertical"
          className="data-vertical:h-6 data-vertical:self-center"
        />

        <Textarea
          ref={reasonRef}
          aria-label="Reason"
          aria-required={pick === "mix"}
          aria-keyshortcuts="r"
          value={reason}
          onChange={(e) => setReason(oneLine(e.target.value))}
          onKeyDown={(e) => {
            const act = reasonKeyAction({
              key: e.key,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              altKey: e.altKey,
              shiftKey: e.shiftKey,
              isComposing: e.nativeEvent.isComposing,
            });
            if (act === "ignore") return;
            e.preventDefault();
            if (act === "submit") submit();
            else if (act === "leave") e.currentTarget.blur();
          }}
          placeholder={
            pick === "mix"
              ? "Required: say which parts to mix"
              : "Why? A few words is enough."
          }
          rows={1}
          className="field-sizing-fixed h-8 min-h-8 min-w-48 flex-1 resize-none overflow-hidden py-1.5 whitespace-nowrap"
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          data-submit="true"
          disabled={!ready}
          title={mixNeedsReason ? "Mix needs a reason" : undefined}
        >
          {submitting ? "Saving..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
