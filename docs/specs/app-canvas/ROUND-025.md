# Round-025: named screen presets

Round-024 A settled Screens/Components category tabs. This round changes only where named examples are selected. A nests them beneath each entry; B uses a shadcn radio menu above the preview. Both start on Task list / Default in full-width comparison and use the same component, data, catalog and interactions.

## Files in effect

The ignored prototype files are live in the existing preview, without a restart:

- `.taste-lab/rounds/round-025/{round.json,a.tsx,b.tsx}`
- `.taste-lab/library/preset-workbench/{PresetWorkbench.tsx,examples.tsx,meta.json}`
- `.taste-lab/library/screen-preset/{ScreenPreset.tsx,examples.tsx,meta.json}`
- `.taste-lab/DESIGN.md`, with a short cited addition for round-023 and round-024 A.

Both new entries remain draft. Only `examples.tsx` imports fixture values. Workbench data and its example catalog enter through props. The standalone screen entry also exposes ten named examples through existing metadata `examples`/`args` and screen/preset controls. No production schema is added. ScreenPreset imports the unchanged TaskItem and TaskDetails components; it extends the earlier TaskViews composition without modifying it.

## What the examples render

| Preset  | Task list                                                                    | Task detail                                                            |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Default | Roomy task rows, search and All/Open filter; each row opens editable details | Task rail beside editable selected details, stacked when narrow        |
| Compact | 8px row padding instead of 16px, no avatar, two columns when space permits   | Dense task rail with a narrower share of the available width           |
| Loading | Stock Skeleton blocks under the real screen header                           | The same shell with a task-details loading message and Skeleton blocks |
| Empty   | No tasks yet, with Show default                                              | No task selected, with Show default                                    |
| Error   | Could not load tasks, with Retry                                             | Same explicit local failure and Retry                                  |

Show default and Retry select Default. Loading is deliberately held until Show default, with no timer or backend request. Task item has All statuses and Completed examples; Task details has Read only and Editing examples. Completed renders only the completed fixture task. Editing opens the actual edit form.

Local saves replace task objects in workbench state. Preset switches preserve those local edits but remount filters and forms; Reset restores copies of the fixture tasks and clears open forms/filters. Used components opens the real component example. Back restores both the preceding screen and its preset, including Task detail / Compact.

## Verification

- Data-dir check: exit 0, `taste-lab check: .../.taste-lab is clean`.
- `pnpm check`: exit 0. Both TypeScript projects passed; Biome checked 171 files, including this report.
- Explicit ignored-file Biome: exit 0, 9 files checked, no fixes or diagnostics in the final pass. Command: `pnpm exec biome check --vcs-use-ignore-file=false .taste-lab/library/screen-preset .taste-lab/library/preset-workbench .taste-lab/rounds/round-025`.
- SHA-256 verification: exit 0. Taste log, all round-024 files, and all files in screen-workbench, task-views, task-item and task-details match their pre-edit hashes.
- Browser assertions passed for both variants: every preset on both screens, all state recovery actions, Default/Compact search and Open filter, edit/cancel/save/reset, category browsing, Completed and Editing component examples, Used components/back restoration, inspector collapse, Focus and no transform/zoom scaling.
- Measured desktop Compact rows: 8px padding and 82px content height, versus Default 16px and 98px. Desktop compact list used two 397px columns with panels open.
- Desktop dark checked at 1440 × 1100. Light checked at 1440 × 1100 and 390 × 844. Narrow focused previews measured 242px outer width, 240px client/scroll width, transform `none`, zoom `1` in both variants. Text wraps and the task list scrolls rather than shrinking.
- B's menu exposes checked `menuitemradio` semantics. Focusing Compact and pressing Enter selected its real layout. Browser runtime error output was empty.

Evidence is local at `/tmp/round025-evidence/`: `checks.txt` records final command exit codes, `runtime-errors.txt` is empty, `browser-checks.txt` contains action output and assertions, `check.py` the focused interaction script, `a-dark-desktop.png`, `a-compact-dark-desktop.png`, `b-dark-desktop.png`, `b-light-desktop.png`, `a-light-narrow.png`, and `b-light-narrow.png` contain captures. Earlier failed automation attempts remain in the action log: menu-animation timing, hidden-variant input targeting, and controls covered by the incumbent answer bar were resolved by waiting, scoped selectors and scrolling. They were not app runtime errors.

## Limits

This is an authored example catalog and import list, not dependency discovery. No flows, canvas, Play gate, production route or backend is added. Existing overlay theme/portal limits remain. The incumbent Compare answer bar overlaps lower controls until the page is scrolled, especially on a phone; its phone answer-row overflow is unchanged. Narrow captures verify responsive Default content in Focus, not an exhaustive phone preset matrix. Standalone metadata/args examples pass the validator but were not separately exercised through the Library route. No full test suite or build was run. The lead-owned server was neither started nor stopped.
