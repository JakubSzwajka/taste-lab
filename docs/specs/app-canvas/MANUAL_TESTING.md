# Manual testing

## Round-024 prototype

1. Open round-024 in the existing taste preview, in full-width view.
2. Compare Screens/Components tabs with Screens/Components grouped in one tree. Confirm the selected screen, fixture content, composition inspector and behavior are the same.
3. Open each screen. Confirm it renders the actual composed components at 100% without first pressing Play. Collapse the inspector or focus the preview if space is limited.
4. Search/filter the task list. Open Edit, change a local field, cancel and reopen. Save an edit and confirm the mock saved state. The same behavior must work in both variants.
5. Inspect the screen's used components. Open a component example, then return to the screen. Check the displayed component matches what the screen uses.
6. Switch screen and component entries using the keyboard. Try light/dark mode and a narrow viewport. Record the known incumbent Compare answer-bar overflow separately.
7. Submit the preferred Library navigation treatment and requested refinements. Verify the owning session receives the answer.

## Round-025 presets

1. Open round-025. Confirm both choices retain Screens/Components category tabs.
2. Compare nested presets in the tree with a preset selector above the preview. Start with the same task-list Default example in each.
3. Switch Default, Compact, Loading, Empty and Error. Confirm Compact changes composition density, state examples show their named state and recovery controls work where shown.
4. Switch to the second screen and to Components. Confirm both kinds of entry expose named examples, not only a label with no effect.
5. From a non-default screen preset, open a Used component example and return. Confirm the screen and preset are restored.
6. Try local filter, edit/cancel/save, reset, inspector collapse and Focus in both variants. Check preset changes do not silently overwrite the original fixture.
7. Confirm the preview remains at 100% in desktop light/dark and at narrow width. Submit the preferred preset placement.

## Chosen production implementation

1. Serve the committed demo and open Library. Existing entries without a category still behave as components, including examples, controls and direct links.
2. Browse Screens and Components using the chosen treatment. Confirm each screen uses actual shared library imports and renders at its intended size.
3. Exercise search/filter, edit, cancel and local save. No backend request is required.
4. Open a used component from a screen and return. Confirm a temporary component change in the task worktree updates its screen usages; undo only that temporary change.
5. Check narrow/wide viewports, light/dark, focus, scrolling and accessible control labels. Verify Compare, Theme and History still work.
6. In a temporary fixture, reference a missing source or broken entry. Confirm a readable local error and keep other entries usable. Remove only the temporary fixture.

## Automated checks

Run `pnpm check`, `pnpm test`, `pnpm build`, and `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab` before the production PR. Record exits and unresolved failures.
