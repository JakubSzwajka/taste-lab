# Round-042: one compact system, two characters

Round-041 B selects 32px desktop fields and asks for fewer small polls: "you are going with perfect small adjustments but please tackle more of those on your own. Probably there are some rules for all of that".

The agent now resolves related details against shared rules. Round-042 applies common compact-spacing cleanup, then asks one broader question: should the chrome feel soft or crisp across Library, Compare, Theme and History? It does not ask the operator to approve each margin.

## Common rules and the comparison

Both wrappers build on round-041 B. Desktop Layers heading and search gaps become 12px; Inspector tabs use 16px below, with 8px below section headings and explanatory copy. The chosen 16px separator gaps stay fixed. These are agent-made refinements, not newly invented operator picks. DESIGN.md records the rules and the exact feedback. `pi/skills/taste/LOCAL.md` preserves the workflow preference for future work.

The settled geometry remains: 14px desktop tree/input text, 28px tree rows, 32px inputs, 12px panel padding, 20px canvas padding, 256px side panels and 56+40px header bars. Mobile retains 44px fields and rows, its existing spacing and 44px page navigation targets. The intentional 6px desktop tree group gap remains an exception to ordinary 4px spacing steps.

Only the chrome corner scale differs between variants. A retains the softer `--radius: 0.875rem`; B uses `0.375rem`. Stock shadcn primitives derive their corners from that scale. Colors, type, content and layout are identical. The inner prototype resets its own tokens, including radius.

```text
Measured chrome                  Soft A    Crisp B
Workspace / rounded-xl surfaces  19.6px      8.4px
Search / page navigation         14px         6px
Inner prototype                  14px        14px
```

Live files: `rounds/round-042/{a.tsx,b.tsx,round.json}` in `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`. Both TSX files are identical; their round tokens differ only at `--radius`. Shared library source, historical rounds, fixture content, font assets and theme.css are unchanged. No production theme promotion is implied.

## Verification

Lead-owned Chromium checks 16 Library geometry cases and 64 page cases across 1440×1600, 1024×1100, 768×1024 and 390×844, light/dark and A/B. All four sample pages fit horizontally and retain four 44×44px navigation targets. Sixty-four cross-page scoped axe audits report zero violations and zero incomplete results. The Theme fixture still contains 32 rows; History contains 12. These are fixed sample pages, not live token or answer-log views.

Library measurements confirm the shared spacing rules, unchanged selected sizes and the expected corner scale. Real IBM Plex Sans loads. The inner prototype keeps Geist, its theme, 14px corners and three task rows in both choices. Search no-match/recovery, Caption edit/restore, pointer and keyboard folding, and phone pane switching pass. I inspected desktop Library and Compare A/B, Theme and History B, plus phone B Inspector captures, then closed the owned browser. Real scrolling exposes phone controls above the unchanged host answer bar. Server 5301 stays running.

The first probe assumed an older radius formula. Reading this repo's current multiplier scale and generated controls corrected only the harness. The complete matrix then passes; `browser-first.log` retains the failure. No prototype repair was needed.

All final commands exit 0: `pnpm check`, `pnpm test` with 36 files and 637 tests, `pnpm build`, and data checks for `.taste-lab` and `examples/demo/.taste-lab`. Explicit round Biome and Impeccable checks pass with no detector findings. The existing build chunk-size advisory remains.

All 237 protected files and the original 41 taste-log lines remain intact. QA submits no answer. Evidence, scripts, inspected PNGs and logs are saved in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-08/`. Private root-disk scratch avoids the previously confirmed `/tmp` quota problem. This is lead proof, not independent review.

## Operator flow and limits

Refresh round-042 in Full width. Switch A/B, then use the specimen's four page icons. Judge the overall chrome character rather than individual pixels. The fixed task preview should not change when its surroundings change. Record the preference in the real answer bar.

Production is unchanged. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. The host answer bar may cover lower controls, and production mobile sidebar focus restoration remains a separate issue. The PR contains documentation and local agent guidance, not ignored prototype assets or application source changes.
