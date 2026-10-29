# Design rules

Distilled from `taste.jsonl`, rounds 1 to 6. The agent rewrites this file every ~5 rounds.
Each rule cites the rounds that support it. "note" means the operator's reason on that round.
All six answers were given in dark mode.

Agreed components live in `library/`: `task-card` and `project-table`.

## Do

- Tags are quiet muted `#text`, never badges. (round-001 note, round-005 b beat outline and filled badges)
- Card status row: id, status pill, priority pill, then at most 2 tags and "+n" for the rest. (round-003 note, round-005 b)
- All pills in a row share one height and one padding. (round-005 note)
- Status is a pill with a dot inside. (round-005 b, round-006 note)
- Keep the round-001 C card proportions: title, 2-line description, owner footer. (round-001 note, round-003 c "exactly what i needed")
- Tables use the full width, one column per field and one line per cell. (round-002 note "should be much wider", round-004 a)
- Compact table rows: 10px top and bottom. (round-006 c)
- Table headers are small, normal weight and muted. (round-004 a, round-006 c; never tested on its own)

## Don't

- A row of tag badges on a card. (round-001 "tags are too much", round-005 a and c lost)
- Narrow tables with stacked two-line cells. (round-002 tags "cramped", round-004 b and c lost to a)
- A bare status dot with no pill in tables. (round-006 a lost; the note asks for the dot inside the pill)

## Tokens

Baseline = stock shadcn neutral + AA fixes: light --muted-foreground oklch(0.52 0 0), light --destructive oklch(0.5 0.2 27.325). Reason: stock values measured 4.35:1 and 3.97:1. Dark values stay stock.

### Settled in theme.css

| Token                  | Light                  | Dark                   | Evidence      |
| ---------------------- | ---------------------- | ---------------------- | ------------- |
| `--primary`            | `oklch(0.5 0.19 262)`  | `oklch(0.72 0.14 262)` | `round-007 a` |
| `--primary-foreground` | `oklch(0.985 0 0)`     | `oklch(0.2 0.04 262)`  | `round-007 a` |
| `--ring`               | `oklch(0.55 0.17 262)` | `oklch(0.65 0.14 262)` | `round-007 a` |

### Not settled

The winning variants carried these overrides in `round.json`. No round tested them on their own, so they are not settled. The library inherits the round-007 a blue `--primary` from theme.css, and uses the neutral theme for the rest.

| Token                           | Value                                                    | Evidence                                                                         |
| ------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `--chart-1` (card: in progress) | `light-dark(oklch(0.58 0.19 255), oklch(0.72 0.15 255))` | round-001 c, round-003 c, round-005 b                                            |
| `--chart-2` (card: in review)   | `light-dark(oklch(0.58 0.2 300), oklch(0.74 0.15 300))`  | round-001 c, round-003 c, round-005 b                                            |
| `--chart-3` (card: done)        | `light-dark(oklch(0.62 0.16 152), oklch(0.74 0.16 152))` | round-001 c, round-003 c, round-005 b                                            |
| `--primary` (tables)            | `light-dark(oklch(0.48 0.09 265), oklch(0.76 0.07 265))` | round-002 b, round-004 a, round-006 c. Not picked: lost to blue in round-007 (b) |

## Open questions

- Status hues. The dots got their color from the `--chart-*` overrides above. Stock neutral charts are gray, and `--chart-1` is near white, so the library dots use `--primary`, `--destructive`, `--muted-foreground` and hollow rings instead. Adopt status hue tokens per app, or keep neutral? (round-005 b, round-006 a)
- One accent or two. Resolved by round-007 a: blue beat muted indigo (b) and neutral (c). (round-001 c, round-002 b, round-007 a)
- "Same size" pills. In round-005 b both pills already measured 20px high; only the side padding (6px vs 8px) and the leading mark (12px icon vs 6px dot) differed. The library now matches those. The note may also mean equal width. Test fixed-width pills in a round. (round-005 note)
- Avatars in tables. round-004 b dropped avatars but also stacked the owner under the project, so its loss does not isolate avatars. round-004 a and round-006 c keep them. Keep or drop?
- Header weight in tables. Not tested yet.
- Light mode. Resolved for the round-007 accent: the operator checked light mode on 2026-10-29 and said it "looks right in light too". Rounds 1 to 7 were still answered in dark mode. (round-007 a)
