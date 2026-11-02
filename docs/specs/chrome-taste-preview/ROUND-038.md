# Round-038: compact desktop header

Round-037 B settles the 256px Layers panel. Round-038 keeps that width and compares the existing 64+48px header bars with 56+40px bars. B gives content 16px more height without shrinking its 44px controls. The tighter body spacing, brighter charcoal and IBM Plex Sans stay fixed.

Live files: `rounds/round-038/{a.tsx,b.tsx,round.json}` under `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`. Both wrappers reuse the unchanged specimen and set `basedOn` to round-037 B. B adds only desktop header-height overrides. Historical rounds, shared library source, fixture content, font assets and theme.css remain unchanged.

## Measured result

```text
Desktop header bars       A       B
Top bar                  64px    56px
Context bar              48px    40px
Bar heights combined    112px    96px
Navigation controls      44px    44px
Content-height gain       0px    16px
```

The shared 1px bottom border makes the complete header boxes 113px and 97px. Both retain 256px side panels, 28px tree rows, 12px panel padding, 20px canvas padding and 6px group gaps. At 768px and 390px, header geometry is identical between A and B; mobile tree rows remain 44px. The context bar can wrap on a phone.

## Verification and operator pick

Lead-owned Chromium checked 16 Library combinations across 1440×1600, 1024×1100, 768×1024 and 390×844, in light and dark for both choices. It also checked all four sample pages in every combination: 64 header measurements and 64 scoped axe audits. All four navigation targets remain 44×44px and fit inside the top bar. Desktop content gains exactly 16px; widths stay fixed. The document and specimen fit horizontally, IBM Plex Sans loads and the inner preview keeps Geist, its own theme and all three tasks. Axe reports zero violations and zero incomplete results.

Desktop B passes pointer folding, Tab to the next entry header and Enter folding. Phone B switches between Preview, Inspector and Layers. I inspected fresh desktop A/B and phone B captures, then closed the owned browser. Server 5301 was not stopped or restarted.

The operator answered round-038 B during verification, in dark flip view with no tags or reason. DESIGN.md records that pick and distills rounds 033–037 into preview Do, Don't, Tokens and Open questions. No round-039 is created by this task and no production restyle is applied.

The first matrix briefly found no visible specimen during the run in which the new answer arrived. A visible-root readiness check and a complete rerun pass; no prototype source correction was needed. The first failure remains in `browser-first.log`.

All final project checks exit 0:

- `pnpm check`
- `pnpm test`: 36 files, 637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit Biome and Impeccable checks on round-038; detector reports no findings

All 225 protected files and the original 37 taste-log lines are unchanged. The app appended the genuine round-038 answer; QA submitted none. Logs and raw results: `/tmp/round038-evidence/`. Saved captures and measurements: `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-04/`. This is lead browser proof, not independent review.

## Replay and limits

Open round-038 in Full width on desktop and switch A/B. Compare the logo and page controls, context strip and space below it. The sample page icons let you inspect Compare, Theme and History too. On a phone, the header should stay unchanged. The operator's B pick is already logged; replaying needs no new submission.

The host answer bar can cover lower controls; scroll them above it. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. Production mobile sidebar focus restoration is unchanged. The report PR includes no ignored local prototype assets and authorizes no deployment or production theme, font or layout change.
