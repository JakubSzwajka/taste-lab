# taste-lab

A local shadcn app for tuning UI taste. You compare 2 to 4 component variants side by side, pick one, tag it and say why. An agent reads that log and writes the next round. The app never calls an LLM.

## Run

```sh
pnpm install
pnpm dev     # prints a 127.0.0.1 URL
```

Node version is pinned in `.node-version`. pnpm version is in `package.json`.

## Use

1. Open the URL. The current round is the first one with no answer.
2. Toggle light or dark. All variants switch.
3. Pick with keys `1` to `4`, `n` for none, `m` for mix. Add tags and a reason. Press Enter to submit.
4. Each submit appends one line to `taste/taste.jsonl` and moves to the next round.
5. Open History to see past answers, newest first.

With no rounds in `variants/`, the app shows a "no rounds yet" screen.

## Scripts

| Script         | Does                                                      |
| -------------- | --------------------------------------------------------- |
| `pnpm dev`     | Vite dev server on 127.0.0.1                              |
| `pnpm check`   | `tsc --noEmit` and Biome                                  |
| `pnpm test`    | Vitest                                                    |
| `pnpm build`   | type check and Vite build                                 |
| `pnpm preview` | serve the build on 127.0.0.1 (the log API works here too) |

## Layout

```
variants/round-NNN/   rounds written by the agent (round.json + a.tsx, b.tsx, ...)
taste/taste.jsonl     append-only answer log
taste/DESIGN.md       distilled rules
src/components/ui/    stock shadcn primitives, generated, not hand-edited
src/fixtures/         sample data shared by all variants
server/               /api/taste middleware
tests/                loader, log writer and variant rule tests
```

Rules for variants, the round and log contracts, and the agent loop are in [AGENTS.md](AGENTS.md).
