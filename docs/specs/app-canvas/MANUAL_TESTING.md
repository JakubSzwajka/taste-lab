# Manual testing

## Round-024 prototype

1. Open round-024 in the existing taste preview, in full-width view.
2. Compare Screens/Components tabs with Screens/Components grouped in one tree. Confirm the selected screen, fixture content, composition inspector and behavior are the same.
3. Open each screen. Confirm it renders the actual composed components at 100% without first pressing Play. Collapse the inspector or focus the preview if space is limited.
4. Search/filter the task list. Open Edit, change a local field, cancel and reopen. Save an edit and confirm the mock saved state. The same behavior must work in both variants.
5. Inspect the screen's used components. Open a component example, then return to the screen. Check the displayed component matches what the screen uses.
6. Switch screen and component entries using the keyboard. Try light/dark mode and a narrow viewport. Record the known incumbent Compare answer-bar overflow separately.
7. Submit the preferred Library navigation treatment and requested refinements. Verify the owning session receives the answer.

## Chosen production implementation

1. Serve the committed demo and open Library. Existing entries without a category still behave as components, including examples, controls and direct links.
2. Browse Screens and Components using the chosen treatment. Confirm each screen uses actual shared library imports and renders at its intended size.
3. Exercise search/filter, edit, cancel and local save. No backend request is required.
4. Open a used component from a screen and return. Confirm a temporary component change in the task worktree updates its screen usages; undo only that temporary change.
5. Check narrow/wide viewports, light/dark, focus, scrolling and accessible control labels. Verify Compare, Theme and History still work.
6. In a temporary fixture, reference a missing source or broken entry. Confirm a readable local error and keep other entries usable. Remove only the temporary fixture.

## Automated checks

Run `pnpm check`, `pnpm test`, `pnpm build`, and `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab` before the production PR. Record exits and unresolved failures.
