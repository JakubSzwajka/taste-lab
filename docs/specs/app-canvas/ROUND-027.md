# Round-027: authored Used components

Round-026 A was selected with no reason, in dark flip view. It approves responsive sizing only: screens fill available width at 100%. TaskItem, TaskDetails and ScreenPreset visual styles remain draft. No native viewport or zoom engine was approved.

## Scope and files

- `.taste-lab/library/sizing-workbench/meta.json` is agreed for responsive sizing only. Responsive is its only listed agreed example, with round-026 a provenance and an empty note. Native and the historical round-026 sources remain unchanged.
- `.taste-lab/DESIGN.md` records that scope and the open reference-presentation comparison.
- `.taste-lab/library/composition-workbench/{CompositionWorkbench.tsx,examples.tsx,meta.json}` adds one draft workbench with a `presentation` prop and named Flat/Grouped examples. Fixture values stay in examples. ScreenPreset, TaskItem and TaskDetails are imported unchanged.
- `.taste-lab/rounds/round-027/{round.json,a.tsx,b.tsx}` uses thin wrappers, fixture `appCanvas`, flip preview and `basedOn: round-026 a`.

Only Used components differs. A lists the actual TaskItem and TaskDetails examples flat. B adds authored region branches: Task rows and Details view for Task list, Task rail and Selected task for Task detail. These are authored context, not DOM or dependency discovery. Source information, inspector placement, category tabs, nested presets, spacing, theme and interactive screen compositions stay fixed.

## Browser measurements

Dedicated Chromium session `round027-15cab3318b37` used the existing preview on port 5301. Its app shell comes from the primary checkout; this verifies prototype data, not the production changes. Host height was 1000px.

| Host width | A screen width | B screen width | Available inner width | Document width |
| ---------- | -------------- | -------------- | --------------------- | -------------- |
| 1440       | 828            | 828            | 828                   | 1440           |
| 768        | 604            | 604            | 604                   | 768            |
| 390        | 242            | 242            | 242                   | 390            |

Actual ScreenPreset roots matched the preview and available inner width in both choices. Computed transform was `none`; zoom was `1`. Stable width labels matched measurements. A transient 0px label after switching a hidden tab recovered to 828px before the final inspector capture.

Both choices passed all five presets on both screens. Each of the ten screen/preset combinations opened each actual component example and returned to the exact screen and preset. Loading/Empty recovery and Error Retry restored Default. Edit/cancel, edit/save, Reset, zero-result search, Clear filters, Open/All filters, component Completed/Editing examples, category tabs, focus mode and inspector collapse/reopen passed. Tab moved between the used-component buttons with `:focus-visible`. No browser runtime errors were reported.

Desktop light/dark and 390px host captures were inspected. The grouped references remain readable beneath the canvas at narrow width. Most offscreen controls were activated through DOM clicks because the incumbent floating answer bar can occlude them. A desktop grouped TaskItem import and Back were also pointer-clicked after scrolling. This does not establish pointer hit testing for every offscreen control. No touch, Safari, physical-device or quantitative contrast check was run. Portaled sheets and media queries still follow the host viewport.

## Checks and evidence

Browser assertions exited 0. Impeccable detector exited 0 with `[]`. SHA-256 checks confirm unchanged round-026 sources, sizing source/examples and all TaskItem, TaskDetails and ScreenPreset files. The original 26 taste-log lines remain byte-identical. The operator appended round-027 A with no reason in dark flip view during verification. This lane leaves round-027 and its draft metadata unchanged after that answer; the lead owns promotion.

Evidence lives under `/tmp/round027-evidence/`: `browser-checks.py`, `browser-log.json`, `browser-results.txt`, `behavior.txt`, `widths.json`, `keyboard.json`, `runtime-errors.txt`, `design-detector.json`, `unchanged-source.txt`. Captures include `flat-1440-light.png`, `grouped-1440-dark.png`, `grouped-inspector-dark.png`, `flat-inspector-dark.png`, `flat-390-light.png`, `grouped-phone-inspector-dark.png` and `taskitem-import-dark.png`.

Final checks run after this report is formatted. Exact output and exit codes are saved in `pnpm-check.txt`, `data-check.txt`, `ignored-biome.txt` and `check-exits.txt` in that evidence directory. Commands are `pnpm check`, `node bin/taste-lab.mjs check --dir .taste-lab` and the scoped Biome check on the new library, sizing metadata and round-027. No full suite or build is run.

Only this tracked report is committed. Root data remains ignored and is already read by the preview. No production source, historical round, generated primitive, token or server configuration changed. No server was started, stopped or restarted. The dedicated browser is closed.
