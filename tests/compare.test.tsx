import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerBar } from "../src/components/AnswerPanel";
import { CompareScreen } from "../src/components/CompareScreen";
import { TooltipProvider } from "../src/components/ui/tooltip";
import type { LoadedRound } from "../src/lib/rounds";
import type { TasteEntry } from "../src/lib/taste";

type OkRound = Extract<LoadedRound, { ok: true }>;

const never = () => new Promise<never>(() => {});

const round = (preview: "columns" | "flip"): OkRound => ({
  ok: true,
  id: "round-009",
  loaders: { a: never, b: never, c: never },
  spec: {
    id: "round-009",
    level: "layout",
    component: "compare-page",
    question: "Which reason input feels right?",
    fixture: "lab",
    basedOn: { round: "round-003", pick: "c" },
    preview,
    variants: ["a", "b", "c"].map((id) => ({
      id,
      file: `${id}.tsx`,
      label: `Label ${id}`,
      changes: `Changes ${id}`,
    })),
  },
});

const previous: TasteEntry = {
  ts: "2026-10-30T09:15:03.386Z",
  round: "round-009",
  component: "compare-page",
  level: "layout",
  shown: ["a", "b", "c"],
  pick: "a",
  tags: ["clean"],
  reason: "",
  theme: "dark",
};

function render(
  preview: "columns" | "flip",
  extra: { previous?: TasteEntry; error?: string | null } = {},
) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <CompareScreen
        round={round(preview)}
        theme="dark"
        previous={extra.previous}
        submitting={false}
        error={extra.error ?? null}
        onSubmit={() => {}}
      />
    </TooltipProvider>,
  );
}

const submitTag = (html: string) =>
  html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "missing";

const answerForm = (html: string) => {
  const at = html.indexOf('<form aria-label="Answer"');
  expect(at).toBeGreaterThan(-1);
  return html.slice(at);
};

describe("CompareScreen (round-003 c + round-009 a)", () => {
  it("uses the roomy soft-layer canvas and raised frames from round-016 b", () => {
    const html = render("flip");
    expect(html).toContain(
      "gap-8 bg-linear-to-b from-primary/10 via-muted/40 to-accent/30 px-8 pt-8 pb-8",
    );
    expect(html).toContain("rounded-xl border bg-card shadow-md");
    expect(html).toContain("bg-linear-to-r from-primary/15 via-card to-card");
    expect(html).toMatch(
      /data-slot="badge"[^>]*data-variant="default"[^>]*>a · 1</,
    );
    expect(html).toContain("[&amp;&gt;*]:bg-accent");
    for (const name of [
      "layers",
      "blend",
      "git-branch",
      "columns-3",
      "panels-top-left",
      "send-horizontal",
    ]) {
      const icon = html.match(
        new RegExp(`<svg[^>]*class="[^"]*lucide-${name}[^"]*"[^>]*>`),
      )?.[0];
      expect(icon, name).toContain('stroke-width="1.75"');
      expect(icon, name).toContain("size-5");
    }
  });

  it("has no page heading and puts the full question in the answer bar", () => {
    const html = render("flip");
    expect(html).not.toMatch(/<h1[\s>]/);
    const form = answerForm(html);
    expect(form).toContain("Which reason input feels right?");
    expect(form).toContain("text-base leading-snug font-medium text-pretty");
    expect(form).toContain("text-muted-foreground uppercase");
    expect(form.indexOf("Which reason")).toBeLessThan(
      form.indexOf("<textarea"),
    );
  });

  it("fills the page: the frame box and frames grow", () => {
    const html = render("flip");
    expect(html).toMatch(/class="flex flex-1 flex-col"/);
    expect(html).toMatch(
      /<section aria-label="Variant a: Label a" class="[^"]*\bgrow\b/,
    );
  });

  it("pins the question and composer to the bottom, after the frames", () => {
    const html = render("flip");
    const form = answerForm(html);
    expect(html.indexOf("Variant c: Label c")).toBeLessThan(html.indexOf(form));
    expect(form).toMatch(/^<form aria-label="Answer" class="sticky bottom-3/);
    expect(form).toContain("m-3 shrink-0 rounded-xl border bg-card");
    expect(form).toContain("shadow-lg");
    expect(form).toContain("gap-4 px-8 py-4");
    // Pick buttons for each variant, None and Mix.
    for (const id of ["a", "b", "c"]) {
      expect(form).toContain(`aria-label="Variant ${id}"`);
    }
    expect(form).toContain("None");
    expect(form).toContain("Mix");
    expect(form).toMatch(/<textarea[^>]*aria-label="Reason"[^>]*rows="2"/);
    expect(form).toContain("min-w-48 flex-1 rounded-lg border border-input");
    expect(form).toContain("max-h-[calc(8lh+1rem)]");
    expect(form).toContain("overflow-y-auto");
    expect(form.match(/<textarea[^>]*>/)?.[0]).not.toContain(
      "whitespace-nowrap",
    );
    expect(form).toContain("justify-end gap-2 px-2 pb-2");
    expect(submitTag(form)).toContain('aria-label="Submit"');
    expect(form).not.toContain(">Submit<");
    expect(form).toContain("Ctrl↵");
  });

  it("has no tags in the UI", () => {
    const form = answerForm(render("flip"));
    expect(form).not.toMatch(/tags/i);
    for (const tag of ["airy", "cramped", "loud", "clean", "too much"]) {
      expect(form).not.toContain(`>${tag}<`);
    }
  });

  it("starts with Submit disabled until a pick", () => {
    const form = answerForm(render("flip"));
    expect(submitTag(form)).toContain('disabled=""');
  });

  it("says when a round is already answered and still allows another", () => {
    const html = render("flip", { previous });
    expect(html).toContain("Already answered (pick: a)");
    expect(html).toContain("Submitting adds another log line.");
    expect(render("flip")).not.toContain("Already answered");
  });

  it("flip shows tabs and hides all but one variant", () => {
    const html = render("flip");
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tabpanel"[^>]*hidden=""/g)?.length).toBe(2);
  });

  it("columns shows every variant, with no tab panels", () => {
    const html = render("columns");
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain("3 variants side by side");
    expect(html).not.toContain('role="tabpanel"');
    expect(html).not.toMatch(/<div[^>]*hidden=""/);
  });

  it("shows a save error in the bar", () => {
    const form = answerForm(render("flip", { error: "POST failed (500)" }));
    expect(form).toContain('role="alert"');
    expect(form).toContain("POST failed (500)");
  });
});

describe("AnswerBar", () => {
  const bar = (pick: string, submitting = false) =>
    renderToStaticMarkup(
      <TooltipProvider>
        <AnswerBar
          question="Which is right?"
          variantIds={["a", "b"]}
          pick={pick}
          onPick={() => {}}
          submitting={submitting}
          error={null}
          onSubmit={() => {}}
        />
      </TooltipProvider>,
    );

  it("enables Submit once picked", () => {
    expect(submitTag(bar("b"))).not.toContain('disabled=""');
  });

  it("Mix needs a reason: Submit stays disabled and the reason is required", () => {
    const html = bar("mix");
    expect(submitTag(html)).toContain('disabled=""');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain("Required: say which parts to mix");
    expect(html).toContain('title="Mix needs a reason"');
  });

  it("marks the icon busy while a save runs", () => {
    const html = bar("a", true);
    expect(submitTag(html)).toContain('aria-busy="true"');
    expect(submitTag(html)).toContain('disabled=""');
  });
});
