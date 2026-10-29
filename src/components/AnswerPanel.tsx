import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TAGS } from "@/lib/taste";

export type Answer = { pick: string; tags: string[]; reason: string };

/**
 * Pick, tags, reason, submit.
 * Keys: 1-4 pick variant, n none, m mix, Enter submit. In the textarea, Ctrl/Cmd+Enter submits.
 */
export function AnswerPanel({
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
  onSubmit: (a: Answer) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const needsReason = pick === "mix" && reason.trim() === "";
  const canSubmit = pick !== "" && !needsReason && !submitting;

  const latest = useRef({
    canSubmit,
    pick,
    tags,
    reason,
    onSubmit,
    variantIds,
    onPick,
  });
  latest.current = {
    canSubmit,
    pick,
    tags,
    reason,
    onSubmit,
    variantIds,
    onPick,
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = latest.current;
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if (e.key === "Enter") {
        if (typing && !(e.ctrlKey || e.metaKey)) return;
        if (e.altKey || e.shiftKey) return;
        if (target?.dataset.submit === "true") return; // the button handles itself
        e.preventDefault();
        if (s.canSubmit)
          s.onSubmit({ pick: s.pick, tags: s.tags, reason: s.reason });
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && s.variantIds[n - 1]) {
        s.onPick(s.variantIds[n - 1] as string);
      } else if (e.key === "n") s.onPick("none");
      else if (e.key === "m") {
        s.onPick("mix");
        e.preventDefault();
        reasonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ pick, tags, reason });
      }}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Your pick</span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={pick}
          onValueChange={(v) => v && onPick(v)}
          aria-label="Pick a variant"
          className="flex-wrap"
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
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Tags</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={tags}
          onValueChange={setTags}
          aria-label="Tags"
          className="flex-wrap"
        >
          {TAGS.map((t) => (
            <ToggleGroupItem key={t} value={t}>
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="reason" className="text-sm font-medium">
          Reason
          {pick === "mix" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              required: say which parts to mix
            </span>
          )}
        </label>
        <Textarea
          id="reason"
          ref={reasonRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why? A few words is enough."
          rows={3}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" data-submit="true" disabled={!canSubmit}>
          {submitting ? "Saving..." : "Submit"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Enter to submit. Ctrl/Cmd+Enter inside the text box.
        </span>
      </div>
    </form>
  );
}
