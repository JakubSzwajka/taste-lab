# Round-029: inspection return placement

Round-028 B selected Names and roles, with no tags or reason, in dark flip view at 2026-11-02T17:15:04.562Z. Only brief authored role hints in flat Used components rows are promoted. TaskItem, TaskDetails and ScreenPreset styling remains draft.

## Scope and live files

`.taste-lab/library/reference-detail-workbench/meta.json` is agreed for role hints only. It lists WithRoles alone and adds round-028 b provenance with an empty note. Its source and examples remain byte-identical, including NamesOnly for historical 028 A.

The new draft `.taste-lab/library/inspection-return-workbench/` copies WithRoles into `InspectionReturnWorkbench.tsx` with named examples InPreview and InToolbar. Fixture values stay in examples.tsx. It imports unchanged actual TaskItem, TaskDetails and ScreenPreset, retains all four tasks, both screens and all five named presets.

```text
Both start: Task item / All statuses
Return target: Task list / Compact

A  Existing preview toolbar
   Scrolling preview [contextual Back, actual component]

B  Existing preview toolbar [same contextual Back]
   Scrolling preview [actual component]
```

A keeps the primary control at the top of scrolling component content. B moves the same control into the existing toolbar, outside that scroll area. Only placement and resulting flow spacing differ. Assertions compare the label, icon, ghost/small treatment, 28px height and unchanged secondary inspector return. Later inspection remembers the exact screen and named preset just visited.

`.taste-lab/rounds/round-029/{round.json,a.tsx,b.tsx}` uses fixture `appCanvas`, flip preview and `basedOn: round-028 b`. The question and changes explain the starting context. `.taste-lab/DESIGN.md` records the 028 decision, distills screen decisions through 028 and leaves 029 open. Categories, nested presets, responsive fill at 100%, flat references with role hints, source information and inspector placement stay fixed. This does not approve flows, native viewport sizing, zoom or unbuilt inspector/note UI.

## Render and interaction evidence

Dedicated Chromium session `round029-worker` used the existing port 5301 preview. It serves the primary app shell with this worktree's prototype data, not the production branch shell. The exact brief supplied design direction instead of an interview; assessments ran in this lane without delegation. No server was started, stopped or changed.

Both choices passed all ten screen/preset combinations at 1440 × 1000 and 390 × 1000. Each opened actual TaskItem and TaskDetails, then the contextual primary Back restored the exact screen and preset. Loading/Empty recovery and Error Retry restored Default. Both started with all four real TaskItem rows and the Compact return target.

Edit/cancel/save, shared local edits across presets, Reset, zero-result search, Clear filters, Open/All filtering, task selection, real details sheet, Completed/Editing examples, category tabs, focus mode and inspector collapse/reopen passed. The secondary inspector return also restored the exact target. Both actual imports and primary Back were additionally pointer-clicked at desktop in each choice. Tab after the primary Back reached the first task action with visible focus. Browser runtime errors were empty.

| Host viewport | A screen width | B screen width | Available inner width |
| ------------- | -------------- | -------------- | --------------------- |
| 1440 × 1000   | 828px          | 828px          | 828px                 |
| 768 × 1000    | 604px          | 604px          | 604px                 |
| 390 × 1000    | 242px          | 242px          | 242px                 |

Screen and preview widths match available inner width. All preview ancestors have transform `none` and zoom `1`; document width matches host width. The 1440px and 390px light/dark component and details captures were read, along with narrow actual-component, overflow and keyboard captures. B gains content space but adds the return action to the existing toolbar. At 390px its toolbar wraps naturally; the inspector stacks below the preview. No document-width overflow appeared.

### Genuine component scrolling

At 1440 × 900, the normal four-task fixture did not require the long scroll used for this comparison. The existing TaskDetails editing UI received the same 6,510-character title in both choices. Save trimmed its trailing space to 6,509 characters. No fixture, dummy rows, blank space or sizing engine changed. TaskItem then rendered that title. Reset restored the original tasks before normal captures.

| Measurement                         | A: scrolling preview | B: existing toolbar |
| ----------------------------------- | -------------------- | ------------------- |
| Scroll area client / content height | 608 / 2664px         | 603 / 2620px        |
| Preview scrollTop change            | 0 to 400px           | 0 to 400px          |
| Primary Back top before / after     | 106 / -294px         | 54 / 54px           |
| Inside preview scroll container     | Yes                  | No                  |

A's primary Back scrolls out of the preview; B's remains outside that scroll container. This is not mobile viewport fixation. In the 390px host, a 150px document scroll moved each control by 150px, including B. Both are ordinary document content.

Most matrix controls and phone/offscreen actions used DOM activation, not pointer hit testing. The incumbent floating answer bar covers lower content, especially with the wrapped question at 390px. Captures preserve that obstruction. Desktop pointer checks do not prove touch behavior, every lower control's hit area, Safari or physical-device behavior. Portals follow the host viewport.

Scoped axe checks on each primary return control reported zero violations in stable light and dark states. An earlier audit during the theme transition reported 3.51:1 contrast; `transient-contrast.json` retains it. Waiting for actual animations to finish produced the passing rerun. This is not a full-page accessibility audit. The design detector exited 0 with `[]`.

## Checks, preservation and handoff

Evidence is under `/tmp/round029-evidence/`. `browser-checks.py`, `browser-results.txt`, `browser-log.json`, `behavior.txt`, `controls.json`, `widths.json` and `scroll.json` hold assertions and measurements. `extra-checks.py`, `extra-results.txt`, `extra-browser-log.json` and `mobile-document-scroll.json` cover stable audits and mobile document motion. Both scripts exited 0. Representative captures use `{preview,toolbar}-{1440,390}-{component,details}-{light,dark}.png`, `*-390-actual-{item,details}.png`, `*-overflow-{before,after}.png` and `*-keyboard.png`. The dedicated browser is closed.

`baseline-hashes.json` and `unchanged-source.json` preserve historical sources and the log. Of the 178 existing data files, only the two owned decision files change; the other 176, including every historical round, reference source/examples, fixtures, tokens and underlying components, remain byte-identical. The original 28 taste-log lines remain unchanged. The receipt checks append-only preservation again at handoff.

Final checks run after this report is formatted: `pnpm check`, `node bin/taste-lab.mjs check --dir .taste-lab`, and scoped Biome on the new library, reference metadata and round-029. Their logs, exact exits and current file hashes are in `pnpm-check.txt`, `data-check.txt`, `ignored-biome.txt`, `check-exits.json` and `ownership-receipt.json`. No full suite or build runs.

Only this tracked report is committed, with hooks enabled. The owned ignored decision files, new library and round stay unstaged and already affect the live preview. Round-029 remains a draft comparison awaiting the operator's placement choice. No production, CLI, test, demo, historical source, fixture, token or server change is included.
