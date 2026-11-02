# First Library implementation

## Goal

Implement the selected Screens/Components category tabs and nested named examples using the existing library contract.

## Decisions

- Round-024 A selects category tabs. Round-025 A selects examples nested under each entry.
- Screens are actual interactive compositions, rendered at 100%. Examples cover layouts and states using existing named exports, controls and args.
- Keep current hash routes and all component controls, panel state, canvas theme and background behavior.
- Round-026 viewport sizing is a separate refinement. Until chosen, screens use full available width without scaling. Do not implement a canvas or new app manifest.
- The first increment adds a small authored composition area and return action. It does not move the existing resizable Controls panel, implement agent notes or claim the complete earlier Figma-inspector redesign has shipped.

## Metadata interface

Add optional `kind: "component" | "screen"` to `LibraryMeta`. Omission means component. Reject any other present value. Keep raw optional metadata backward compatible rather than rewriting old files.

Add optional `uses: string[]` for authored references to other library entry names. Validate array, nonempty safe kebab-case names, duplicates and self-reference. A referenced entry may itself be a composition. This is not runtime dependency discovery. Missing or broken referenced entries show a readable local unavailable state rather than a dead navigation link or a crash. Do not claim static checking of arbitrary runtime navigation.

The existing `examples`, `args`, `controls`, import allowlist and no-inline-style rules apply equally to screens. Do not create another preset format.

Expose additive kind information in CLI JSON listings. Existing status filters and exit codes remain unchanged. `taste-lab check` uses the shared metadata validator.

## Browsing and preview

- Add accessible Screens/Components tabs in the Library sidebar. Keep named examples nested, collapse/expand, draft/broken status and mobile sheet behavior.
- A direct entry/example route selects its category. Category switching opens an available entry or shows a scoped empty state. Broken entries whose kind cannot be trusted remain reachable in both categories. Never hide the only way to inspect an error.
- Screen previews use full available width and normal CSS pixels, no column clamp, zoom, transform or Play gate. Do not change component width controls. Theme/surface isolation and error boundaries remain intact.
- A screen's Used components area opens the actual referenced entry's example. Back to screen restores the exact screen and named example. Test return across real route remounts, including when starting at `#/library`.
- Clearly label composition references as authored. Avoid introducing another full sidebar or a large dependency-management abstraction.

## Committed demo

Add two draft screen entries under `examples/demo/.taste-lab/library/`, each with Default, Compact, Loading, Empty and Error examples. Use the existing agreed TaskCard through its library import. A small shared draft TaskEditor may be added for actual edit/cancel/save behavior. Screens take fixture data through props; only examples import fixture values.

Use the full fixture in Default/Compact, with search/filter and local edits. Loading, Empty and Error are deliberate examples with useful recovery where offered, not backend requests. Never mutate imported fixtures. Preserve the source and status of existing agreed demo components.

For the running local preview, classify the existing `task-views` and `screen-preset` metadata as screens and add their actual task-item/task-details composition references. Do not change their source or historical round behavior. This exposes the feature through the actual Library page as well as the committed demo.

## Tests and acceptance

- Metadata omitted/valid/invalid kind; malformed, duplicate, unsafe, self-referential and missing/broken uses cases.
- CLI kind output and errors; legacy metadata and status filters unchanged.
- Accessible category switching, scoped empty states, broken-entry visibility, nested named examples, direct routes and browser Back.
- Full-width unscaled screen rendering, unchanged component widths and existing controls/args/prefs.
- Used components and exact screen/example return across route remounts.
- Demo metadata/scanner/type checks and actual local search/filter/edit/cancel/save/recovery behavior.

Run focused tests while building. The lead runs the full suite with a saved log, plus independent review and browser acceptance before the PR. Before handoff, run `pnpm check` after the final documentation edit and validate both data dirs. A report claiming success never overrides a failed receipt.

## Human acceptance

Use the selected-production flow in `MANUAL_TESTING.md`. Record the narrower first-increment scope, no prove skill if absent, and the known Compare phone overflow separately. No irreversible data migration or network side effect is required.
