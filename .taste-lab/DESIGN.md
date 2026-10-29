# Design rules: taste-lab

This lab tunes taste-lab's own interface with taste-lab. Rounds compare designs for the app chrome (header, compare screen, history, library, theme pages). The fixture `lab` is a sample state of a lab mid-way: 14 rounds with mixed statuses, the 4 pages and the active one.

Serve it from the repo root with `node bin/taste-lab.mjs serve --dir .taste-lab`. A pick here becomes a change in `src/`, made after the round is answered.

Distilled from `taste.jsonl`. The agent rewrites this file every ~5 rounds. Each rule cites the rounds that support it. Nothing is distilled yet.

## Starting point

The operator's taste from `examples/demo` (its DESIGN.md) is the prior, not a rule here: quiet over loud, clean, compact, no tag noise, pills of one size.

## Do

- (none yet)

## Don't

- (none yet)

## Tokens

### Settled in theme.css

Copied from `examples/demo` round-007 a (one taste across repos). Judged in dark and light there.

| Token                  | Light                  | Dark                   | Evidence                    |
| ---------------------- | ---------------------- | ---------------------- | --------------------------- |
| `--primary`            | `oklch(0.5 0.19 262)`  | `oklch(0.72 0.14 262)` | `examples/demo round-007 a` |
| `--primary-foreground` | `oklch(0.985 0 0)`     | `oklch(0.2 0.04 262)`  | `examples/demo round-007 a` |
| `--ring`               | `oklch(0.55 0.17 262)` | `oklch(0.65 0.14 262)` | `examples/demo round-007 a` |

## Open questions

- Does listing every round in the header scale? Today's header (round-001 a) wraps to 3 rows at 14 rounds on a 1440px screen. round-001 tests three ways out.
