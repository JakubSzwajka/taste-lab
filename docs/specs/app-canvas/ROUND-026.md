# Round-026: screen viewport sizing

Round-025 A was selected with an empty reason. Category tabs and nested named examples are settled. Production work on that navigation can proceed independently of this sizing choice.

## Decision and changed files

- `.taste-lab/library/preset-workbench/meta.json`: agreed, with round-025 a provenance and `note: ""`. Nested is the only listed agreed example. The existing Above export and both round-025 files remain unchanged, so historical B still renders. Approval covers navigation, not TaskItem, TaskDetails or ScreenPreset styles.
- `.taste-lab/DESIGN.md`: cited round-025 a rule records that scope.
- `.taste-lab/library/sizing-workbench/SizingWorkbench.tsx`: new draft composition copied from the settled nested workbench. It imports unchanged ScreenPreset, TaskItem and TaskDetails sources. Only screen sizing and its controls differ between A and B.
- `.taste-lab/library/sizing-workbench/examples.tsx`: same catalog, fixtures, screen presets and component examples in both policies.
- `.taste-lab/library/sizing-workbench/meta.json`: draft. Describes sizing and host-viewport limits.
- `.taste-lab/rounds/round-026/round.json`, `a.tsx`, `b.tsx`: flip preview, based on round-025 a.
- `docs/specs/app-canvas/ROUND-026.md`: this record. Data-dir changes remain ignored; none were force-added.

A fills the available preview width. B starts at Desktop 1280px and offers Tablet 768px and Phone 390px. All are 100%, without transform, zoom or scale-to-fit. A ResizeObserver reports the current measured width. Native preview children use `shrink-0`; their preview parent scrolls horizontally. The frame uses a ring rather than an inset border, so the shared screen itself measures exactly the claimed width.

Component examples retain the existing full preview frame with a `max-w-xl` inner composition. Screen-only controls disappear while browsing components. Native choice remains in workspace state when opening a used component and returning.

## Measured browser results

Headless Chromium through agent-browser, against the lead's existing loopback preview on port 5301. Host height was 1000px in every measurement. Widths below are `getBoundingClientRect().width` on the actual ScreenPreset root, not labels.

| Host width | A responsive screen | B Desktop | B Tablet | B Phone | Preview scroll client width | Document width |
| ---------- | ------------------- | --------- | -------- | ------- | --------------------------- | -------------- |
| 1440       | 828                 | 1280      | 768      | 390     | 868                         | 1440           |
| 768        | 604                 | 1280      | 768      | 390     | 644                         | 768            |
| 390        | 242                 | 1280      | 768      | 390     | 266                         | 390            |
| 320        | 172                 | 1280      | 768      | 390     | 196                         | 380            |

A matched the preview's available inner width at each host size. B retained all three exact widths at every host size. Labels matched the measurements after layout. Computed screen transform was `none` and zoom was `1` throughout. Native Desktop inner `scrollLeft` accepted 100px at each host size. At 390px host, Desktop scroll width was 1304px inside a 266px client area. The workbench right edge remained inside the host. At 320px, the incumbent Compare chrome still makes the document 380px wide under both policies; native widths add no document overflow.

Both variants passed these local checks:

- Task list and task detail each expose Default, Compact, Loading, Empty and Error. Compact changes layout. Loading/Empty recovery and Error Retry restore Default.
- Edit a composed task detail, cancel and confirm the original title. Edit again, save and confirm the local saved message and changed title. Reset restores fixture data.
- Search returns zero results for a missing title. Clear filters restores four tasks; Open shows three; All restores four.
- From Task detail / Compact, open the Used TaskItem example. Screen-only viewport controls disappear. Back restores Task detail / Compact and, in B, the selected Tablet viewport.
- Screens/Components tabs switch. Completed shows the component's completed example; Editing opens the actual details form. Focus hides panels; exiting restores them. Collapse/reopen inspector works.

DOM activation was used for some controls below the floating Compare answer bar; text fields were filled through browser input. This verifies handlers and state, not pointer hit testing for every offscreen item. Keyboard focus reached the native Phone control and matched `:focus-visible`. Arrow-key selection was not established by that check. No browser runtime errors were reported.

## Checks and evidence

The original final receipt failed: `pnpm check` reported that Biome wanted this viewport-measurement table padded and aligned. Both TypeScript projects passed before that formatting error. The original run therefore did not pass, despite the earlier browser and data-dir checks. This corrective run formats this report, then reruns final checks after the report is written.

Before the formatting failure, `node bin/taste-lab.mjs check --dir .taste-lab` reported a clean data dir. The original `pnpm check` did not pass; its exact output is recorded in `/tmp/round026-receipt-check.log`.

Other recorded checks:

- `pnpm exec biome check --vcs-enabled=false --files-ignore-unknown=true .taste-lab/library/sizing-workbench .taste-lab/library/preset-workbench/meta.json .taste-lab/rounds/round-026`: seven ignored files checked, no fixes needed.
- Impeccable detector on the new library and round: `[]`.
- Width and interaction scripts: assertions passed. SHA-256 verification confirms taste.jsonl, round-025 files, old PresetWorkbench source and all ScreenPreset files unchanged.

Evidence is under `/tmp/round026-evidence/`: `widths.json`, `widths.log`, `width-checks.py`, `behavior.txt`, `behavior-checks.py`, `keyboard.json`, `runtime-errors.txt`, `data-check.txt`, `pnpm-check.txt`, `ignored-biome.txt`, `design-detector.json`. Screenshots: `a-desktop.png`, `b-desktop.png`, `a-phone-host.png`, `b-phone-host.png`, `b-phone-focused.png`, `b-desktop-dark.png`.

Visual review covered desktop light/dark and phone width. The focused phone capture shows the native screen clipped inside its scroll area, not shrunk. The layout keeps the existing category tabs, nested rows, spacing and inspector. No new color or type system was introduced.

## Known limits and handoff

This is not iframe isolation. ScreenPreset uses container-responsive classes for its composition. Browser media queries in imported primitives still follow the host browser width. Portaled sheets follow the host viewport and theme, not the selected screen width. Focus removes workspace panels but does not scale the screen.

Real touch, Safari, physical devices and quantitative contrast testing were not run. Existing Compare answer-row overflow and overlay occlusion are outside this sizing round. No full test suite or build was run. No server was started, stopped or reconfigured, and no LAN logs were inspected. The dedicated browser session is closed after verification; the lead's preview remains untouched.

The operator selected A, responsive fill, in dark flip view with no reason. This settles sizing at 100% of the available width, not native viewport presets. Approval covers sizing only; TaskItem, TaskDetails and ScreenPreset visual styles remain draft. Historical B remains available.
