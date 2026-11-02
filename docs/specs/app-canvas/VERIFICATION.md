# Screen Library verification

Production verification covers the initial `32db63b` implementation and corrective commits `1983bbc` and `a790081`. Both corrective lanes passed all four requested checks with authentic, ownership-clean receipts. Targeted review confirms all four reported regressions are fixed. An incumbent mobile focus defect remains unresolved after the two-round limit, so the PR stays draft. This is not a merge recommendation.

## Local commands

The initial commands below ran from the task worktree after the first builder finished. Each exited 0. These are initial counts, not post-correction results.

| Command                                                       | Result                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm check`                                                  | Both TypeScript projects and Biome passed.            |
| `pnpm test`                                                   | 36 files, 627 tests passed.                           |
| `pnpm build`                                                  | Demo built. The bundler reports a chunk above 500 kB. |
| `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab` | Clean.                                                |
| `node bin/taste-lab.mjs check --dir .taste-lab`               | Clean.                                                |

Initial logs and exit summary: `/tmp/taste-lab-app-canvas-verification/`. Corrective round 1 passed 178 focused tests; round 2 passed 180 across ten files. Red regressions failed before their fixes. Their logs are `/tmp/screen-library-round{1,2}-*.log`.

The final full check, test, build and both data checks run after this report edit, without prototype writers. Current exits and decisive output are saved under `/tmp/taste-lab-app-canvas-verification/run-final/`. Consult those receipts rather than treating the initial counts as final.

## Lead browser acceptance

No prove skill exists. The lead used an isolated agent-browser session with headless Chromium. The existing taste server loads the primary checkout's app shell, so production checks used a separate task-worktree demo server. That temporary server and browser were closed afterward. The operator's existing taste preview was not restarted or stopped.

Evidence folder: `~/.pi/agent/proof/taste-lab/feat-app-canvas/run-01/`.

| Flow                                   | Outcome                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct screen routes and named presets | Both draft screens expose Default, Compact, Loading, Empty and Error. Each state recovered to the full nine-task fixture where recovery is offered.      |
| Filtering and local editing            | List search, clear filters, Open filter, cancel, save and reset passed. Open shows eight of nine tasks. Detail local edit/save passed.                   |
| Composition navigation                 | Task list / Compact opened the actual TaskCard entry. Back to screen restored the exact screen and preset. Browser Back restored Task detail / Compact.  |
| Existing components                    | TaskCard retained Components classification and Column 420 / Full width. Measured widths were 420 and 1120 CSS pixels at a 1440px host.                  |
| Unscaled screen rendering              | Screen and canvas both measured 1184px at the desktop host. At a 390px host, screen and document both measured 390px. Transform was none and zoom was 1. |
| Mobile navigation and keyboard         | The sidebar sheet closed after an example pick. Category switching worked. ArrowLeft from Components selected Screens on desktop.                        |
| Controls and themes                    | Compact args reached the checkbox. Controls collapsed and reopened. Light and dark canvas captures were inspected.                                       |
| Other pages                            | Compare, Theme and History rendered without alert errors. No taste answer was submitted.                                                                 |

The browser script needed two harness corrections: eval variables must not be redeclared at the top level, and semantic `find` does not support `focus`. The original transcripts remain next to successful retries. Neither was an app failure.

### Corrective follow-up

Run-02 used the task-worktree app with a private demo copy on port 5327. Temporary fixtures and component edits never changed tracked source. Evidence and retained harness failures are in `~/.pi/agent/proof/taste-lab/feat-app-canvas/run-02/README.md`.

- Consecutive desktop category arrows keep the selected tab focused without refocusing between switches. This passed again after round 2.
- Opening a broken entry retains Screens. A category containing only that broken entry also stays selected and shows its error pane. Missing/broken authored references remain local while all nine tasks render.
- Save followed by search or Open filtering shows the new counts on both screens, not a stale Saved message.
- The Library breadcrumb opens the global first screen and Default, even after inspecting TaskCard. The temporary alphabetically first screen fixture was loaded in a fresh QA process; live new-entry discovery was not verified.
- A temporary TaskCard source attribute hot-updated nine list cards, one detail card and nine standalone cards. Its source was restored byte-for-byte. Exact return to Task detail / Compact passed with a rendered-content wait.
- Mobile category navigation closes the sheet with no document overflow. It fails automatic focus restoration: focus stays on BODY instead of the toolbar trigger, including after a 25-second wait. The DOM test's explicit `focus()` does not prove restoration.

Empty-string browser fill, a missing `/Default` URL suffix, a mistaken button locator for the Back link and hash-only waits needed harness corrections. Successful retries and original failures remain in the proof folder. The extra QA browser and both owned QA server processes are closed. Port 5301 remained untouched.

Physical devices, Safari and a quantitative full-page accessibility audit were not run. The prototype designer's scoped stable axe checks are not a production audit. The known Compare phone answer-row overflow remains outside scope.

## Review gate

Claude's all-model weekly quota is exhausted. Grok is registered but not allowed by the private team policy. Two attempted Grok review lanes were routed to Codex, detected at launch and immediately stopped as rejected. They produced no accepted review.

The operator then instructed "use codex and gpt". Read-only reviews by GPT-6.1 Sol and GPT-6 Astra completed with authentic, clean receipts. This is same-family review by request, not a cross-family pass.

Combined feedback for corrective round 1:

- Blocker: opening a broken entry from Screens resets the category to Components across the keyed App route remount.
- Should fix: switching category unmounts the focused tab. Consecutive arrow-key category switches lose focus.
- Note: a saved-message status hides changing result counts after filtering. Clear the stale message or show counts separately.

Both reviewers found no standards violations in their assigned areas. Their irreversible-effects assessment identifies reversible source/demo changes and additive metadata, with no migration or external write. Reverting code does not undo discarded local edits or remove ignored prototype data.

Corrective round 1 fixes those three findings. Re-review found a new Library index-route blocker; corrective round 2 fixes it without remounting the sidebar. Final GPT-6 Astra review confirms no new blocker and no standards findings. It identifies an incumbent mobile focus SHOULD FIX and a manual-focus coverage NOTE. The stock Sidebar lacks a registered SheetTrigger and the toolbar trigger sits inside the keyed workbench. Source history predates this feature; no baseline browser comparison was run. No third corrective round was started. These unresolved findings remain in the draft PR.

Round-026 A settles responsive fill at 100%. Round-027 A selects flat authored references; round-028 B keeps brief role hints. The latter picks are scoped prototype decisions, not approval of underlying component styles or expansion of this production increment. Native viewport presets were not selected. The first increment does not ship flows or a full inspector redesign.
