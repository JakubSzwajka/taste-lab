# Screen Library verification

Implementation reviewed by the lead at `32db63b`. Independent cross-family review is blocked, so this is not a merge recommendation.

## Local commands

All commands ran from the task worktree after the builder finished. Each exited 0.

| Command                                                       | Result                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm check`                                                  | Both TypeScript projects and Biome passed.            |
| `pnpm test`                                                   | 36 files, 627 tests passed.                           |
| `pnpm build`                                                  | Demo built. The bundler reports a chunk above 500 kB. |
| `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab` | Clean.                                                |
| `node bin/taste-lab.mjs check --dir .taste-lab`               | Clean.                                                |

Logs and exit summary: `/tmp/taste-lab-app-canvas-verification/`.

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

Live shared-component source editing and a temporary broken-entry fixture were not exercised in the browser. Existing import links and automated DOM tests cover composition references, unavailable entries and real App route remounts. Physical devices, Safari and a quantitative accessibility audit were not run. The known Compare phone answer-row overflow remains outside scope.

## Review gate

Claude's all-model weekly quota is exhausted. Grok is registered but not allowed by the private team policy. Two attempted Grok review lanes were routed to Codex, detected at launch and immediately stopped as rejected. They produced no accepted review.

The feature still needs the required other-family review. No claim of review approval or irreversible-effects review is made. Native viewport sizing remains a separate round-026 decision. The first increment does not ship flows or a full inspector redesign.
