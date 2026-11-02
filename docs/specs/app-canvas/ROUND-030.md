# Round-030: nested preset disclosure

Round-029 B selected Back in preview toolbar, with no tags or reason, in dark flip view at 2026-11-02T17:38:06.479Z. Only primary return placement is agreed. TaskItem, TaskDetails and ScreenPreset styling stays draft.

## Live scope

`.taste-lab/library/inspection-return-workbench/meta.json` now lists InToolbar alone, is agreed for return placement only and adds 029 b provenance with an empty note. InPreview and all historical source/examples remain unchanged.
The new draft `.taste-lab/library/preset-disclosure-workbench/` copies the InToolbar baseline into PresetDisclosureWorkbench, with AllExpanded and SelectedOnly examples. Fixture values remain in examples.tsx; actual ScreenPreset, TaskItem and TaskDetails imports are unchanged.
`.taste-lab/rounds/round-030/{round.json,a.tsx,b.tsx}` uses appCanvas, flip and basedOn 029 b. `.taste-lab/DESIGN.md` closes 029 and opens 030, without unrelated decision changes.

```text
Both start: Screens / Task list / Compact
A  Task list [five presets]  Task detail [five presets]
B  Task list [five presets]  Task detail [header only]
B  Select Task detail header -> Default, its five presets appear
   Task list keeps its header; its presets disappear
```

Only nested row visibility and natural height/scroll effects differ. Existing headers expose actual aria-expanded state in both choices. Header activation still selects the first example; category changes alone do not change selection. No accordion, manual expansion, preset relocation, source-information or inspector-layout change was added. Category tabs, nested examples, responsive 100%, flat references with role hints and exact toolbar/secondary Back remain fixed.

## Measured evidence

Dedicated Chromium session round030-worker used existing port 5301. This is the primary shell serving worktree prototype data, not the production branch shell. The explicit brief supplied Operate-mode direction without another interview. Context allowed narrow refinement without PRODUCT.md; no delegates were used.
Both choices passed both screens and all ten presets at 1440 × 1000 and 390 × 1000. Each screen was reached through its real header, then an existing visible preset button, never a hidden target. Both actual authored components opened from every screen/preset; toolbar Back restored the exact pair and corresponding disclosure. Loading/Empty recovery and Error Retry returned Default.
Local edit/cancel/save/shared edits/reset, search/zero results/Clear filters/Open filter, task selection, real details sheet, Completed/Editing component examples, category behavior, layers/focus/inspector toggles and secondary Back passed. Enter activated an unselected header; Tab reached its revealed Default then Compact with visible focus and no trap. Representative desktop header/preset, both references and primary Back also passed pointer clicks.

| Host viewport | A / B screen width | Available inner width |
| ------------- | ------------------ | --------------------- |
| 1440 × 1000   | 828 / 828px        | 828px                 |
| 768 × 1000    | 604 / 604px        | 604px                 |
| 390 × 1000    | 242 / 242px        | 242px                 |

Screen and preview widths equal available inner width. Every preview ancestor measured transform none and zoom 1; document width equals host width. Initial desktop captures show ten nested rows in A and five in B, with the same four real tasks. At 390px, the 256px tree scroll area contains 452px in A versus 292px in B. B saves 160px, but still needs some tree scrolling. Bottom-scroll captures show all revealed presets remain reachable.
Read desktop/390 light/dark screen, component, toolbar Back, keyboard and tree-bottom captures. Visual judgment: B shortens the tree without changing row treatment; A leaves both sets exposed. At phone width the toolbar wraps and inspector stacks. The incumbent floating answer bar obscures lower content. Most matrix/phone actions used DOM activation of rendered controls, not pointer/touch hit tests. Desktop pointer coverage does not prove mobile touch, Safari or physical-device behavior. No production mobile Sheet focus correction is claimed.
Scoped stable tree axe audits found one light contrast violation in each choice: `[aria-label="Task detail · Compact"][aria-pressed="true"]`, inherited `bg-primary/10 text-primary`, 4.18:1 versus required 4.5:1 at 12px. Both dark audits found zero violations. Lead required preserving these inherited styles and reporting the unresolved limitation. No baseline browser contrast comparison or full-page accessibility pass is claimed. The design detector exited 0 with `[]`.

## Preservation and delivery

Evidence lives in `/tmp/round030-evidence/`: browser-checks.py, browser-results.txt, browser-log.json, behavior.txt, disclosure.json, widths.json, controls.json and keyboard.json. Browser assertions exited 0 with no runtime errors. extra-checks.py/extra-results.txt exited 0 collecting audits and tree-scroll.json, not asserting an axe pass. Earlier harness attempts and their selector/category-activation errors are retained separately. Inspected contact sheets use inspected-*.png; originals retain choice/size/state/theme filenames.
Baseline hashes cover 184 existing data files. Only the two owned decision files change; the other 182, including every old round, historical source/examples, fixture, token and Task component, remain byte-identical. The original 29 taste-log lines remain unchanged; the receipt checks append-only preservation at handoff.
This report is formatted before the final three checks: pnpm check, root data check and scoped ignored-file Biome. Exact exits, current input/log hashes and ownership results are in check-exits.json and ownership-receipt.json; logs are pnpm-check.txt, data-check.txt and ignored-biome.txt. No full suite or build runs.
Only this tracked report is committed with hooks enabled. Ignored DESIGN, inspection-return metadata, new disclosure library and round remain unstaged and already affect the live preview. Round-030 stays draft, with no promotion of any early answer. The dedicated browser is closed; port 5301 is untouched. No production correction, server change or publishing is included.
