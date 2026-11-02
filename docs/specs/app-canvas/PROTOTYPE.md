# App canvas prototype

Open **round-023** in the worktree's local taste preview, in full-width flip mode. It builds on round-022 c. This is a layout decision, not a production canvas implementation. No Doop source was used.

## Layout question

| Pick | Arrangement                                                                    | What to judge                                                                     |
| ---- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| A    | Persistent layers on the left, four-screen overview, fixed right inspector     | Does keeping screen structure and navigation visible justify the narrower canvas? |
| B    | Full-width overview with a hideable inspector dock below                       | Is the extra canvas space worth losing the permanent screen tree?                 |
| C    | Connected thumbnail strip above one full-size selected screen, inspector below | Does following the flow help more than seeing large screens together?             |

All three use the same four mock tasks and the same list, detail, edit and saved screen compositions. The incumbent theme, agreed AppHeader and Logo stay unchanged. Narrow previews hide the repeated header and persistent panels. The inspector remains available through its toolbar button.

## Try it

Scroll the lab page until the prototype toolbar is near the top. Scroll inside the overview to reach its remaining frames.

1. Select a frame, its label, a layers row in A, or a thumbnail in C. Overview content is inert, so selecting cannot open a task by accident.
2. Press Play. Open any task in the list and check that its detail matches.
3. Open Edit task. Change Title or Description. Cancel or Escape discards the draft; reopening starts from the saved task.
4. Save changes. The saved state confirms the mock save. Return to the list to see the changed title.
5. Exit Play to return to the selected screen. Reset clears edits, returns to the list and restores the compact frame preset.

A and B offer static 50% and 75% frame presets at wider preview widths. Overview frames keep a 640 × 560 source viewport. C uses 25% thumbnails and an unscaled focused preview. Standard button keyboard activation and the stock Sheet focus trap work. There are no custom canvas shortcuts.

## Shared local files

The root `.taste-lab` is ignored by Git. These files are already read by the running preview; preserve them in this worktree for the operator's answer.

- `.taste-lab/fixtures/app-canvas.ts` and the updated `fixtures/index.ts` provide `appCanvas`, its types and fixture registration.
- `.taste-lab/rounds/round-023/` contains `round.json` and the A/B/C wrappers.
- `.taste-lab/library/app-canvas/` contains the shared workspace and its three examples.
- `.taste-lab/library/task-screen/` contains the shared connected screens and four state examples.
- `.taste-lab/library/task-item/` contains the task summary used by the list.

Each new library folder has its component, `examples.tsx` and `meta.json`. All three entries are **draft**, with no claimed winning provenance. Variants import AppCanvas; AppCanvas imports TaskScreen and the agreed AppHeader; TaskScreen imports TaskItem. Fixture values enter through props, not library component imports.

## Limits

This prototype has scrollable static arrangements, not an infinite canvas. Free pan, pointer zoom, fit-to-content, movable frames and editable connectors are deferred. Arrows and inspector destinations describe authored navigation, not an automatic dependency graph. The in-frame edit preview is a static composition; Play opens the real stock Sheet, which portals outside the prototype scope and uses lab chrome tokens.

All changes stay in React memory until Reset or reload. There is no backend, persistence, agent-note transport, source editor or production App canvas route. The repeated AppHeader is inert layout context; the outer lab header still provides real navigation and theme switching. Missing-source and invalid-target recovery need production fixtures and tests. No library entry is agreed yet.

At **390 × 844**, the incumbent Compare answer row is about **395px** wide and the document scroll width is **453px**. The prototype itself stays at **268px**, within x=61..329, and confines wide frames to inner scrolling. The answer bar also takes much of the phone viewport. No `src/` changes were made to fix this existing Compare limitation. Judge the desktop arrangements first; production narrow-width acceptance remains separate.

## Evidence

Evidence is local at `.taste-lab/evidence/round-023/`:

- `browser-checks.log` records 53 passing assertions across all three arrangements. List-to-detail, cancel, Escape/reopen, empty-title prevention, both edited fields, save/return, reset, frame presets, inspector toggling and phone sheet focus passed. The browser reported no uncaught errors.
- `{panels,canvas,flow}-desktop-{light,dark}.png` capture 1440 × 1100 renders. `{panels,canvas,flow}-phone-light.png` capture 390 × 844 renders. `phone-edit-sheet.png` shows the stock Sheet with keyboard focus. Captures were opened and reviewed; frames below the overview edge require scrolling.
- Token contrast sampled in Chromium, light/dark: foreground on background 18.28/17.25, muted text on sidebar 5.57/7.28, primary button 4.91/8.41. These samples do not constitute a full accessibility audit.

`node bin/taste-lab.mjs check --dir .taste-lab` and `pnpm check` pass with exit 0. An additional Biome check including the ignored new files passes. The Impeccable detector reports `[]`, exit 0. Draft library listing reports no problems for its three entries. The full test suite and build were not run in this lane.

## Next increment

Read the round-023 pick and reason before choosing an arrangement. Then define the file-authored app/screen/navigation contract and implement the chosen workspace as an opt-in view beside Library. Keep these shared task screens as the first connected example. Add real pan/zoom and fit-to-content with keyboard controls, then missing-source/target fixtures and the production manual acceptance flow. Promote drafts only after the operator agrees.
