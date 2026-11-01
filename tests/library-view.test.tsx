import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { LibraryPage } from "../src/components/LibraryView";
import { LibraryControls } from "../src/components/library/LibraryControls";
import { LibraryDocs } from "../src/components/library/LibraryDocs";
import { setCanvasPrefs } from "../src/components/library/prefs";
import {
  type LibraryEntry,
  type LibraryGlob,
  loadLibrary,
} from "../src/lib/library";
import { lightTokens, parseStock } from "../src/lib/taste-theme";

const sample = resolve(import.meta.dirname, "fixtures/library/task-chip");
const baseMeta = () =>
  JSON.parse(readFileSync(join(sample, "meta.json"), "utf8"));

const CONTROLS = [
  { prop: "dense", kind: "boolean", label: "Dense rows" },
  { prop: "status", kind: "select", options: ["todo", "done"] },
  { prop: "title", kind: "text", default: "Hello" },
  { prop: "count", kind: "number" },
];

/** Entries as the app builds them, from fake glob results. */
function entries(edit?: (m: Record<string, unknown>) => void): LibraryEntry[] {
  const m = baseMeta();
  edit?.(m);
  const stub = async () => ({});
  const input: LibraryGlob = {
    json: {
      "/x/library/task-chip/meta.json": JSON.stringify(m),
      "/x/library/zz-broken/meta.json": "{ nope",
    },
    modules: {
      "/x/library/task-chip/TaskChip.tsx": stub,
      "/x/library/task-chip/examples.tsx": stub,
    },
  };
  return loadLibrary(input);
}

const stock = parseStock(
  readFileSync(resolve(import.meta.dirname, "../src/index.css"), "utf8"),
);
const light = lightTokens(stock, {
  light: { "--primary": "oklch(0.5 0.19 262)" },
  dark: {},
});

const page = (props: Partial<Parameters<typeof LibraryPage>[0]> = {}) =>
  renderToStaticMarkup(
    <LibraryPage entries={entries()} light={light} {...props} />,
  );

afterEach(() => setCanvasPrefs({ mode: undefined, surface: "plain" }));

describe("lightTokens", () => {
  it("takes theme.css :root over stock :root for every token", () => {
    expect(light["--primary"]).toBe("oklch(0.5 0.19 262)");
    expect(light["--background"]).toBe(stock.light["--background"]);
    expect(light["--radius"]).toBe(stock.light["--radius"]);
  });
});

describe("Library page", () => {
  it("shows a tree of entries with their examples, the first one open", () => {
    const html = page();
    expect(html).toContain('aria-label="Library entries and examples"');
    expect(html).toContain("2 entries");
    expect(html).toContain('href="#/library/task-chip/Default"');
    expect(html).toContain('href="#/library/task-chip/Compact"');
    expect(html).toContain('href="#/library/zz-broken"');
    expect(html).toMatch(
      /aria-current="true"[^>]*title="Typical tasks"|title="Typical tasks"[^>]*aria-current="true"/,
    );
    expect(html).toContain("task-chip / Default");
    expect(html).toContain(">Canvas<");
    expect(html).toContain(">Docs<");
  });

  it("opens the example named in the route, or the first one", () => {
    expect(page({ name: "task-chip", example: "Compact" })).toContain(
      "task-chip / Compact",
    );
    expect(page({ name: "task-chip", example: "Nope" })).toContain(
      "task-chip / Default",
    );
  });

  it("has the canvas toolbar: width, theme and background", () => {
    const html = page({ name: "task-chip", example: "Compact" });
    for (const label of [
      "Canvas width",
      "Canvas theme",
      "Canvas background",
      "Light canvas",
      "Dark canvas",
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).toContain("Column 420");
    expect(html).toContain("Full width");
  });

  it("sets the light tokens inline on a light canvas", () => {
    setCanvasPrefs({ mode: "light" });
    const html = page();
    expect(html).toMatch(
      /data-mode="light" data-taste-scope="light" style="[^"]*--background:/,
    );
    expect(html).toContain("--primary:oklch(0.5 0.19 262)");
    expect(html).toContain("color-scheme:light");
  });

  it("scopes a dark canvas with .dark and no inline tokens", () => {
    setCanvasPrefs({ mode: "dark", surface: "muted" });
    const html = page();
    expect(html).toMatch(
      /data-mode="dark" data-taste-scope="dark" style="color-scheme:dark" class="[^"]*\bdark\b/,
    );
    expect(html).not.toContain("--background:");
    expect(html).toContain("bg-muted");
  });

  it("has no Controls panel for an entry without controls", () => {
    expect(page()).not.toContain('aria-label="Controls"');
  });

  it("shows the Controls panel with the example's args, then defaults", () => {
    const html = page({
      entries: entries((m) => {
        m.controls = CONTROLS;
        (m.examples as Record<string, unknown>[])[0].args = {
          status: "done",
          count: 2,
        };
      }),
    });
    expect(html).toContain('aria-label="Controls"');
    expect(html).toContain("Dense rows");
    expect(html).toContain("&quot;done&quot;");
    expect(html).toContain("&quot;Hello&quot;");
    expect(html).toMatch(/value="2"/);
    expect(html).toContain(">unset<");
  });

  it("shows a broken entry's errors in place of the canvas", () => {
    const html = page({ name: "zz-broken" });
    expect(html).toContain("meta.json is not valid JSON");
    expect(html).toContain("Nothing to preview until these are fixed.");
    expect(html).not.toContain('aria-label="Canvas width"');
  });

  it("says when an entry does not exist", () => {
    expect(page({ name: "ghost" })).toContain("No library entry called ghost.");
  });

  it("explains an empty library", () => {
    const html = page({ entries: [] });
    expect(html).toContain("No components yet");
    expect(html).toContain('data-slot="idle-page"');
    expect(html).toContain('aria-labelledby="library-empty-title"');
    expect(html).toContain('href="#/history"');
  });
});

describe("Docs tab", () => {
  const ok = (e: LibraryEntry) => {
    if (!e.ok) throw new Error("expected a good entry");
    return e;
  };

  it("lists description, examples, rules and linked provenance", () => {
    const entry = ok(entries()[0]);
    const html = renderToStaticMarkup(
      <LibraryDocs
        entry={entry}
        rounds={new Set(["round-001"])}
        onOpen={() => {}}
      />,
    );
    expect(html).toContain("One task on one line");
    expect(html).toContain("Compact density");
    expect(html).toContain("Quiet over loud");
    expect(html).toContain('href="#/round/round-001"');
    expect(html).not.toContain(">Controls<");
  });

  it("marks a provenance round that is gone, and lists controls", () => {
    const entry = ok(entries((m) => (m.controls = CONTROLS))[0]);
    const html = renderToStaticMarkup(
      <LibraryDocs entry={entry} rounds={new Set()} onOpen={() => {}} />,
    );
    expect(html).toContain("(round not found)");
    expect(html).not.toContain('href="#/round/round-001"');
    expect(html).toContain(">Controls<");
    expect(html).toContain("todo | done");
  });
});

describe("Controls panel", () => {
  it("renders one widget per kind and marks unset values", () => {
    const html = renderToStaticMarkup(
      <LibraryControls
        controls={[
          { prop: "dense", kind: "boolean" },
          { prop: "status", kind: "select", options: ["todo", "done"] },
          {
            prop: "size",
            kind: "select",
            options: ["xs", "sm", "md", "lg", "xl"],
          },
          { prop: "title", kind: "text" },
          { prop: "count", kind: "number" },
        ]}
        values={{ dense: true, status: "done" }}
        onChange={() => {}}
        onReset={() => {}}
      />,
    );
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    // Few options: toggles. Many: a menu that says unset.
    expect(html).toMatch(
      /aria-label="status"[^>]*role="radiogroup"|role="radiogroup"[^>]*aria-label="status"/,
    );
    expect(html).toMatch(/aria-label="size"/);
    expect(html).toContain('type="number"');
    expect(html.match(/>unset</g)?.length).toBe(4); // size button, size, title, count
  });
});
