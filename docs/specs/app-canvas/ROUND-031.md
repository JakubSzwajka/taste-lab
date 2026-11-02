# Round-031: manual preset collapse

Round-030 A chose "All but make it collapsible", with no tags, in dark flip view at 2026-11-02T18:03:20.173Z. All groups should start expanded, with independent manual collapse. This is qualified approval. The historical non-collapsible workbench remains draft, as do TaskItem, TaskDetails and ScreenPreset visual styles.

## Live changes

`.taste-lab/library/preset-disclosure-workbench/meta.json` records the exact reason and qualifier. Its source, AllExpanded/SelectedOnly exports and examples remain unchanged.
New draft `.taste-lab/library/preset-collapse-workbench/` copies the AllExpanded baseline into PresetCollapseWorkbench, with SeparateChevron and HeaderToggle examples. Actual ScreenPreset, TaskItem and TaskDetails imports remain unchanged; fixture values stay in examples.tsx.
`.taste-lab/rounds/round-031/{round.json,a.tsx,b.tsx}` uses appCanvas, flip and basedOn030 a. Thin wrappers import the new examples. `.taste-lab/DESIGN.md` closes default visibility and opens entry-title action.

```text
Both: Screens / Task list / Compact, all four groups expanded
      Chevron -> fold only that group; retain preview and local edits
A     Entry title -> first example, preserving manual fold choices
B     Entry title -> fold/unfold only, without selecting
Both: Visible nested preset -> select its actual example
```

Stock SidebarMenuAction, SidebarMenuSub and SidebarMenuSubItem compose the disclosure. Both choices reserve the same chevron space and keep existing labels, ordering, icons and selected-row treatment. Closed submenus are hidden, not merely clipped. React useId gives unique controlled-group IDs; A titles do not falsely advertise disclosure, while B titles expose their state. No nested buttons, custom interactive elements, generated primitive or production changes were added.
Manual choices survive category and preset changes, component inspection/exact Back, layers/focus/inspector toggles and Reset local edits while mounted. No sibling auto-collapse, collapse-all, reload persistence or category auto-selection policy was added. The settled category tabs, nested examples, responsive100%, flat references with brief roles and toolbar Back remain fixed.

## Measured evidence

Dedicated Chromium session round031-worker used existing5301, the primary shell serving worktree data, not a production-branch shell. The brief supplied Operate-mode direction and the lead's loaded context; no new interview, context repair or sibling lane was needed.
Both choices start identically in desktop light/dark with all ten screen preset rows exposed and Task list Compact. Independent chevrons close Task list and Task detail together without changing selection, search input or preview DOM identity. Component groups also fold independently; Reset preserves all manual choices. Category changes alone keep the baseline preview selection.
Pointer and Enter/Space entry-title activation demonstrate the sole difference. Supplementary keyboard checks start from Compact: A opens Default while preserving a closed group; B reveals its group and retains Compact. Tab skips hidden children and reaches visible preset controls with visible focus. Accessibility snapshots exclude folded children. Controls have truthful aria-expanded and resolved IDs, stable across toggles and unique with A/B mounted together; no nested buttons were found.
At1440 and390px, both screens and all ten presets pass via visible nested controls, reopening closed groups through their chevrons first. Both actual components open from every screen/preset pair. Toolbar Back restores the exact screen/preset and prior fold choices even when the selected screen group stays closed. Loading/Empty recovery and Error Retry return Default. Component All statuses/Completed and Read only/Editing examples, secondary Back, edit/cancel/save/shared edits/reset, search/zero results/Clear filters/Open filter, task selection and the actual details sheet pass. Folding during editing does not discard local changes.
Representative desktop title, chevron, preset, both reference and toolbar Back actions pass pointer clicks. Most matrix and phone actions use DOM activation of visible controls, not mobile touch hit testing.

| Host viewport | A / B screen width | Available inner width |
| ------------- | ------------------ | --------------------- |
| 1440 × 1000   | 828 / 828px        | 828px                 |
| 768 × 1000    | 604 / 604px        | 604px                 |
| 390 × 1000    | 242 / 242px        | 242px                 |

Screen/preview widths equal available inner width. Every preview ancestor measures transform none and zoom1; document width equals viewport width. These are live DOM measurements, independent of contact-sheet scaling.
Read ten contact sheets covering both choices at desktop/390 in light/dark, expanded/collapsed groups, bottom rows, actual components and toolbar Back, plus original keyboard captures after activation. Visual judgment: the shared chevron fits the incumbent dense rows; B offers a larger disclosure target while A preserves title navigation. At390px the toolbar wraps and inspector stacks. The inherited answer bar obstructs lower content. Sheet portals use the host viewport outside prototype scope. No mobile pointer/touch, Safari, physical-device or production Sheet focus correction is claimed.
Current scoped tree axe4.12.1 audits retain one light violation per choice: `.bg-primary\/10.text-primary[aria-label="Task detail · Compact"]`, selected=true,12px normal,4.18:1 versus required4.5:1. Dark scoped audits have zero violations. This inherited light contrast remains unresolved by explicit brief direction, not passed or approved. No baseline-browser contrast comparison or full-page accessibility clearance is claimed. The design detector exits0 with `[]`.

## Preservation and receipt

Evidence: `/tmp/round031-evidence/`. browser-checks.py/browser-results.txt and extra-checks.py/extra-results.txt exit0; runtime-errors-final.txt is empty. behavior.txt, disclosure.json, keyboard.json, extra-proof.json, widths.json, controls.json and scoped tree-a11y JSON retain assertions and measurements. inspected-*.png sheets and their source captures retain visual evidence; visual-review.md records judgments and limits. Earlier harness failures are kept separately, not hidden.
Baseline hashes cover190 existing data files. Only DESIGN and the owned historical metadata may change, apart from app-only log appends. Every historical round, source/example, Task component, fixture and token remains byte-identical. Six new ignored files form the collapse library and round031. The original30 taste-log lines remain unchanged; the receipt checks append-only preservation and records any later answer without promoting it.
This report is formatted before the final three checks: pnpm check, root data check and scoped ignored-file Biome. check-exits.json and ownership-receipt.json record their authentic exits, log hashes, final input hashes and current ownership. No full suite or build runs.
Only this tracked report is committed with hooks enabled. Ignored DESIGN, old metadata, new collapse library and round remain unstaged and already affect the live preview. Both collapse examples stay draft pending the operator's header-action choice. Any early answer does not change this delivery or start032. The owned browser is closed; existing5301 is untouched. No owned process remains running and nothing is published.
