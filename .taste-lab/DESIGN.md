# Design rules: taste-lab

This lab tunes taste-lab's own interface with taste-lab. Rounds compare designs for the app chrome (header, compare screen, history, library, theme pages). The fixture `lab` is a sample state of a lab mid-way: rounds with mixed statuses, the 4 pages and the active one, taste log answers (`history`), library entries with one broken (`library`) and the current round's variants and rows for a mock variant frame (`sample`).

Serve it from the repo root with `node bin/taste-lab.mjs serve --dir .taste-lab`. A pick here becomes a change in `src/`, made after the round is answered.

Distilled from `taste.jsonl`. The agent rewrites this file every ~5 rounds. Each rule cites the rounds that support it and quotes the operator where it helps. Distilled through round-009 (9 answers: 7 picks, 1 mix, 1 none. One pick, round-009 a, came with no reason).

## Settled pages

| Page    | Settled as                                                    | Rounds               |
| ------- | ------------------------------------------------------------- | -------------------- |
| Header  | Two tiers, round menu, icon-only page nav                     | round-001, round-002 |
| Compare | No heading, full-width frame, one-row answer bar, no tags     | round-003, round-009 |
| History | One dense table, richer row, tags as same-size pills          | round-004, round-007 |
| Library | Two panes: tree, canvas with toolbar, Docs, Controls          | round-005, round-008 |
| Theme   | Open: round-010 asks table, swatch grid, preview or workbench | round-010 (open)     |

The Compare, History and Library pages are built in `src/` from these picks. `app-header` is promoted to `library/app-header/`.

## Library

- `app-header` (agreed): `library/app-header/AppHeader.tsx`, from round-002 b with the arrow fix (20px icons in 36px buttons). Props: lab name, rounds, current round, active page, `showRoundTier` (defaults to Compare only). It mirrors `src/components/AppHeader.tsx`. Every layout round imports it from `@/library/app-header/AppHeader`, so only the page under it differs. Provenance round-001 mix and round-002 b.

## Starting point

The operator's taste from `examples/demo` (its DESIGN.md) is the prior, not a rule here: quiet over loud, clean, compact, no tag noise, pills of one size. This lab confirmed it. Every layout pick chose the denser, quieter option, and the operator then asked whether tags were needed at all (round-006).

## Do

### Header

- Two tiers. Top bar: breadcrumb `taste-lab / <name> / <round ▾>`, where the round segment opens a menu of every round with its status. Second tier, on Compare only: prev and next round, the question, the pick or error badge, "n of N answered" with a bar. round-001 mix ("D is clean but also C has some nice two tiers approach and bar with x of y answered"), round-002 b.
- Page nav as icon-only outline toggles with names in tooltips, in the top bar, at 40px tall with 20px icons. round-002 b ("perfect"), after round-001 d's icons were "tooo small".
- Round arrows at 20px icons in 36px buttons. round-002 b ("< and > icons should be slightly bigger").
- Off the Compare page, the breadcrumb names the page and the round tier is hidden. Follows from round-002 b, where the tier belongs to a round.

### Compare

- No page heading. The round tier already shows the question. round-003 c, round-009.
- The frame at full width, filling the viewport. round-003 c ("i want to see it full width. C is the closest one yet").
- One answer bar pinned at the bottom: pick buttons (A, B, C, None, Mix), a single-line reason that fills the row, Submit. Enter submits. Mix needs a reason. round-003 c, round-009 a (picked from three bars, no reason given, tag "clean").
- Keep answering to the keyboard. The bar is the smallest of the three tried in round-009, and the other two (a roomy 2-line reason, pick first then reason) lost to it.

### History

- One dense table, one row per answer: date, round, pick, tags, reason, theme and view. round-004 b ("B is best in general but we can work on details"), round-007 c.
- A richer row beats a quieter one or an expandable one: the pick pill names the winning variant (`c · Richer row`), the round links to its compare screen, theme and view are small icons with tooltips. round-007 c ("all are quite equal yet C the best i think"). The winning variant is no longer rendered in the page, a label is enough. round-004.
- Tags, where an old answer has them, as pills of one size. round-007 c ("tags can be pills ?"). Pick pills are one fixed width too, as in round-004 b.
- The winning label comes from the round's `round.json`. A missing or broken round shows the pick id alone.

### Library

- Two panes: a tree of entries, each with its examples, and a canvas for one example. round-005 c ("it gives me potentially preview functionality like a story book!"), round-008 c ("almost like storybook").
- The canvas has a toolbar: Column 420 or Full width, canvas light or dark (canvas only), plain or muted background. A Docs tab holds the description, rules and provenance. A Controls panel under the canvas edits props live. round-008 c.

### Everywhere

- Quiet over loud, dense over roomy, pills of one size. round-004 b, round-007 c, `examples/demo`.

## Don't

- Don't list every round as a button in the header. It wrapped to 3 rows at 14 rounds. The round menu replaces it. round-001 a, round-001, round-002.
- Don't shrink page icons to fit. Small icons in the header read as misplaced. round-001 d.
- Don't repeat the question as a page heading on Compare. round-003.
- Don't add tags to the answer bar, in any form: always shown, on demand or inline. "tag select is not easy one" (round-003), "do we even need those tags?" (round-006, pick none, all three tag pickers missed). Tags stay optional in the log and old answers keep theirs. round-006, round-009.
- Don't render the winning variant inside History rows. It was today's card layout and lost to the table. round-004.
- Don't split the Library into a card grid plus a separate detail page. List and detail on one page won. round-005 c.

## Tokens

### Settled in theme.css

Copied from `examples/demo` round-007 a (one taste across repos). Judged in dark and light there. No lab round has been a token round, so nothing here was decided by the operator in this lab.

| Token                  | Light                  | Dark                   | Evidence                    |
| ---------------------- | ---------------------- | ---------------------- | --------------------------- |
| `--primary`            | `oklch(0.5 0.19 262)`  | `oklch(0.72 0.14 262)` | `examples/demo round-007 a` |
| `--primary-foreground` | `oklch(0.985 0 0)`     | `oklch(0.2 0.04 262)`  | `examples/demo round-007 a` |
| `--ring`               | `oklch(0.55 0.17 262)` | `oklch(0.65 0.14 262)` | `examples/demo round-007 a` |

### Sizes settled in layout rounds

These are not tokens. They are fixed sizes the picks carry.

| Part                 | Size                                    | Evidence                 |
| -------------------- | --------------------------------------- | ------------------------ |
| Header page icons    | 20px in a 40px bar                      | round-002 b              |
| Header round arrows  | 20px icons in 36px buttons              | round-002 b              |
| Library column width | about 420px (`column`), or `full`       | round-008 c              |
| History pick pill    | one fixed width (192px), tag pills 80px | round-004 b, round-007 c |

## Open questions

- Closed: does listing every round in the header scale? No. round-001 and round-002 settled on the round menu plus the round tier.
- Closed: does Compare need its own question heading? No. round-003 c, round-009 a.
- Closed: how much should one History answer show? One dense row with the variant label, round link, and theme and view icons. round-004 b, round-007 c.
- Closed: list or detail for the Library? Two panes with a canvas, Docs and Controls. round-005 c, round-008 c.
- Closed: do we need tags? Not in the answer bar. round-006 (none), round-009 a.
- Open: the Theme page is the only page still on its first design. round-010 asks how it should show tokens: a dense table, a swatch grid by role, a preview first, or a workbench like the Library. A variant can paint dark tokens inside a light page (a `.dark` wrapper) but not light ones inside a dark page, so judge it with the lab in light. The built page sets values inline, as the Library canvas does.
- Open: the `lab` fixture has a `theme` part (32 tokens, 3 from theme.css, 3 sample ignored parts) for Theme rounds. Its values copy src/index.css and theme.css; update them when theme.css changes.
- Open: round-009 a was picked with no reason and the tag "clean". Does the one-line reason get used when it is the only free-text field? Check the next answers for empty reasons.
- Open: History has no filter or search. At about 30 answers the table may need one. Raise it when the log grows.
- Open: the History tags column holds two pills and a `+n`. The log no longer gets new tags, so the column will empty out. Decide whether to drop it once most rows are blank.
- Open: round-008 left Controls and the canvas theme toggle as mock behaviour. Judge them again on the real page.
