# Round-039: tree text size

Round-038 B settles the shorter desktop header. Round-039 keeps it and compares 14px with 13px entry and preset labels. Both use 20px line height and 28px rows, so the question is legibility, not another spacing change. IBM Plex Sans, brighter charcoal and the 256px side panels stay fixed.

The live round is `rounds/round-039/{a.tsx,b.tsx,round.json}` under `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`, based on round-038 B. A reuses the winning wrapper. B adds desktop-only font-size and line-height overrides for the tree's labels, including the broken-entry line. Historical rounds, shared library source, fixtures, fonts and theme.css stay unchanged.

## Measured result

```text
Desktop tree labels      A       B
Font size               14px    13px
Line height             20px    20px
Row height              28px    28px
Badges                  12px    12px
Chevron icons           16px    16px
```

Both keep 56+40px desktop header bars, 44px navigation controls, 12px panel padding, 20px canvas padding and 6px group gaps. Inspector labels remain 14px. At 768px and 390px, tree labels remain 14px with 44px rows in both choices. The center width does not change.

## Verification

Lead-owned Chromium checked 16 viewport/theme/variant combinations: 1440×1600, 1024×1100, 768×1024 and 390×844, each in light and dark for A and B. All 13 interactive tree labels and the broken-entry label have the intended font size and 20px line height. Badges, chevrons and peripheral text retain their sizes. The document and specimen fit horizontally, the actual Plex face loads, and the inner preview retains Geist, its independent theme and all three tasks.

Sixteen scoped Library axe audits report zero violations and zero incomplete results. Desktop B passes pointer folding, Tab to the next entry header and Enter folding. Phone B switches between Preview, Inspector and Layers. I inspected fresh desktop A/B and phone B captures, then closed the owned browser. Server 5301 stays running.

All final checks exit 0:

- `pnpm check`
- `pnpm test`: 36 files, 637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit Biome and Impeccable checks on round-039; detector reports no findings

The preservation check finds 228 protected files unchanged and the original 38 taste-log lines intact. Only DESIGN.md records the new question; the three round files are new. QA submitted no answer. Logs and raw results: `/tmp/round039-evidence/`. Saved lead proof: `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-05/`. No independent review is claimed.

## Operator flow and limits

Refresh round-039 in Full width on desktop and switch A/B. Read entry headings, presets and the broken-entry label. Compare how easily they scan without changing row spacing. On a phone, text and targets should stay unchanged. Record the preferred size in the real answer bar.

The host answer bar can cover lower controls; scroll them above it. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. Production mobile sidebar focus restoration is unchanged. No production theme, font or layout is applied, and the report PR includes no ignored local prototype assets.
