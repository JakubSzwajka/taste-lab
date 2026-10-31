import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      <div className="flex flex-wrap items-center gap-4 px-8 py-4">
        <p className="basis-full text-base leading-snug font-medium text-pretty">
          <span className="mr-2 text-xs font-normal tracking-wider text-muted-foreground uppercase">
            Question
          </span>
          {question}
        </p>
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

        <div className="min-w-48 flex-1 rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
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
            className="min-h-[calc(2lh+1rem)] max-h-[calc(8lh+1rem)] resize-none overflow-y-auto rounded-b-none border-0 leading-5 focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center justify-end gap-2 px-2 pb-2">
            <span aria-hidden="true" className="text-xs text-muted-foreground">
              {mac ? "⌘↵" : "Ctrl↵"}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon-sm"
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
