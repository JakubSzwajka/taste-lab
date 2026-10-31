# AGENTS.md

taste-lab is a local loop for tuning UI taste. The operator compares component variants side by side and logs a pick plus a reason. You (the agent) read that log and write the next round as files. The app never calls an LLM.

The lab is a tool. The taste data lives in a `.taste-lab` data dir inside each app repo, committed with the app. One lab serves any data dir. This repo's own sample data is the demo in `examples/demo/.taste-lab/`.

## Data dir

```
<repo>/.taste-lab/
  config.json          { "version": 1, "name": "<app name>" }
  fixtures/index.ts    named fixtures + `fixtures` map + `fixtureKeys`
  fixtures/*.ts        fixture data and types
  theme.css            prototype tokens for this app, over shadcn stock
  rounds/round-NNN/    round.json + 2 to 4 variant .tsx files
  library/<name>/      agreed components: <Name>.tsx, examples.tsx, meta.json
  taste.jsonl          answers, append-only
  DESIGN.md            rules for this app
```

- `config.json`: `version` is `1`. `name` is optional and defaults to the parent folder name (`<repo>`). The header shows it.
- `fixtures/index.ts` is what variants get from `@/fixtures`. It must export `fixtures`, an object that maps each `fixture` key used in `round.json` to its data, and `fixtureKeys`. Other named exports (data, types, helpers) are up to the app.
- `theme.css` is optional. It holds this app's shadcn tokens. See "Theme" below.
- Prototype content comes from the data dir. The lab provides its UI, the stock primitives in `src/components/ui/` and shadcn stock tokens in `src/index.css`. The data dir's `theme.css` overrides stock only inside previews. Lab chrome uses `src/lab-theme.css`, regardless of the data dir.
- `library/` holds the components the operator agreed on. See "Library" below. `init` creates it empty.

## Commands for a data dir

Run them from anywhere. Relative `--dir` paths resolve against the current folder.

```sh
node <taste-lab>/bin/taste-lab.mjs init  --dir <repo>/.taste-lab [--name X]
node <taste-lab>/bin/taste-lab.mjs check --dir <repo>/.taste-lab
node <taste-lab>/bin/taste-lab.mjs library --dir <repo>/.taste-lab [--status draft|agreed] [--json]
node <taste-lab>/bin/taste-lab.mjs serve --dir <repo>/.taste-lab [--port N] [--lan [--host <ip>]] [--events]
```

- `init` writes the skeleton above with one sample fixture (`items`), an empty `library/`, an empty `taste.jsonl`, a `theme.css` with a header comment and empty `:root` and `.dark` blocks, and a `DESIGN.md` stub. It refuses to touch a path that exists.
- `check` validates `theme.css` (see "Theme"), loads the fixtures (both `fixtures` and `fixtureKeys` must be exported and list the same keys), validates every `round.json` with the app's validator, runs the variant scanner on `rounds/` and validates `library/` (see "Library"). Exit 0 when clean, 1 with one line per problem (filesystem trouble such as a dangling symlink included), 2 on a usage error.
- A data dir path must not contain a line break or control character, a backslash, `*`, `{`, `}` or both quote kinds. Tailwind reads `@source` raw and as a glob, so `serve`, `init` and `check` reject such paths up front. Spaces, `$`, one kind of quote and `[`, `]`, `(`, `)`, `!` work.
- `library` lists entries with name, status, title, path, example count, and validation problems. `--status` filters by `draft` or `agreed`. `--json` prints a JSON array. Exit 1 means an entry is invalid. Exit 2 means usage is invalid.
- `serve` starts the lab on 127.0.0.1 and prints the URL. Without `--port` it takes the first free port from 5300 and never picks 3000, 3326, 5173 or 5310. Stop it with Ctrl+C.
- `serve --lan` is opt-in LAN access, see "LAN mode". `--host` without `--lan` is a usage error (exit 2).
- `serve --events` writes JSON lines on stdout for a parent process, see "Event protocol".

## Core principle: 100% shadcn

The goal is a shadcn component library that is easy to restyle later. Every variant is built from shadcn only.

- Compose stock primitives from `@/components/ui/*`. Never hand-build a widget a primitive already covers.
- Style only with theme tokens (CSS variables) and semantic Tailwind classes: `bg-card`, `text-muted-foreground`, `border`, `bg-primary`, `rounded-md`.
- No raw colors. No hex, rgb, hsl or oklch literals. No palette classes (`bg-blue-500`, `text-white`). No arbitrary color values (`text-[#333]`, `bg-[red]`, `[color:red]`). No `style` prop in variants, including style objects spread into JSX, and no `.style` access: per-variant tokens go in `round.json`. Variants and library files use JSX. They may not import or use element factories (`createElement`, `cloneElement`, `jsx`, `jsxs`, `jsxDEV`), including aliases and namespace access like `React.createElement`. Plain objects with a `style` key, like `Intl.NumberFormat` options, are fine.
- Looks differ through composition, layout, spacing, type scale and per-variant token overrides in `round.json`.
- Never hand-edit `src/components/ui/*`. It is generated by the shadcn CLI. Add a primitive with `pnpm dlx shadcn@latest add <name>` only when a variant needs it.
- The app chrome (`src/**` outside `ui/`) follows the same color rule. One exception: `src/favicon.svg`, the tab icon, copies `--primary` and `--primary-foreground` from `src/lab-theme.css` as literals, because a browser tab cannot read theme tokens. Update it when those tokens change.

`taste-lab check --dir` enforces the import allowlist and the no-raw-colors rule on every `.tsx` under `rounds/`. In this repo, `pnpm test` runs the same scanner on the demo rounds.

## Variant file API

A variant is a `.tsx` file in a round folder. It default-exports a React component with no required props.

Allowed imports, nothing else:

| Import                     | Use                     |
| -------------------------- | ----------------------- |
| `react`                    | hooks, types            |
| `@/components/ui/*`        | shadcn primitives       |
| `@/fixtures`               | the data dir's fixtures |
| `@/lib/utils`              | `cn()`                  |
| `@/library/<name>/<Name>`  | a library component     |
| `lucide-react`             | icons                   |
| `class-variance-authority` | `cva` variants          |

Available primitives: `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `dropdown-menu`, `input`, `progress`, `resizable`, `separator`, `sheet`, `sidebar`, `skeleton`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`.

`sidebar` needs a `SidebarProvider` and is `fixed` to the viewport by default. Inside a frame, give the provider `relative` and the `Sidebar` `className="absolute h-full"`, as the Library page does. `resizable` wraps `react-resizable-panels`.

`@/fixtures` resolves to `<dataDir>/fixtures/index.ts`. `@/library/<name>/<Name>` resolves to `<dataDir>/library/<name>/<Name>.tsx`. Nothing deeper or looser is allowed. `@/components/ui/*` and `@/lib/utils` resolve to the lab's own stock primitives. `react`, `lucide-react` and `class-variance-authority` come from the lab's `node_modules`, so a data dir needs no install.

Fixtures in the demo (`examples/demo/.taste-lab/fixtures/`). Other data dirs define their own:

- `tasks: Task[]` for item and card rounds. Fields: `id`, `title`, `status` (`todo | in-progress | in-review | blocked | done`), `priority` (`low | medium | high | urgent`), `assignee {name, initials}`, `due` (ISO date), `tags`, `comments`, `description`.
- `rows: Row[]` for table rounds. Fields: `id`, `name`, `owner {name, initials}`, `status` (`active | paused | at-risk | done`), `progress` (0 to 100), `amount` (USD), `updated` (ISO date).
- Helpers `formatDate(iso)` and `formatCurrency(n)`. Types `Task`, `Row`, `Person`.
- `fixtures` and `fixtureKeys` map the `fixture` key in `round.json` to data. Add a fixture by adding a key in `<dataDir>/fixtures/index.ts`.

All variants in a round must render the same fixture data. Render the whole fixture (a list of cards, a full table), not one item.

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tasks } from "@/fixtures";

export default function Dense() {
  return (
    <div className="grid gap-2">
      {tasks.map((t) => (
        <Card key={t.id} size="sm">
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{t.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Round contract

```
<dataDir>/rounds/
  round-001/
    round.json
    a.tsx  b.tsx  c.tsx      # 2 to 4 variants
```

`round.json`:

```json
{
  "id": "round-001",
  "level": "component",
  "component": "card",
  "question": "Which task card feels right?",
  "fixture": "tasks",
  "basedOn": null,
  "preview": "columns",
  "variants": [
    {
      "id": "a",
      "file": "a.tsx",
      "label": "Dense outline",
      "changes": "1px border, 12px padding, meta inline",
      "tokens": { "--radius": "0.25rem" }
    }
  ]
}
```

- `id` equals the folder name. Rounds sort by id. Use `round-001`, `round-002`, ...
- `level` is `token`, `component` or `layout`.
- `fixture` is a key of `fixtures`.
- `basedOn` is `null` or `{ "round": "round-000", "pick": "b" }`.
- `preview` is optional: `"columns"` (default) or `"flip"`. It sets how the compare screen starts. `columns` shows the variants side by side. `flip` shows one variant at full page width with A/B/C tabs. Use `flip` for tables and layouts that need width. The operator can switch at any time, so this is only the starting view. Any other value is a round error.
- `variants` has 2 to 4 entries. Each `file` is a `.tsx` file in the same folder. `label` and `changes` show in the frame header.
- A bad `round.json` shows a readable error for that round in the app. Other rounds keep working.
- The app finds rounds with `import.meta.glob`. No code change per round.
- Current round is the first round with no log entry. The operator can open any round.

### Token overrides

`tokens` is optional per variant. Keys are shadcn variable names (`--radius`, `--primary`, `--card`, `--muted`, `--border`, ...). Values are any CSS value for that variable.

The app writes them as inline `style` custom properties on the variant content's prototype scope. They beat the scoped stock and data dir tokens in light and dark mode. The frame header stays in the chrome theme. Corollary: an override applies in both themes. If a color must differ per theme, use `light-dark(a, b)`. The frame sets `color-scheme` to the active theme so this works. Prefer `oklch(...)` values to match the theme; literals are allowed in `round.json` and `theme.css` only, never in `.tsx`.

Inside each prototype: shadcn stock, then `<dataDir>/theme.css`, then per-variant overrides. Overrides win. Lab chrome is separate. See "Theme".

## Theme

The lab has two theme layers.

Lab chrome uses `src/lab-theme.css` over the defaults in `src/index.css`. These are taste.lab's slate, teal and coral tokens from meta rounds 011-014. They style the header, frame headers, answer bar, History, notices and Theme page table. Library sidebars, toolbars and panels use them too. Serving another data dir never changes these tokens.

Prototypes use shadcn stock from `src/index.css`, then `<dataDir>/theme.css`. Variant content, the Library canvas and Theme page chip backdrops have a `data-taste-scope` set to `light` or `dark`. The server emits every token for each scope, so none inherits the lab look. Round tokens override that scope inline. Token rounds decide what goes into the data dir theme.

```css
:root {
  --primary: oklch(0.55 0.2 255);
}
.dark {
  --primary: oklch(0.75 0.15 255);
}
```

- Allowed: `:root` and `.dark` blocks, comments, and custom properties whose names the lab's `src/index.css` defines in `:root` or `.dark`: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, their `-foreground` pairs, `--border`, `--input`, `--ring`, `--chart-1` to `--chart-5`, `--radius` and `--sidebar`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` with their `-foreground` pairs. Raw color literals are fine here. This file is the one place they live.
- Not allowed, each reported by `check` with a line number: other selectors (including `:root, .dark`), at-rules, `@import`, `url()`, `!important`, quotes and backslashes in values, unbalanced `()` or `[]`, a stray `;` inside a value, names outside the set, non-custom properties. The app drops a rejected part and the Theme page lists it.
- A missing file or empty blocks mean the stock theme. A token missing from a mode falls back to stock for that mode. A `:root` value does not replace the stock `.dark` value. A token that stock defines only in `:root` (`--radius`) applies to both modes.
- Prototype order: shadcn stock, then `theme.css`, then each variant's `round.json` `tokens`. A round override still wins. "Stock" in the Theme page, theme data module, Library light values and `check` always means shadcn stock, never chrome tokens.
- The server loads accepted `theme.css` values as a scoped stylesheet. Its selectors never target the page's `:root` or `.dark`. Creating, editing or deleting the file updates previews and theme data without a restart.
- Write separate `:root` and `.dark` values in `theme.css`, not `light-dark()`. Split winning round values when promoting them.
- The Theme page (`#/theme`, the paintbrush icon in the header) is one dense table (round-010 a). The title line says how many tokens come from `theme.css`. An All / theme.css / Stock toggle group filters the rows. Ignored parts of `theme.css` sit on top as a compact list with line numbers, only when there are any.
- One row per token, grouped by role (Surfaces, Brand, States, Charts, Sidebar, Shape) with a count per group: the name, a light chip and value, a dark chip and value, and a source pill of one size ("theme.css" or "stock"). A value from `theme.css` shows in the foreground color. Everything else is stock. `--radius` is a sample box.
- Each chip sits on a prototype backdrop with every stock-plus-theme token of its mode set inline. The chip's color is its real value. Light chips read in a dark lab and dark chips in a light lab. A `var()` value resolves in its own mode. These token values are the page's only inline styles, as with the Library canvas. Table text, filters and source pills keep the chrome theme.

### Promoting a token round winner

1. Copy the winning variant's `tokens` into `theme.css`. Put each value in `:root` (light) and in `.dark`.
2. Split `light-dark(a, b)` into `a` in `:root` and `b` in `.dark`. A plain value goes in both blocks, or in `:root` alone when stock `.dark` should stay.
3. Cite the round in a comment next to the values (`/* round-007 b */`) and in the Tokens table of `DESIGN.md`.
4. Run `taste-lab check --dir <dataDir>`. Open the Theme page to see the values marked.

## Taste log contract

`<dataDir>/taste.jsonl` is append-only, one JSON object per line:

```json
{
  "ts": "2026-...Z",
  "round": "round-001",
  "component": "card",
  "level": "component",
  "shown": ["a", "b", "c"],
  "pick": "b",
  "tags": ["airy", "clean"],
  "reason": "less noise",
  "theme": "dark",
  "view": "flip"
}
```

- `view` is optional: `"columns"` or `"flip"`, the view in use when the operator answered. Lines written before it existed have no `view` and stay valid.
- `pick` is a variant id from `shown`, `"none"` or `"mix"`. For `mix`, `reason` is required and says which parts. Reasons may contain newlines, escaped inside the JSONL entry. History shows line breaks as spaces and keeps the full reason in the cell title.
- `tags` is optional in a `POST` and defaults to `[]`. The Compare page has no tags (round-009 a), so new lines carry `tags: []`. Old lines keep theirs. Tags that are sent come from: airy, cramped, loud, quiet, dated, clean, playful, serious, too much, too little.
- Never edit or reorder existing lines. Only the app middleware appends.

Endpoints, served by `taste-lab serve` and `pnpm preview` for the served data dir (loopback only, Host must be 127.0.0.1, localhost or ::1; `serve --lan` uses the LAN rules instead, see "LAN mode"). The app reads the log only here: Vite refuses to serve `taste.jsonl` as a file:

- `POST /api/taste` validates the body and appends one line. `201 {entry}` on success, `400 {error}` on bad input.
- `GET /api/taste` returns `{ entries, skipped }`. `skipped` counts unreadable lines.

## The loop

1. Read `<dataDir>/taste.jsonl` and `<dataDir>/DESIGN.md`. Look at the winning variant files of recent rounds.
2. Write the next round in `<dataDir>/rounds/round-NNN/`. Set `basedOn` to the pick you build on. Change one thing per round. Make variants differ in clear directions.
3. Run `taste-lab check --dir <dataDir>`. Fix anything flagged. For the demo in this repo, also run `pnpm check` and `pnpm test`.
4. Tell the operator to refresh the app and answer. The running server picks up new rounds and their Tailwind classes without a restart.
5. Every ~5 rounds, distill the log into `<dataDir>/DESIGN.md`: Do, Don't, Tokens, Open questions. Cite round ids.
6. Read tags and reasons. A "none" means all options missed. Change direction, not detail.

## Header

The two-tier header uses a 64px top bar and 48px round tier, with 32px horizontal padding and 16px gaps. Page toggles are 44px tall and at least 48px wide (round-015 mix). Chrome icons are plain 20px lucide glyphs at stroke 1.75: GalleryHorizontal, Library, Paintbrush, ScrollText, circled round arrows and Sun/Moon (round-016 b). Keep the current wordmark; round-017 is open.

## Compare page

Compare has no page heading. The header's round tier shows the round id and component, navigation, status and answered count. The full question sits at the top of the floating answer bar at 16px medium, wrapping without truncation, with a small muted uppercase "Question" label (round-019 d). The frame fills the width. Below the question are the picks (A to D, None, Mix) and a multiline reason that fills the row (`AnswerBar` in `src/components/AnswerPanel.tsx`). The reason grows from about 2 rows to 8, then scrolls. An icon-only Submit button sits inside its bottom-right corner, beside a platform-aware Ctrl↵ or ⌘↵ hint. There are no tags in the UI. Mix needs a reason.

Soft layers (round-012 b) and color (round-013 b) put raised, rounded variant cards on a gradient canvas, with accent metadata pills and a floating answer bar. Spacing is roomy (32px canvas padding, round-015 mix); plain 20px icons at stroke 1.75 follow round-016 b. Token overrides stay scoped to the real variant content.

Keys: `1` to `4` pick and show that variant. `n` picks None. `m` picks Mix and focuses the reason. `r` focuses the reason and `Esc` leaves it. In the reason, Enter and Shift+Enter insert a newline; Ctrl+Enter or Cmd+Enter submits. Pasted line breaks are kept. On the page, Enter submits unless a button, link or toggle has focus. In full width, `←` and `→` flip variants.

## History page

`#/history` is one table of the log, newest first (round-007 c). It does not render the winning variant. It uses 32px page padding and taller rows (round-015 mix), same-size accent/chart pills (round-013 b), and plain 20px icons at stroke 1.75 (round-016 b). Each row has:

- the date, and the round as a link to `#/round/<id>`
- a pick pill, `<id> · <variant label>`, with the label from that round's `round.json`
- tag pills, all one size, at most 2 plus `+n`. Old answers keep their tags. New answers have none, so the cell is empty.
- the reason, then the theme and view as icons with tooltips

A missing round shows the pick id only, with no link and no label. A broken round has a link but no label.

## Library

The library holds components, examples, and provenance. It is the source of truth for each component. The lab shows it on the Library page. Later steps copy entries into apps.

Library as a shared database: any session can add a draft entry and validate it with `check`. The agent changes a draft to `agreed` after the operator agrees. The app never writes library source. An implementation session lists agreed entries with `taste-lab library --dir <repo>/.taste-lab --status agreed --json` and copies them into the app.

```
<dataDir>/library/<name>/        name: kebab-case, e.g. task-card
  <Name>.tsx                     named export <Name> (PascalCase of name), plus `<name>Variants` (cva) when it has variants
  examples.tsx                   named exports, each a React component with no required props, showing one example or state
  meta.json
```

`meta.json`:

```json
{
  "name": "task-card",
  "title": "Task card",
  "description": "One task in a list: status, priority, up to 2 quiet tags, title, description, owner footer.",
  "status": "agreed",
  "examples": [
    { "export": "Default", "title": "Typical tasks", "width": "column" },
    {
      "export": "ManyTags",
      "title": "More than 2 tags shows +n",
      "width": "column",
      "args": { "tags": "api, docs, perf, ux" }
    }
  ],
  "provenance": [
    {
      "round": "round-001",
      "pick": "c",
      "note": "liked proportions; tags too much"
    }
  ],
  "rules": ["Quiet over loud: tags as muted #text"],
  "controls": [
    {
      "prop": "status",
      "kind": "select",
      "options": ["todo", "done"],
      "label": "Status on every card"
    },
    { "prop": "tags", "kind": "text", "label": "Tags, comma-separated" },
    { "prop": "count", "kind": "number", "default": 3 }
  ]
}
```

- `name` equals the folder name. `title`, `description` are non-empty strings.
- `status` is `draft` or `agreed`.
- `examples` has at least one entry. `export` is a named export of `examples.tsx`, unique in the list. `width` is `column` (about 420px) or `full`.
- `provenance` and `rules` are arrays and may be empty. Each provenance `round` must exist in `rounds/`.
- Files follow the variant rules: 100% shadcn, no raw colors, no `style` prop. Allowed imports are the variant allowlist plus sibling files by relative path without extension (`./TaskCard`). A sibling must be a regular `.ts` or `.tsx` file in the same folder. `check` rejects one that is missing, a folder (including a folder named `Helper.ts`), or that also exists as `.js`, `.jsx`, `.mjs`, `.mts` or `.json`, because the scanner reads only `.ts` and `.tsx`. A round variant may import `@/library/<name>/<Name>` only, where `<name>` is a kebab-case folder and `<Name>` its PascalCase.
- Components take data through props. Only `examples.tsx` may import values from `@/fixtures`. `import type { Task } from "@/fixtures"` is fine anywhere.

### Controls and args

Optional and additive. An entry without `controls` has no Controls panel and renders as before.

- `controls` is an array of `{ "prop", "kind", "options"?, "default"?, "label"? }`. `prop` is an identifier, unique in the list, and not `key`, `ref` or `__proto__`. `kind` is `boolean`, `select`, `text` or `number`.
- `options` is for `select` only, and `select` needs it: a non-empty list of distinct non-empty strings.
- `default` must match the kind: `true` or `false`, one of the `options`, a string, or a finite number.
- Each `examples[]` entry may have `args`: a JSON object of starting values for that example. Each key must be a declared `prop`. Each value must match that control's kind, like `default`.
- An example starts from its `args`, then each control's `default`. A control with neither starts unset. The canvas renders `<Example {...values} />` with the set values only. Clearing a text or number field, or the pressed option of a select, unsets it. Reset goes back to the start values.
- An example takes these as optional props and merges them over its own fixture data, so an unset prop keeps the fixture value. An example that ignores props still works. Name the props after what they change, such as `status` for every card's status.
- Values are plain JSON. A control cannot pass a function, an element or a fixture object. Pass a key (`"round": "broken"`) and let the example look it up.

```tsx
export type TaskCardArgs = { status?: Task["status"]; count?: number };

export function Default(args: TaskCardArgs) {
  const shown = args.count === undefined ? tasks : tasks.slice(0, args.count);
  return shown.map((t) => (
    <TaskCard key={t.id} task={{ ...t, status: args.status ?? t.status }} />
  ));
}
```

### Library page

`#/library` opens the first entry. `#/library/<name>` opens an entry on its first example, and `#/library/<name>/<example>` on that example. It works like Storybook (round-008 c):

- The page is full-bleed under the app header, like Compare: the full width and the full height below the header, with no outer card or border.
- Left: the stock shadcn `sidebar` with the entries, each with its status and its examples with their width. The chevron folds an entry. The trigger left of the tabs (or Ctrl/Cmd+B) collapses the sidebar. Under 768px it is the primitive's off-canvas sheet, which closes on a pick.
- Canvas tab: the live example under a toolbar. Width is Column 420 or Full width; it starts at the example's `width`. Theme is light or dark for the canvas only. Background is plain (`bg-background`) or muted (`bg-muted`). Theme and background stay set across entries and reloads. Until you pick a canvas theme it follows the lab.
- The canvas has an explicit light or dark prototype scope. It resets every token to shadcn stock plus the data dir theme for that mode. A dark canvas also has `.dark`. A light canvas keeps the light values inline. Both canvas modes work in either lab theme. The toolbar and panels stay outside this scope and keep the chrome theme.
- Controls panel under the tabs, when the entry has `controls`: one row per prop, with a checkbox, toggles (a menu for more than 4 options), a text field or a number field, and the current value or "unset". It is the bottom of a vertical `resizable` split. Its header bar has Reset, collapse or expand, and expand to full or restore. Drag the handle, or focus it and use the arrow keys, to resize. Dragged below its minimum it collapses to the header bar. Full hides the canvas until you restore. It opens at a height that fits every control; it scrolls only when dragged smaller. An entry without controls has no panel.
- The sidebar state, the panel state (open, collapsed or full) and the dragged height stay set across entries and reloads, with the canvas theme and background (`localStorage` key `taste-lab-canvas`).
- Docs tab: title, status, description, examples (each opens its canvas), the controls table, rules, and provenance with links to `#/round/<id>`. A round that no longer exists is marked "round not found".
- A broken entry (bad `meta.json`, missing file, missing export) shows its errors in place and does not break the page. An example that throws shows its error in the canvas. The next control change tries again.

The header's Library icon opens Library, next to Compare, Theme and History.

`taste-lab check` validates `library/*`: folder name, `<Name>.tsx` and `examples.tsx` present, `meta.json` schema (`controls` and `args` included), `<Name>` exported by `<Name>.tsx` (a regular, readable file), every example `export` found in `examples.tsx` (a file with `export *` or a destructured export is a problem, since its names cannot be read: export each name directly), provenance rounds that exist, and the scanner with the library rules on every `.ts` and `.tsx`. `library/` missing or holding only `.gitkeep` is fine.

### Promoting a winner

When the operator settles a direction, promote it. Do this yourself, then run `check`.

1. Create `library/<name>/`. Copy the winning variant to `<Name>.tsx`. Rename the default export to a named `<Name>`.
2. Turn the fixture use into props: one item (or a list) plus an optional `className` merged with `cn()`. Remove the `@/fixtures` value import. A type import is fine.
3. The axes that differed between rounds become `cva` variants (`<name>Variants`), only where they are natural. Do not invent axes.
4. Write `examples.tsx` with named exports for the default case and for each state that matters. They import `@/fixtures` and the component.
   Declare `controls` for the props worth trying live, give each example the `args` that make it that state, and let the examples take those props. See "Controls and args".
5. Write `meta.json`. Put the winning round and pick in `provenance` with the operator's words as the note. Put settled rules in `rules`. Set `status` to `agreed` once the operator agrees.
6. The winning `tokens` of a component round stay per variant and go in `DESIGN.md`. A winning token round goes into `theme.css`. See "Promoting a token round winner".

### Iterating on a library component

Write a round whose variants import the component with changed props or a wrapper:

```tsx
import { TaskCard } from "@/library/task-card/TaskCard";
import { tasks } from "@/fixtures";

export default function Dense() {
  return (
    <div className="grid gap-2">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} className="p-2" />
      ))}
    </div>
  );
}
```

Or copy the component into the round and change one thing. A copy can import `class-variance-authority` but not sibling files, so inline anything it takes from a sibling. Say in `question` and `changes` that the round iterates a library component. `basedOn` stays a round. When the operator picks a variant, update `library/<name>/` and add the round to `provenance`.

## LAN mode

`serve --lan [--host <ip>]` lets the operator open the lab from another device on the home LAN. Without `--lan`, nothing here applies: loopback only, no token.

- It binds one private IPv4 address, never 0.0.0.0. Auto-pick: the interface with the default route (Linux `/proc/net/route`), else the first private IPv4 not on a `docker*`, `br-*`, `veth*`, `virbr*`, `tailscale*` or similar interface. It prints the choice and other candidates. `--host <ip>` must be a private or loopback IPv4 (10/8, 172.16/12, 192.168/16, 127/8).
- It also listens on 127.0.0.1 on the same port with the loopback rules (no token, loopback `Host`). A request is classed by the listener it arrived on, never by its headers.
- It prints `http://<ip>:<port>/?k=<token>`. The token is `crypto.randomBytes(16)` base64url, new each run, in server memory only. It appears in that URL line (or, with `--events`, in `ready.lan` only) and in the browser cookie, nowhere else: not in logs (`DEBUG=vite:*` included), files or the data dir. Do not copy it into notes, commits or chat.
- A gate in front of all of Vite's request handling covers every HTTP request and the HMR WebSocket upgrade (`server/lan-gate.ts`). It wraps the HTTP server's `request` and `upgrade` listeners, so Vite's own middleware, including its debug request log, only sees requests that passed. The gate covers listeners attached before it, which today is all of Vite's HTTP and HMR handlers. Listeners attached later, such as a configured `server.proxy` upgrade handler, are not covered. This repo configures no proxy.
  1. Remote address not private (10/8, 172.16/12, 192.168/16, 127/8, `::1`, `fc00::/7`, IPv4-mapped forms), `Host` not `<ip>:<port>`, or `Origin` (if sent) not `http://<ip>:<port>`: 403.
  2. `?k=<valid token>`: sets the cookie `taste_lab_<port>=<token>; HttpOnly; SameSite=Strict; Path=/` and redirects (302) to the same URL without `k`, as a same-origin path only (a backslash, a control character or anything but a single leading `/` falls back to `/`). Vite never sees the token. A wrong `k` is 401.
  3. Otherwise the cookie must match in constant time, else 401 with a page that says "Open the link printed by `taste-lab serve --lan`" (JSON under `/api/`).
- `/api/taste` checks the same cookie again (`server/taste-log.ts`). Content type, size limit and validation rules are unchanged. The app sends no token itself. On 401 it shows the same message (`src/lib/api.ts`).
- Settings are per server and frozen. `serve` adds the `taste-lab:lan` plugin inline for that one server. The taste API reads its settings from that server's plugin list. A loopback server in the same process stays tokenless.
- `server.fs.deny` lists `taste.jsonl` in every mode, so `/@fs/.../taste.jsonl` and `?raw` imports get 403 even with the cookie.
- Vite public serving is off (`publicDir: false` in `vite.config.ts` and in the inline config of `serve`), so no file is served from a `public/` folder. Vite would serve it without its `fs.deny` check, and a data dir there or behind a symlink would expose `taste.jsonl`. `serve`, `init` and `check` also reject a data dir inside the lab's own `public/` folder (symlinks followed) as defense in depth.
- Anyone on the LAN with the link reads everything the lab serves, including round and library source. No HTTPS.

## Event protocol

`serve --events` is for a parent process, such as the pi extension in `pi/extensions/taste.ts`. stdout then carries only JSON lines. Human text goes to stderr. Without `--events`, output is unchanged.

```json
{"event":"ready","port":5301,"dataDir":"/abs/.taste-lab","local":"http://127.0.0.1:5301/","lan":"http://192.168.1.50:5301/?k=<token>"}
{"event":"answer","entry":{ "...": "the exact taste.jsonl entry as appended" }}
{"event":"error","message":"..."}
```

- `ready` comes once, when every listener is up. `lan` is `null` without `--lan`.
- `answer` comes once per successful append to `taste.jsonl`, from either listener.
- `error` is a fatal startup problem. The process then exits non-zero.
- The token appears only in `ready.lan`. A reader shows that link to the operator and never puts it in a log, a file or text a model reads.

## Pi package

The repo root is a pi package (`pi` key in `package.json`): the `/taste` extension in `pi/extensions/taste.ts` and the `taste` skill in `pi/skills/taste/SKILL.md`. Helpers live in `pi/lib/`, outside the extensions folder, because pi loads every `.ts` file directly in `pi/extensions/` as an extension.

- `/taste [local] [--dir <path>]` spawns `node bin/taste-lab.mjs serve --dir <d> --events`, plus `--lan` unless `local`. The data dir defaults to `<cwd>/.taste-lab`. A missing one is created with `init` after a confirm.
- On `ready`, the links go to pi's UI only: a notification, a widget below the editor and a status item. The agent gets a custom message with the data dir and port, never a link.
- Each `answer` becomes `pi.sendMessage(..., { triggerTurn: true, deliverAs: "followUp" })`: one line with round, pick, tags, reason, theme and view. A busy agent gets it after its current run.
- Child stderr goes to `<os tmpdir>/taste-lab-pi-XXXXXX/serve-<pid>-<time>.log`, with any `k=` value scrubbed. The dir is private (mode 0700) and the file is mode 0600. The child runs in its own process group. The group gets SIGTERM, then SIGKILL after 3 s, on `/taste stop` and on `session_shutdown`.
- Model text is built in `pi/lib/messages.ts` from named fields only. Keep `ready.lan` out of it. Any `k=` link in model text becomes `[link redacted]`. `tests/pi-*.test.ts` assert no message holds the token or `k=`.

## Known limits

- Overlay content such as dropdown menus and tooltips portals to `<body>`, outside prototype scopes. It uses lab chrome tokens, not shadcn stock, the data dir theme or round overrides. This applies to the Library canvas too. Generated `ui/*` is not hand-edited, so this stays. In token rounds, judge in-frame content, not overlays.
- The Library canvas mode switches tokens. Tailwind `dark:` classes in generated `ui/*` still match `.dark` on `<html>`. A light canvas in a dark lab still gets those classes, such as an outline button's dark fill. Judge these classes on a canvas that matches the lab mode.
- `taste-lab check` and `pnpm test` parse each variant with the Vite parser. A file that does not parse is a violation. The scan is static: it cannot see colors built at runtime from strings.
- Variant files in a data dir outside this repo get no type check. `check` validates rounds and scans files, and the browser shows import or render errors. Only `react`, `react-dom`, `lucide-react` and `class-variance-authority` resolve as bare imports, from the lab.
- The taste log API accepts `POST` only with `Content-Type: application/json` and an `Origin` (if sent) equal to the serving origin. `ts` is set by the server. Tags outside the list are rejected with 400.

## Commands

- `pnpm dev` serves the demo: `taste-lab serve --dir examples/demo/.taste-lab`.
- `node bin/taste-lab.mjs init|check|serve --dir <path>`, see "Commands for a data dir".
- `pnpm check` runs `tsc --noEmit` for the demo (`tsconfig.json`) and for the root lab (`tsconfig.lab.json`), then Biome.
- `node bin/taste-lab.mjs serve --dir .taste-lab` serves the lab for taste-lab's own interface. Its rounds compare designs for `src/` chrome; a pick changes `src/` afterwards.
- `pnpm test` runs Vitest.
- `pnpm build` runs the type check and a Vite build of the demo. `TASTE_LAB_DIR=<path>` builds or previews another data dir.
- `pnpm format` runs `biome check --write .`.
