# Manual testing

## Layout prototype

1. Open the taste preview shown in pi and select round-023. Start in full-width view.
2. Compare each arrangement. Confirm each shows the same task-list, task-detail and edit/save flow content.
3. Select screen frames and try Play. Check which controls are interactive and read any prototype limitations.
4. Pick the clearest arrangement. Submit a reason describing changes you want. Verify the owning session receives the answer and prepares the next round or implementation.

## Implemented canvas

1. Serve the committed demo data dir and open App canvas. Check existing Compare, Library, Theme and History still open.
2. Pan and zoom the overview with pointer and keyboard controls. Fit all screens, then return to 100%. Screen labels remain readable and frames keep their intended viewport sizes.
3. Select Task list. Verify selection does not activate its cards. Enter Play and open a task. Confirm its title and details match the selected fixture item.
4. Open Edit, change a local field, close without saving, reopen and save. Check the documented mock saved state. No backend request is required.
5. Navigate back to the list and exit Play. Selection and the overview remain usable.
6. Open a used component's library entry. Make a temporary change in the task worktree and confirm its screens update. Undo only that temporary change.
7. Try narrow and wide viewports and light and dark mode. Ensure frames scroll where needed and controls have accessible names and visible focus.
8. In a temporary fixture, reference a missing screen and an invalid navigation target. Confirm a readable error appears and the other screens still work. Remove only the temporary fixture.

## Automated checks

Run `pnpm check`, `pnpm test`, `pnpm build`, and `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`. Record exits and unresolved failures in the PR.
