# Round-036: slightly tighter Library spacing

Round-034 A won with the reason "even slightly more compacted?". Round-036 compares that compact spacing with a tighter desktop Library. Both choices carry round-033 C's brighter charcoal and round-035 C's IBM Plex Sans. This is a preview, not a production restyle.

The live round is under `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/rounds/round-036/`. Its two wrappers reuse the existing specimen. They change no shared library source, fixture, historical round or font asset. `basedOn` is round-034 A; the default view is flip.

| Desktop measurement | A: compact control | B: slightly tighter |
| --- | --- | --- |
| Tree rows, including the broken-entry line | 32px | 28px |
| Panel padding | 16px | 12px |
| Canvas padding | 24px | 20px |
| Group gaps | 8px | 6px |

The tighter rules apply only at the desktop container breakpoint. At viewport widths of 768px and 390px, both choices retain 44px rows and 16px panel padding. Header heights, font sizes and other sample pages stay fixed. The inner task preview keeps Geist and its independent theme.

## Verification

Final-source checks all exit 0:

- `pnpm check`
- `pnpm test`: 36 files, 637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit Biome and Impeccable checks on round-036; detector reports no findings

The lead-owned Chromium session checked 12 combinations: 1440×1600, 768×1024 and 390×844, each in light and dark mode for A and B. Computed spacing matches the table. IBM Plex Sans actually loads; the inner preview retains Geist and all three task rows. Neither the specimen nor document overflows horizontally. Twelve scoped Library axe audits report zero violations and zero incomplete results.

Desktop B also passes pointer folding, Tab to the next entry header and Enter folding. Phone B switches between Preview, Inspector and Layers with the matching content visible. I inspected fresh desktop A/B and phone B captures, then closed the owned browser. Server 5301 stays running.

Visual review caught B's broken-entry line retaining 32px. The final wrapper sets it to 28px, and the matrix now checks it. An extra interaction probe initially used the wrong Caption input selector; the corrected probe passes. Its first failure remains in `interactions-first.log`.

Evidence and logs: `/tmp/round036-evidence/`. Saved captures, measurements, audits, interactions and preservation results: `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-02/`. This is lead browser proof, not independent review.

The preservation check finds all 219 protected files unchanged and the original 35 taste-log lines byte-for-byte intact. Only DESIGN.md records the choices; the three round-036 files are new. No answer was submitted during QA.

## Operator flow

1. Refresh round-036 and use Full width. Start with Sample Library on desktop.
2. Switch A/B. Compare the tree, panel padding and space around the fixed task preview.
3. Check light mode too. On a phone, use Layers, Preview and Inspector; touch rows should stay roomy in either choice.
4. Pick A, B, None or Mix in the real answer bar. Add a reason if a specific part still feels too loose or tight.

The existing answer bar can cover lower preview controls; scroll them above it. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. The existing production mobile sidebar focus issue is unchanged. No prototype winner is applied to production, and the ignored local assets are not part of this report PR.
