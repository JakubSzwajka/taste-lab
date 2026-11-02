# Round-024: screens and components

Question: "How should the Library separate Screens and Components: category tabs or groups in one tree?"

A uses category tabs. B keeps both categories in one grouped tree. Everything outside that navigation branch is shared, including the initial Task list selection, all four `appCanvas.tasks`, inspector and interactions. `basedOn` is round-023 / mix; preview is flip; level is layout.

## New files

All prototype entries remain draft. No existing source or metadata changed.

```text
.taste-lab/rounds/round-024/round.json
.taste-lab/rounds/round-024/a.tsx
.taste-lab/rounds/round-024/b.tsx
.taste-lab/library/screen-workbench/ScreenWorkbench.tsx
.taste-lab/library/screen-workbench/examples.tsx
.taste-lab/library/screen-workbench/meta.json
.taste-lab/library/task-views/TaskViews.tsx
.taste-lab/library/task-views/examples.tsx
.taste-lab/library/task-views/meta.json
.taste-lab/library/task-details/TaskDetails.tsx
.taste-lab/library/task-details/examples.tsx
.taste-lab/library/task-details/meta.json
```

`TaskViews` composes the unchanged `TaskItem` import and the new `TaskDetails` import into two screens. Task list has search, All/Open filtering and a details/edit sheet. Task detail shows every task beside the selected task's details, stacking at narrower widths. The inspector's explicitly authored Used components list opens those imports' working examples. Back to screen returns to the prior screen category and entry.

## Browser evidence

Checked through the existing loopback preview on port 5301, using an isolated agent-browser session. The session is now closed. Screenshots and logs are in `/tmp/taste-lab-round-024/`.

- Desktop, 1440 × 1100: `a-light.png`, `a-dark.png`, `b-light.png`, `b-dark.png`. Both variants render the full fixture immediately. No Play gate or copied lab header.
- Screen and component browsing: `a-detail.png`, `a-component.png`; `final-interactions.log` records keyboard screen/component selection, Used components/back and reset. Both category treatments and every listed entry worked.
- Search Maya returns two tasks; Open reduces that to one. An unmatched query shows Clear filters, which restores all four tasks. Checked in both variants.
- Edit/cancel restores the original title on reopen. Save updates the task row and shows local confirmation in both variants. Keyboard-clearing Title disables Save. `a-interactions.log`, `b-interactions.log`, `a-edit-saved.png`, `b-edit-saved.png`.
- Narrow, 390 × 844: `a-narrow-navigation.png`, `b-narrow-navigation.png`, `a-narrow.png`, `b-narrow-edit.png`. Category browsing, focus and phone sheet save worked. Inspector collapse and Focus provide more room.
- `geometry.log` and `narrow-geometry.log`: visual scale 1, no transformed/zoomed preview ancestors, 14px task text at both widths, no horizontal preview overflow. Desktop preview width is 826px with inspector, 1066px collapsed and 1274px focused. Narrow preview width is 240px within incumbent Compare padding.
- `contrast.log`: task title/card contrast 18.80 light and 16.16 dark; metadata/card 5.99 light and 7.28 dark. No uncaught browser errors were reported.

## Checks

All final commands exited 0:

- `node bin/taste-lab.mjs check --dir .taste-lab`: data dir clean.
- `pnpm check`: both type checks and repository Biome check passed.
- Explicit ignored-file Biome command below: all 12 new files checked, no fixes pending.
- Impeccable detector on new UI sources: no findings, `detector.json` is `[]`.
- SHA-256 comparison of taste log, round-023 and its shared entries: all unchanged, `preserved.log`.

```sh
pnpm exec biome check --vcs-use-ignore-file=false \
  .taste-lab/library/task-details .taste-lab/library/task-views \
  .taste-lab/library/screen-workbench .taste-lab/rounds/round-024
```

No full test suite or build ran, as scoped.

## Limits and recommendation

These are local compositions, not a production category schema or automatic dependency scanner. Saves are memory-only. Browsing away remounts screen-local filters and selection; saved task data stays until Reset or reload. Sheet portals inherit lab chrome tokens, an existing lab limitation. Flows and canvas remain deferred.

At 390px, the incumbent Compare pick row reaches beyond its inner reason box. The page itself stays 390px wide. This separate answer-bar issue was not changed. Compare padding also limits available phone preview width; content wraps at 100% rather than shrinking.

I recommend B. Keeping both categories visible makes the screen-to-component relationship easier to follow without a category switch. A offers stronger separation and a shorter layer list. This is a recommendation, not an operator pick. The brief supplied the product and visual direction; no new brand decisions were inferred.

The ignored prototype files are already live from disk in this worktree. Preserve them for the operator's round-024 answer; none were force-added or promoted.
