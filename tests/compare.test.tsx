import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerBar } from "../src/components/AnswerPanel";
import { CompareScreen } from "../src/components/CompareScreen";
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
    <CompareScreen
      round={round(preview)}
      theme="dark"
      previous={extra.previous}
      submitting={false}
      error={extra.error ?? null}
      onSubmit={() => {}}
    />,
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
  it("has no page heading: the header's round tier carries the question", () => {
    const html = render("flip");
    expect(html).not.toMatch(/<h1[\s>]/);
    expect(html).not.toContain("Which reason input feels right?");
  });

  it("fills the page: the frame box and frames grow", () => {
    const html = render("flip");
    expect(html).toMatch(/class="flex flex-1 flex-col"/);
    expect(html).toMatch(
      /<section aria-label="Variant a: Label a" class="[^"]*\bgrow\b/,
    );
  });

  it("pins a one-row answer bar to the bottom, after the frames", () => {
    const html = render("flip");
    const form = answerForm(html);
    expect(html.indexOf("Variant c: Label c")).toBeLessThan(html.indexOf(form));
    expect(form).toMatch(/^<form aria-label="Answer" class="sticky bottom-0/);
    // Pick buttons for each variant, None and Mix.
    for (const id of ["a", "b", "c"]) {
      expect(form).toContain(`aria-label="Variant ${id}"`);
    }
    expect(form).toContain("None");
    expect(form).toContain("Mix");
    // A single-line reason that fills the row, then Submit.
    expect(form).toMatch(/<textarea[^>]*aria-label="Reason"[^>]*rows="1"/);
    expect(form).toMatch(
      /<textarea[^>]*class="[^"]*flex-1[^"]*whitespace-nowrap/,
    );
    expect(form.indexOf("<textarea")).toBeLessThan(form.indexOf(">Submit<"));
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
      <AnswerBar
        variantIds={["a", "b"]}
        pick={pick}
        onPick={() => {}}
        submitting={submitting}
        error={null}
        onSubmit={() => {}}
      />,
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

  it("shows Saving... while a save runs", () => {
    const html = bar("a", true);
    expect(html).toContain("Saving...");
    expect(submitTag(html)).toContain('disabled=""');
  });
});
