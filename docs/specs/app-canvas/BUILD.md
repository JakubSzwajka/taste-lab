# First screen-library increment

Round-024 A selects Screens/Components tabs. Round-025 A keeps named examples nested under each entry. Production reuses the existing Library routes, examples/args, controls and preferences. The implementation is independently authored; no Doop source is included.

## Behavior

Optional `kind` defaults to component without rewriting old metadata. Optional `uses` lists authored library names. Invalid kinds and unsafe, duplicate or self-referential uses fail shared validation. CLI JSON adds kind while preserving status filters and exit codes; malformed values are not silently called components.

Direct hashes select a known entry's category. Category switching opens an available matching entry or a scoped empty state. Broken entries stay reachable in both categories and retain the selected category when opened. All Library routes share one sidebar instance, so consecutive arrow-key category switches keep tab focus. Mobile closes its sidebar sheet on a category or entry/example pick.

Screens fill available width at 100%, without a component column clamp, transforms, zoom or Play. Components retain both width choices. Canvas theme/background isolation and the bottom resizable Controls panel are unchanged.

Used components checks referenced modules and exports before offering links. Missing/broken references stay locally unavailable. Back to screen restores the exact screen and example across production route remounts, including entry through `#/library`. The return address is in memory and does not survive reload. Remounting an example resets local edits and control values.

## Demo and limits

The committed task-list-screen and task-detail-screen are drafts. Both import the unchanged agreed TaskCard and a draft TaskEditor. Default/Compact use the full fixture. Search/filter, local save, cancel, reset and explicit state recovery work without a backend. Search and filter changes clear the previous save message so the live status reports the current result count. Only examples import fixture values.

The running root data only changes task-views and screen-preset metadata: screen kind and actual task-item/task-details uses. These two ignored files remain unstaged and take effect through the existing preview. No taste log, historical round or agreed source changes.

Round-026 A selects the current responsive fill sizing. No native viewport engine, flow editor, full inspector redesign, automatic dependency discovery or comments transport ships. The incumbent Compare phone answer-row overflow is outside this change.

## Test map

- `tests/screen-library.test.ts`: optional kind and authored uses schema.
- `tests/library-cli.test.ts`: additive kind output, malformed values, status filters and exit codes.
- `tests/screen-library-dom.test.tsx`: production App hash routes, browser Back, exact inspection return, broken-entry category retention, consecutive keyboard category switches, nested examples, scoped empty state, full-width screen, unavailable references and mobile sheet closure/focus.
- `tests/screen-library-demo.test.tsx`: full fixture, search/filter, edit/cancel/save/reset, result counts after saving then searching/filtering, fixture immutability and state recovery for both screens.
- Existing `tests/library*`: legacy examples/args, controls, widths, theme and panel/sidebar preferences.

Before handoff: run `pnpm check`, both data-dir checks and focused library/screen-library tests after the final docs edit. The lead owns the full suite, build and browser acceptance in MANUAL_TESTING.md. No prove skill exists. No server is started or stopped, and no migration or network write is required.
