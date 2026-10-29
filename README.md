# taste-lab

A local shadcn app for tuning UI taste. You compare 2 to 4 component variants side by side, pick one, tag it and say why. An agent reads that log and writes the next round. The app never calls an LLM.

The taste data for an app lives in a `.taste-lab` folder in that app's repo. This lab serves any such folder.

## Run

```sh
pnpm install
pnpm dev     # serves the demo in examples/demo/.taste-lab, prints a 127.0.0.1 URL
```

For another repo, from any folder:

```sh
node <taste-lab>/bin/taste-lab.mjs init  --dir ../my-app/.taste-lab
node <taste-lab>/bin/taste-lab.mjs check --dir ../my-app/.taste-lab
node <taste-lab>/bin/taste-lab.mjs serve --dir ../my-app/.taste-lab [--port N]
```

`init` creates the folder with a sample fixture and refuses to overwrite one that exists. `check` validates rounds and scans variant files; it exits 1 and lists the problems when something is wrong. `serve` starts the lab on 127.0.0.1. Without `--port` it takes the first free port from 5300, skipping 3000, 3326, 5173 and 5310.

Node version is pinned in `.node-version`. pnpm version is in `package.json`.

## Use

1. Open the URL. The current round is the first one with no answer.
2. Toggle light or dark. All variants switch.
3. Pick with keys `1` to `4`, `n` for none, `m` for mix. Add tags and a reason. Press Enter to submit. In the reason box, use Ctrl/Cmd+Enter. Enter on a focused button or link keeps its normal action (toggle, follow) and does not submit.
   A view switch ("Side by side" or "Full width") sits above the variants. Full width shows one variant at full page width with A/B/C tabs. `←` and `→` flip between variants and wrap around. Number keys pick and also show that variant. Arrow keys do nothing while the reason box or a toggle, tab or menu has focus. Use full width for tables and layouts that need room.
4. Each submit appends one line to `.taste-lab/taste.jsonl` in the served folder and moves to the next round.
5. Open History to see past answers, newest first.

With no rounds in `.taste-lab/rounds/`, the app shows a "no rounds yet" screen.

## Scripts

| Script         | Does                                                      |
| -------------- | --------------------------------------------------------- |
| `pnpm dev`     | `taste-lab serve` for the demo, on 127.0.0.1              |
| `pnpm check`   | `tsc --noEmit` and Biome                                  |
| `pnpm test`    | Vitest                                                    |
| `pnpm build`   | type check and Vite build                                 |
| `pnpm preview` | serve the build on 127.0.0.1 (the log API works here too) |

## Layout

A data dir, committed in each app repo:

```
<repo>/.taste-lab/
  config.json         { "version": 1, "name": "<app name>" }, name defaults to <repo>
  fixtures/index.ts   sample data for variants, imported as @/fixtures
  rounds/round-NNN/   rounds written by the agent (round.json + a.tsx, b.tsx, ...)
  taste.jsonl         append-only answer log
  DESIGN.md           distilled rules for this app
```

This repo:

```
bin/taste-lab.mjs        CLI entry (Node runs the TypeScript in cli/ directly)
cli/                     serve, init, check, port picking, variant scanner
examples/demo/.taste-lab the demo data dir (rounds 1 to 6)
server/                  Vite plugin and /api/taste middleware
src/                     lab UI
src/components/ui/       stock shadcn primitives, generated, not hand-edited
tests/                   loader, log writer, CLI and variant rule tests
```

Rules for variants, the round and log contracts, and the agent loop are in [AGENTS.md](AGENTS.md).
