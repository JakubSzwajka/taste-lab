import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  enterAction,
  MENU_SELECTOR,
  pickKey,
  pickShortcutAllowed,
  reasonKeyAction,
} from "@/lib/keys";
import { canSubmit as answerReady } from "@/lib/submit";

export type BarAnswer = { pick: string; reason: string };

/**
 * The floating answer bar carries the full question (round-019 d), picks and
 * a growing multiline reason. Ctrl/Cmd+Enter submits from the reason.
 * Page shortcuts stay in place; Escape leaves the reason.
 */
/** Pick toggles: big enough to hit, one size for letters and words. */
const PICK =
  "min-w-14 px-3 text-sm font-medium data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&[data-state=on]_[data-slot=badge]]:border-primary-foreground/40 [&[data-state=on]_[data-slot=badge]]:text-primary-foreground";

export function AnswerBar({
  question,
  variantIds,
  pick,
  onPick,
  submitting,
  error,
  onSubmit,
}: {
  question: string;
  variantIds: string[];
  pick: string;
  onPick: (pick: string) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: (a: BarAnswer) => void;
}) {
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const mac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
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
      // The composer owns its keys, including IME composition.
      if (target === reasonRef.current) return;
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
      className="sticky bottom-3 z-10 m-3 shrink-0 rounded-xl border bg-card text-card-foreground shadow-lg"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-3 px-8 py-4">
        <p className="text-base leading-snug font-medium text-pretty">
          <span className="mr-2 text-xs font-normal tracking-wider text-muted-foreground uppercase">
            Question
          </span>
          {question}
        </p>
        {/* One box for the whole answer (operator, after round-019 d): the
            reason on top, picks and Submit in its bottom row. */}
        <div className="rounded-xl border border-input has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/50 dark:bg-input/30">
          <Textarea
            ref={reasonRef}
            aria-label="Reason"
            aria-required={pick === "mix"}
            aria-keyshortcuts={mac ? "Meta+Enter" : "Control+Enter"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            rows={2}
            className="min-h-[calc(2lh+1.5rem)] max-h-[calc(8lh+1.5rem)] resize-none overflow-y-auto rounded-b-none border-0 px-4 pt-3 text-base leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex flex-wrap items-center gap-3 px-3 pb-3">
            <ToggleGroup
              type="single"
              variant="outline"
              value={pick}
              onValueChange={(v) => v && choose(v)}
              size="lg"
              aria-label="Pick a variant"
            >
              {variantIds.map((id, i) => (
                <ToggleGroupItem
                  key={id}
                  value={id}
                  aria-label={`Variant ${id}`}
                  className={PICK}
                >
                  <span className="uppercase">{id}</span>
                  <Badge variant="outline" className="font-mono">
                    {i + 1}
                  </Badge>
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value="none" className={PICK}>
                None{" "}
                <Badge variant="outline" className="font-mono">
                  n
                </Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="mix" className={PICK}>
                Mix{" "}
                <Badge variant="outline" className="font-mono">
                  m
                </Badge>
              </ToggleGroupItem>
            </ToggleGroup>
            <span
              aria-hidden="true"
              className="ml-auto font-mono text-xs text-muted-foreground"
            >
              {mac ? "⌘↵" : "Ctrl↵"}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon-lg"
                  className="size-10 rounded-full"
                  data-submit="true"
                  aria-label="Submit"
                  aria-busy={submitting}
                  disabled={!ready}
                  title={mixNeedsReason ? "Mix needs a reason" : undefined}
                >
                  <SendHorizontal className="size-5" strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {submitting ? "Saving..." : "Submit"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
