# Round-045: Rejected phone navigation experiment

The operator selected round-044 A, diagnostics upfront, in dark flip view with no tags or reason. Round-045 then compared a top and bottom Layers / Preview / Inspector switcher in a phone-sized workspace.

The app recorded **None** at `2026-11-02T22:58:53.040Z`, with the reason: "we dont do mobile support at all. ignore it". Neither option is selected. Stop phone exploration and keep future UI rounds desktop-only. This scope correction is recorded in the live DESIGN.md and tracked taste LOCAL.md. No round-046 is created under this request.

## Rejected artifact

Only `rounds/round-045/{a.tsx,b.tsx,round.json}` is added to the live data dir. Both wrappers reuse the frozen draft LabErrorDetailsPreview with round-044 A's upfront diagnostics, focused feedback and chosen tokens. They start Ready and show the same complete fixture in a 640px-high, at most 416px-wide frame. B moves the direct-child pane switcher to the frame bottom; it is not viewport-fixed. CSS changes visual order only, leaving DOM order unchanged. This is not a final reading-order design.

The common wrapper drops inherited desktop overrides so the narrow frame keeps its phone geometry. A shared agent-made adjustment enlarges inherited 25px Inspector tabs to 44px and lets their list grow. That adjustment is part of the rejected experiment, not an accepted rule or production change. Historical rounds and the shared module stay untouched. Keep these files as history; do not promote their layout or touch-target adjustments.

## Verification already run

Lead-owned Chromium checks 16 frame cases across four host viewports, both themes and A/B. All 48 pane cases preserve the intended placement, equal content heights and horizontal fit. Forty-eight Loading/Empty/Error cases retain shared copy, full diagnostics and recovery. All 96 scoped axe audits finish with zero violations and zero incomplete results. Forty-eight recoveries restore three tasks and heading focus.

Four interaction flows across A/B and 1440px/390px hosts pass. Search no-match/clearing and query retention, Caption retention/restoration, folding, pane radio keyboard navigation without host-variant changes, Error retention and independent prototype theme all work. Real scrolling exposes the bottom switcher; the host overlay is unchanged.

The first matrix retained one incomplete Task-header contrast result. Directly scrolling the header into view allows the audit to finish, and the full matrix passes on rerun without suppressing rules. The interaction harness initially used a button selector for the stock theme radios; the corrected semantic selector passes all four flows. Failed logs remain in `browser-first.log` and `interactions-first.log`. None of these results establishes mobile support.

I inspected the final desktop-host comparison captures and phone excerpts before closing the owned browser. Server 5301 remains HTTP200 and is not stopped or restarted. Two desktop-host comparison images document the rejected options; phone excerpts remain local.

All five final commands exit 0: `pnpm check`, `pnpm test` with 36 files and 637 tests, `pnpm build`, and data checks for `.taste-lab` and `examples/demo/.taste-lab`. The existing build chunk-size advisory remains. Explicit Biome and Impeccable checks cover the new wrappers. The lab TypeScript check includes linked prototype files.

All 252 protected files and the original 44-line log prefix remain intact. The app's genuine 045 None append is allowed. QA submits no answer. The data dir now has 257 files. Raw scripts, PNGs and receipts live in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-11/`, using root-disk scratch.

Production is unchanged. This is lead-owned evidence, not independent review, physical-device/Safari testing or whole-app accessibility certification. Existing phone findings are historical, not a roadmap commitment. The draft specimen remains draft, and the PR does not back up ignored prototype files.
