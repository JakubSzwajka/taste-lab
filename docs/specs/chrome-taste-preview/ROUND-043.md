# Round-043: Library feedback placement

Round-042 B selects crisp compact chrome in dark flip view, with no tags or reason. Keep that system. Following round-041's request to handle small refinements without a poll, round-043 asks a broader UX question: should loading, empty and broken previews use inline feedback or a focused recovery panel?

## One comparison, four sample states

A places feedback directly in the canvas flow. B centers the same content inside a bounded stock shadcn Card. Both start in Error and offer Ready, Loading, Empty and Error controls with 44px minimum targets. Messages, actions, fixtures, chosen chrome tokens and geometry are identical. Error details come from the existing broken-entry fixture and appear on separate lines.

```text
Simulated state    Shared action           Result
Loading            Show ready preview     Ready, three tasks
Empty              Reset sample           Ready, three tasks
Error              Open working example   Ready, three tasks
```

Each recovery selects the working Default sample and focuses its heading. Selecting Ready directly keeps focus on the state control. Loading uses three stock Skeleton rows with reduced-motion support. No request, timer, source repair or taste-log POST occurs. Tree selection retains the old breadcrumb-only simulation; these state controls do not implement production entry navigation.

New files live under `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`: `rounds/round-043/{a.tsx,b.tsx,round.json}` and draft `library/lab-feedback-preview/{LabFeedbackPreview.tsx,examples.tsx,meta.json}`. The new specimen copies the frozen chrome baseline rather than changing historical rounds or their shared component. Its standalone Library examples use the canvas theme; judge the chosen palette in the round, where identical overrides apply. DESIGN.md records the open feedback question. No theme.css promotion is included.

## Verification

Lead-owned Chromium checks 16 Ready geometry cases and 64 state cases across 1440×1600, 1024×1100, 768×1024 and 390×844, light/dark and A/B. All 64 scoped axe audits report zero violations and zero incomplete results. Forty-eight explicit recovery checks restore three tasks and focus the Ready heading. State controls remain at least 44px, and all cases fit horizontally. Ready retains the selected compact geometry, real Plex chrome, independent Geist prototype, its tokens and 14px corners.

Keyboard ArrowRight and Enter select Loading; explicit recovery restores heading focus. Library search no-match/clearing, Caption editing/restoration, pointer and keyboard folding, and all three phone panes pass. I inspected final desktop A/B Error, B Loading/Empty/Ready and phone B Error PNGs, then closed the owned browser. Real scrolling exposes the phone recovery action; the host answer overlay is unchanged. Server 5301 was not stopped or restarted.

Failures are retained. `biome-first.log` catches the example export shadowing global Error, fixed by renaming it ErrorPreview. Initial browser diagnostics catch a missing single-select ToggleGroup API, fixed in the new specimen and checked by TypeScript. `browser-first.log` retains one phone table-header contrast check that axe could not finish at its initial scroll position; real scrolling exposes the header and the full matrix then passes without suppressed rules. `interactions-first.log` retains a premature focus assertion; the corrected harness waits for the observable Radix focus move. Shared copy and button alignment were cleaned up without another poll.

All five final commands exit 0: `pnpm check`, `pnpm test` with 36 files and 637 tests, `pnpm build`, and data checks for `.taste-lab` and `examples/demo/.taste-lab`. The existing build chunk-size advisory remains. Exit receipts are saved in `run-09/checks.json`. The lab TypeScript configuration includes the linked new variant and library sources. Explicit Biome and Impeccable checks also cover all six new files.

All 240 protected pre-existing files and the original 42-line taste-log prefix remain intact. QA submits no answer. Scripts, raw measurements, inspected PNGs and logs live in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-09/`. Private root-disk scratch avoids the confirmed `/tmp` quota issue. This is lead-owned proof, not independent review.

## Operator flow and limits

Refresh round-043 in Full width. Compare A/B in Error, then try Loading and Empty and use each recovery action. Use Ready to inspect the unchanged working preview. On a phone, switch between Layers, Preview and Inspector and scroll the canvas as needed. Answer the feedback-placement question in the real answer bar.

Production is unchanged. No asynchronous loading, actual empty data, source repair, backend integration, physical-device or Safari behavior is proved. Whole-app accessibility, a separate numeric hover/focus contrast matrix and the separate production mobile sidebar focus issue remain outside this check. The draft feedback specimen is not an agreed production component. The PR includes this report, not ignored prototype assets.
