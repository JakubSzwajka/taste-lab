# Round-028: flat reference detail

Round-027 A selected Flat imports with no tags or reason, in dark flip view. Only flat Used components reference presentation is agreed. TaskItem, TaskDetails and ScreenPreset visual styles remain draft.

## Changes

`.taste-lab/library/composition-workbench/meta.json` now lists only Flat as agreed, adds round-027 a provenance with an empty note, and limits approval to reference presentation. CompositionWorkbench source, its examples and historical round-027 files remain byte-identical. Grouped stays exported for round-027 B.

The new `.taste-lab/library/reference-detail-workbench/` copies the Flat baseline. NamesOnly hides the authored role hints; WithRoles keeps "Task rows" and "Details and edit form". Natural button height is 34px versus 50px. The same component names, actions, spacing and styles remain. Fixture values live only in examples.tsx; the workbench imports the unchanged ScreenPreset, TaskItem and TaskDetails.

`.taste-lab/rounds/round-028/{round.json,a.tsx,b.tsx}` uses thin wrappers, fixture `appCanvas`, flip preview and `basedOn: round-027 a`. `.taste-lab/DESIGN.md` records 027 A as closed and 028 as the next open comparison. The new library remains draft. No category, preset, sizing, source-information or inspector-placement decision is reopened.

## Render and behavior evidence

Chromium session `round028-worker` used the existing preview on port 5301. That preview runs the primary installed app shell while reading this worktree's prototype data. It does not demonstrate the production worktree shell. The explicit brief supplied direction in place of a design interview; no secondary design lane was used.

| Host viewport | A screen width | B screen width | Available inner width |
| ------------- | -------------- | -------------- | --------------------- |
| 1440 × 1000   | 828px          | 828px          | 828px                 |
| 768 × 1000    | 604px          | 604px          | 604px                 |
| 390 × 1000    | 242px          | 242px          | 242px                 |

Screen roots match their preview width. Transform is `none`, zoom is `1`, and document width matches host width. At 390px, both choices also passed width assertions for every screen/preset combination.

Both choices passed all five presets on both screens at desktop and 390px. Each combination opened the actual TaskItem and TaskDetails examples, then Back restored the exact screen and preset. Loading/Empty recovery and Error Retry restored Default. Edit/cancel/save, shared edits across presets, Reset, zero-result search, Clear filters, Open/All filtering, task selection, the real details sheet, component Completed/Editing examples, category tabs, focus mode and inspector collapse/reopen passed. Tab reached TaskDetails with visible focus. No browser runtime errors were reported.

Desktop light/dark and 390px light/dark captures were read. Names alone produce shorter rows; roles remain readable below each name. The narrow layout stacks the inspector below the canvas without document overflow. Actual imported component captures at 390px were also read.

Most controls, all phone navigation and offscreen cases used DOM activation. Both actual imports and Back were additionally pointer-clicked at desktop in each choice. This does not prove pointer hit testing for every control or any touch interaction. The incumbent floating answer bar can cover lower content. No Safari or physical-device test was run. Portaled sheets and media queries follow the host viewport.

The role-reference list passed scoped axe checks in stable light and dark states. An earlier audit immediately after the theme switch reported transient name contrast of 3.57:1; the stable dark rerun reported zero violations. This is not a full-page accessibility audit.

## Checks and handoff

Evidence is under `/tmp/round028-evidence/`: `browser-checks.py`, `browser-log.json`, `behavior.txt`, `widths.json`, `rows.json`, `mobile-checks.py`, `mobile-results.txt`, `component-captures.py`, `runtime-errors.txt`, scoped axe JSON files and `design-detector.json`. Browser scripts exited 0; the Impeccable detector exited 0 with `[]`. Representative captures are `names-1440-inspector-light.png`, `roles-inspector-dark.png`, both `*-390-inspector-dark.png` and `*-390-actual-component-{1,2}.png`.

SHA-256 verification in `unchanged-source.txt` confirms unchanged historical round-027, composition source/examples and all underlying component files. The original 27 taste-log lines remain byte-identical. The operator appended 028 B with no tags or reason in dark flip view during verification. This lane does not alter 028, promote its answer or start 029; the lead owns that follow-up.

Final checks run after this report is formatted: `pnpm check`, `node bin/taste-lab.mjs check --dir .taste-lab`, and scoped Biome on the new library, composition metadata and round-028. Logs and exact exits are recorded in `pnpm-check.txt`, `data-check.txt`, `ignored-biome.txt`, `check-exits.txt` and `ownership-receipt.json`. No full suite or build is run.

Only this tracked report is committed, with hooks enabled. The owned ignored data files remain unstaged and already affect the live preview; the lead decides their next promotion. No production source, historical source, generated primitive, token, fixture, CLI, test or server setting changed. The named browser is closed. Ports 5301 and 5327 remain untouched.
