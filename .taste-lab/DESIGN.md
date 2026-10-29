# Design rules: taste-lab

This lab tunes taste-lab's own interface with taste-lab. Rounds compare designs for the app chrome (header, compare screen, history, library, theme pages). The fixture `lab` is a sample state of a lab mid-way: 14 rounds with mixed statuses, the 4 pages and the active one, 12 taste log answers (`history`), 4 library entries with one broken (`library`) and the current round's variants and rows for a mock variant frame (`sample`).

Serve it from the repo root with `node bin/taste-lab.mjs serve --dir .taste-lab`. A pick here becomes a change in `src/`, made after the round is answered.

Distilled from `taste.jsonl`. The agent rewrites this file every ~5 rounds. Each rule cites the rounds that support it. Distilled through round-002. The header rules are built in `src/components/AppHeader.tsx` and promoted to `library/app-header/` (status agreed).

## Library

- `app-header` (agreed): `library/app-header/AppHeader.tsx`, from round-002 b with the arrow fix (20px icons in 36px buttons). Props: lab name, rounds, current round, active page, `showRoundTier` (defaults to Compare only). It mirrors `src/components/AppHeader.tsx`. Every layout round imports it from `@/library/app-header/AppHeader`, so only the page under it differs. Provenance round-001 mix and round-002 b.

## Starting point

The operator's taste from `examples/demo` (its DESIGN.md) is the prior, not a rule here: quiet over loud, clean, compact, no tag noise, pills of one size.

## Do

- Header in two tiers. Top bar: breadcrumb `taste-lab / <name> / <round ▾>`, where the round segment opens a menu of every round with its status. Second tier, on Compare pages only: prev and next round, the question, the pick or error badge, "n of N answered" with a bar. round-001 mix (d + c: "D is clean but also C has some nice two tiers approach and bar with x of y answered"), round-002 b.
- Page nav as icon-only outline toggles with names in tooltips, in the top bar, at 40px tall with 20px icons. round-002 b ("perfect"), after round-001 d's icons were "tooo small".
- Round arrows at 20px icons in 36px buttons. round-002 b ("< and > icons should be slightly bigger").
- Off the Compare page, the breadcrumb names the page and the round tier is hidden. Follows from round-002 b, where the tier belongs to a round.

## Don't

- Don't list every round as a button in the header. It wrapped to 3 rows at 14 rounds (round-001 a). The round menu replaces it. round-001, round-002.
- Don't shrink page icons to fit. Small icons in the header read as misplaced. round-001 d.

## Tokens

### Settled in theme.css

Copied from `examples/demo` round-007 a (one taste across repos). Judged in dark and light there.

| Token                  | Light                  | Dark                   | Evidence                    |
| ---------------------- | ---------------------- | ---------------------- | --------------------------- |
| `--primary`            | `oklch(0.5 0.19 262)`  | `oklch(0.72 0.14 262)` | `examples/demo round-007 a` |
| `--primary-foreground` | `oklch(0.985 0 0)`     | `oklch(0.2 0.04 262)`  | `examples/demo round-007 a` |
| `--ring`               | `oklch(0.55 0.17 262)` | `oklch(0.65 0.14 262)` | `examples/demo round-007 a` |

## Open questions

- Closed: does listing every round in the header scale? No. round-001 and round-002 settled on the round menu plus the round tier.
- Does the compare page still need its own question heading now that the round tier shows the question? Queued as round-003: a today (heading, answer panel below), b no heading with the answer panel in a sticky right sidebar, c no heading with a one-row answer bar pinned under a tall frame.
- How much should one History answer show? Queued as round-004: a today (a card per answer with the winning variant rendered), b one dense table, c a timeline by day with the reason as a quote.
- Library list: today's cards, a denser grid, or list and detail on one page? Queued as round-005: a today, b a dense card grid with status and example count pills and source rounds, c two panes (entry list, selected entry's examples, provenance and rules).
- Rounds 003 to 005 are `layout` rounds on the `lab` fixture (its `history`, `library` and `sample` fields). Each shows the page in an 85svh screen box, so sticky parts can be judged. Variant a of each is the control, a copy of today's page in `src/components/`. The Theme page round comes later.
