# Round-032: selected-preset emphasis

Round-031 B chose Header toggles with no tags or reason, in dark flip view at 2026-11-02T18:16:58.177Z. Headers and chevrons fold independently without selecting; nested presets select examples. This completes round-030 A's qualification, "All but make it collapsible". Agreement covers manual collapse and header disclosure only, not selected colors or Task styles.

## Live comparison

New draft `.taste-lab/library/preset-selection-workbench/` copies the final HeaderToggle baseline into PresetSelectionWorkbench. QuietSelection and SolidSelection both start Screens / Task list / Compact with every group expanded. Fixture values stay in examples.tsx. Actual ScreenPreset, TaskItem and TaskDetails imports remain unchanged.

```text
Both  Header/chevron -> fold only that group, without selecting
      Nested preset -> select its actual example
A     Selected Button secondary + hover:bg-secondary
B     Selected Button default   + hover:bg-primary
Both  Unselected ghost, same row geometry and 12px normal text
```

The new clone removes the inherited selected `bg-primary/10 text-primary` override. Matching semantic hover backgrounds retain each stock foreground pair. There are no new selection icons, badges, borders, settings, fonts or token overrides. Labels, nesting, icons, aria-pressed logic and other rows stay fixed. This is the isolated new prototype style axis for known task17, not a production correction or historical-source repair.

`.taste-lab/rounds/round-032/{round.json,a.tsx,b.tsx}` uses appCanvas, flip and basedOn031 b. Thin wrappers import the named examples. `.taste-lab/DESIGN.md` closes entry-title action and opens selected-preset emphasis.
Only `.taste-lab/library/preset-collapse-workbench/meta.json` is promoted: agreed for manual collapse/header disclosure, HeaderToggle alone listed, with031 B provenance and an empty note. Its source and SeparateChevron export remain unchanged for historical031 A. The exact030 A reason remains in provenance. Its historical light4.18:1 selected-color warning remains explicit. The old preset-disclosure metadata is untouched and stays draft, as do TaskItem, TaskDetails and ScreenPreset styles.

## Actual selected-text contrast

Dedicated Chromium session round032-worker uses existing5301, the primary shell serving worktree data, not a production-branch shell. The brief supplies the Operate-mode direction for narrow refinement; no new interview, context repair or sibling lane was needed.
Measurements target the selected `Task list · Compact` Button at1440 ×1000, with12px400 text. `contrast.json` contains exactly twelve records, including raw computed foreground/background colors, browser-converted sRGB Float16 and8bit values, actual state flags, target, geometry, hit target and screenshot path. WCAG relative luminance uses the browser-converted opaque sRGB colors, not token-name inference or screenshot antialiasing.

| Choice | Theme | Normal             | Actual hover       | Keyboard focus     |
| ------ | ----- | ------------------ | ------------------ | ------------------ |
| Quiet  | Light | 15.41512436211225  | 15.41512436211225  | 15.41512436211225  |
| Quiet  | Dark  | 13.760243295159059 | 13.760243295159059 | 13.760243295159059 |
| Solid  | Light | 4.913362813297575  | 4.913362813297575  | 4.913362813297575  |
| Solid  | Dark  | 8.40331914452264   | 8.40331914452264   | 8.40331914452264   |

Normal has neither hover nor focus. Hover uses a real pointer move and asserts `:hover`. Focus moves the pointer away, focuses the preceding Default button, then presses Tab to reach Compact; activeElement and `:focus-visible` are both asserted. Finite transition promises settle before every measurement, and the target has no running animations. Opaque colors, no background image, ancestor opacity1/filter none/blend normal and an unobstructed center hit target are checked. Matching hover backgrounds make the three state ratios equal by design. The minimum4.913362813297575 exceeds4.5 without rounding a failure upward.
Selected row dimensions, padding, borders, font size/weight and icon counts match between choices. Unselected rows have identical classes and variants. Scoped tree axe audits record zero violations in light/dark for both choices. These checks do not clear the whole page, approve Task styles or change historical low-contrast sources. The design detector runs once on final UI and exits0 with `[]`.

## Preserved behavior and real size

Both choices initially expose all ten screen presets in desktop light/dark. Independent folds retain preview DOM identity, search input and local edits. Headers pass pointer, Enter and Space without selecting. Chevron keyboard activation, hidden-child exclusion from Tab/accessibility snapshots, truthful aria-expanded/resolved controls, no nested buttons and stable IDs pass. Simultaneously mounted A/B controls have unique IDs. Component groups fold independently too; category changes, panels, Focus, inspection/Back and Reset preserve manual fold choices. No auto-collapse, reload persistence or default selection-policy change is added.
At1440 and390px both screens and all ten presets remain reachable through the actual nested controls. Closed groups reopen through their visible chevrons before selection. Both actual authored components open from every screen/preset pair; the toolbar Back label and restored target match the exact screen/preset, including previously folded groups. The primary return stays outside scrolling preview content. All statuses/Completed and Read only/Editing component examples pass, as do secondary Back, task selection, edit/cancel/save/shared edits/reset, search/zero results/Clear filters/Open filter, loading/empty/error recovery and the real details sheet.
Representative desktop title, chevron, preset, both reference and toolbar Back actions use pointer clicks. The exhaustive matrix and phone actions mostly use DOM activation of visible, non-hidden controls, not touch hit testing.

| Host viewport | Screen / preview width, A and B | Available inner width |
| ------------- | ------------------------------- | --------------------- |
| 1440 ×1000    | 828px                           | 828px                 |
| 768 ×1000     | 604px                           | 604px                 |
| 390 ×1000     | 242px                           | 242px                 |

Every preview ancestor measures transform none and zoom1. Document width equals viewport width. These are unscaled live DOM measurements; contact-sheet scaling is for inspection only.
Read ten contact sheets covering desktop and390px light/dark screen states, collapsed groups, both actual components, exact toolbar Back and selected normal/hover/focus. Visual judgment: quiet keeps selection near the neutral tree; solid makes it more prominent. Both retain the incumbent dense rows and visible keyboard focus. At390px the toolbar wraps and inspector stacks. The inherited answer bar obstructs lower content. Sheet portals use the host viewport outside prototype scope. Mobile pointer/touch, Safari, physical-device behavior and production mobile Sheet focus are not verified or corrected here.

## Evidence and delivery

Evidence lives in `/tmp/round032-evidence/`. browser-checks.py/browser-results.txt, extra-checks.py/extra-results.txt and contrast-checks.py/contrast-results.txt complete with exit0. behavior.txt, disclosure.json, keyboard.json, extra-proof.json, widths.json, controls.json, selection-geometry.json and scoped tree-a11y JSON retain assertions and measurements. contrast.json and its twelve original captures support the table. inspected-*.png and visual-review.md retain the read render evidence and limits. runtime-errors-final.txt is empty. The first contrast harness attempt compared a decoded boolean with a string; its failed output/log remain separate. Correcting that assertion changed no UI source.
Baseline hashes cover196 existing data files. browser-input-hashes.json captures final rendered data inputs; final-check-inputs.json also covers the shell, scripts and tracked report. The ownership receipt verifies current hashes, all historical sources/metadata except the owned collapse decision, fixtures/tokens, and append-only preservation of the original31 log entries. No early answer is promoted and no033 is started.
This final report is formatted before the four requested checks: pnpm check, root data check, scoped ignored-file Biome and the exact twelve-row contrast-matrix verification. check-exits.json and ownership-receipt.json retain authentic exits, log hashes and final input identity. No full suite or build runs.
Only this tracked report is committed, with hooks enabled. Ignored DESIGN, collapse metadata, new selection library and round032 remain unstaged and already affect the live preview. The new comparison stays draft pending an operator choice. The owned browser is closed; existing5301 remains untouched. No owned process remains running, and nothing is published.
