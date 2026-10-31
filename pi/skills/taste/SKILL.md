---
name: taste
description: Run the taste-lab loop after the operator answers a round. Use when a taste-lab message says "answered round-NNN", when /taste reports the lab running, or when asked to write the next taste-lab round, add to the library or taste database, promote a winner, or implement agreed components.
---

# Taste loop

The lab's contract is `../../../AGENTS.md` (the taste-lab repo root, relative to this skill). Read its sections "Core principle", "Variant file API", "Round contract", "The loop", "Library" and "Theme" before writing files. That file wins over this one.

`<lab>` below is the taste-lab repo root (`../../..` from this skill). `<dataDir>` is the data dir named in the message, usually `<repo>/.taste-lab`.

## On an answer

1. Read the answer in the message: round, pick, tags, reason, theme, view.
2. Read `<dataDir>/taste.jsonl` (the last lines are the newest answers) and `<dataDir>/DESIGN.md`.
3. Read the picked variant file in `<dataDir>/rounds/<round>/` and its `round.json`.
4. Decide:
   - Direction not settled: write the next round in `<dataDir>/rounds/round-NNN/` (next free number). Set `basedOn` to the pick. Change one thing. Make 2 to 4 variants that differ in clear directions.
   - `none`: all options missed. Change direction, not detail.
   - `mix`: the reason says which parts. Combine them as the next round's base.
   - Operator settled a component: promote it to `<dataDir>/library/<name>/` ("Promoting a winner").
   - Token round settled: copy the tokens into `<dataDir>/theme.css` ("Promoting a token round winner").
5. Every ~5 rounds, distill the log into `<dataDir>/DESIGN.md` with round ids.
6. Run `node <lab>/bin/taste-lab.mjs check --dir <dataDir>`. Fix every line it prints. Exit 0 is required.
7. Tell the operator in one or two lines what the new round asks and to refresh the lab page. The running server picks up the round without a restart.

## Shared library workflow

The data dir library is a shared taste database. Read the `Library` contract in `AGENTS.md` before editing it.

- To add a component from any session, create `library/<name>/` with its component, examples, and `meta.json`. Set `status` to `draft`, then run `taste-lab check --dir <dataDir>`.
- Iterate on draft entries with the operator. When they agree, the agent changes `meta.json` status to `agreed`. The app never writes library source files.
- In an app implementation session, run `taste-lab library --dir <repo>/.taste-lab --status agreed --json`. Copy the agreed entries into the app and adapt them to its codebase.

## Rules

- Variants use shadcn primitives and theme tokens only. No raw colors, no `style` prop.
- Never edit or reorder `taste.jsonl`. The lab appends to it.
- Never ask for or repeat the lab links. The operator has them in pi's UI. `/taste status` shows them again.
