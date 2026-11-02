# Round-037: Library panel proportions

Round-036 B settles the tighter desktop spacing. Round-037 keeps it and asks whether the Layers panel should stay 224px wide or grow to 256px. B takes 32px from the canvas; the inspector stays 256px. Both choices retain the selected brighter charcoal and IBM Plex Sans.

The live files are `rounds/round-037/{a.tsx,b.tsx,round.json}` in `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`. Both wrappers reuse the unchanged specimen, with round-036 B as `basedOn`. B adds one desktop grid-column override. No shared library source, historical round, fixture, font asset or theme.css changes.

## Measured result

```text
                              A          B
Layers                      224px      256px
Inspector                   256px      256px
Canvas at 1440px viewport    836px      804px
Canvas at 1024px viewport    420px      388px
```

The preset name "More than 2 tags shows +n" truncates in A but fits in B. Tree rows remain 28px, including the broken entry. Both use 12px panel padding, 20px canvas padding and 6px group gaps. At 768px and 390px, the panel switcher remains unchanged and rows stay 44px. This is a desktop proportion comparison, not another density round.

## Verification

Lead-owned Chromium checked 16 combinations: 1440×1600, 1024×1100, 768×1024 and 390×844, each in light and dark mode for A and B. The measured widths match the diagram in both themes. The document and specimen fit horizontally. IBM Plex Sans loads; the inner preview retains Geist, its independent theme and all three tasks. Sixteen scoped Library axe audits report zero violations and zero incomplete results.

Desktop B passes pointer folding, Tab to the next entry header and Enter folding. Phone B switches between Preview, Inspector and Layers with their content visible. I inspected fresh desktop A/B and phone B captures, then closed the owned browser. Server 5301 was not restarted or stopped.

All final checks exit 0:

- `pnpm check`
- `pnpm test`: 36 files, 637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit Biome and Impeccable checks on round-037; detector reports no findings

The first project check caught an unformatted Markdown table in the earlier round-036 report. This task formats that owned report before rerunning the checks; no prototype source fix was needed. The failed run remains in `check-first.log`.

Preservation checks find 222 protected files unchanged and the original 36 taste-log lines intact. Only DESIGN.md records the new choice and open question; the three round-037 files are new. QA submitted no taste answer. Evidence and logs are under `/tmp/round037-evidence/`; saved captures and raw results are under `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-03/`. This is lead browser proof, not independent review.

## Operator flow and limits

Refresh round-037 in Full width on desktop. Switch A/B and compare long preset names against the canvas space they cost. Try 1024px too. On a phone, both choices should keep the same Layers, Preview and Inspector layout. Use the real answer bar to record a pick and any reason.

The host answer bar can cover lower preview controls; scroll them above it. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. The existing production mobile sidebar focus issue is unchanged. The report PR contains no local prototype assets, and no production theme, font or layout is applied.
