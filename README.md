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

`init` creates the folder with a sample fixture and an empty `library/`, and refuses to overwrite one that exists. `check` validates rounds and `library/` entries and scans variant and library files; it exits 1 and lists the problems when something is wrong. `serve` starts the lab on 127.0.0.1. Without `--port` it takes the first free port from 5300, skipping 3000, 3326, 5173 and 5310.

`check` loads `fixtures/index.ts` and needs both exports: `fixtures` and `fixtureKeys` (the same keys). It reports broken files, dangling or looping symlinks and unreadable paths as problems. Data dir paths may contain spaces, quotes (not both kinds) and `$`. `serve`, `init` and `check` reject paths with a line break or control character, a backslash, `*`, `{` or `}`, or both quote kinds: Tailwind reads its `@source` path raw as a glob and cannot carry them.

Node version is pinned in `.node-version`. pnpm version is in `package.json`.

## Use

1. Open the URL. The current round is the first one with no answer.
2. Toggle light or dark. All variants switch.
3. Pick with keys `1` to `4`, `n` for none, `m` for mix. Add tags and a reason. Press Enter to submit. In the reason box, use Ctrl/Cmd+Enter. Enter on a focused button or link keeps its normal action (toggle, follow) and does not submit.
   A view switch ("Side by side" or "Full width") sits above the variants. Full width shows one variant at full page width with A/B/C tabs. `←` and `→` flip between variants and wrap around. Number keys pick and also show that variant. Arrow keys do nothing while the reason box or a toggle, tab or menu has focus. Use full width for tables and layouts that need room.
4. Each submit appends one line to `.taste-lab/taste.jsonl` in the served folder and moves to the next round.
5. Open History to see past answers, newest first.
6. Open Library to see the agreed components: each entry has examples at their width, the rounds it came from (links to `#/round/<id>`) and its rules.

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
  library/<name>/     agreed components: <Name>.tsx, examples.tsx, meta.json
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
tests/                   loader, library, log writer, CLI and variant rule tests
```

## Library

`library/<name>/` holds a component the operator agreed on, with examples and provenance. Names are kebab-case. The component is a named export `<Name>` in `<Name>.tsx`, takes its data through props and follows the variant rules (shadcn only, no raw colors, no `style` prop). `examples.tsx` holds named no-props components, one per example or state, and may import `@/fixtures`. `meta.json` has `name`, `title`, `description`, `status` (`draft` or `agreed`), `examples` (`export`, `title`, `width` of `column` or `full`), `provenance` (`round`, `pick`, `note`) and `rules`.

Round variants can import a library component as `@/library/<name>/<Name>`, to iterate on an agreed component. To promote a winner, copy the winning variant into `library/<name>/`, turn the fixture use into props, add examples and write `meta.json` with the rounds it came from. Details and the full contract are in [AGENTS.md](AGENTS.md). Variants may also import `class-variance-authority`, so a round can copy a library component that uses `cva`.

Rules for variants, the round and log contracts, and the agent loop are in [AGENTS.md](AGENTS.md).
