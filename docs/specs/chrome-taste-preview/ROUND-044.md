# Round-044: Error information disclosure

Round-043 B selects a focused feedback panel. Round-044 keeps that panel and compares diagnostics upfront with an overview plus a Diagnostics tab. The app recorded A in dark flip view at `2026-11-02T22:40:57.136Z`, with no tags or reason.

## The comparison

A shows a shared plain-language overview and both broken-fixture messages together. B starts on Overview and reveals the same messages through Diagnostics (2). Both use stock shadcn primitives, identical compact chrome and a recovery action outside the error tabs. The state selector still offers Ready, Loading, Empty and Error. Explicit recovery restores three tasks and focuses the working sample heading; selecting Ready directly keeps radio focus.

The six new files are `rounds/round-044/{a.tsx,b.tsx,round.json}` and draft `library/lab-error-details-preview/{LabErrorDetailsPreview.tsx,examples.tsx,meta.json}` under the live data dir. The specimen copies the frozen feedback module, leaving historical rounds untouched. DESIGN.md distills rounds 039–043. No production or theme.css change is included.

## Verification

Lead-owned Chromium checks 16 Ready geometry cases and 64 state cases across 1440×1600, 1024×1100, 768×1024 and 390×844, both themes and A/B. Eight additional B cases check deferred diagnostics, complete message equality with A, keyboard tab selection and recovery. All 72 scoped axe audits report zero violations and zero incomplete results. Fifty-six recovery checks restore three tasks and heading focus.

Error tabs are at least 44px tall and their labels fit at 390px. Recovery stays outside the error-information Tabs. Search no-match and real keyboard clearing, Caption editing/restoration, pointer and keyboard folding, and all phone panes pass. Ready retains Plex chrome, an independent Geist prototype and 14px prototype corners. I inspected desktop A, B Overview, B Diagnostics and phone B Diagnostics captures. The owned browser is closed; server 5301 is not stopped or restarted.

The additional harness initially matched the host Tabs ancestor instead of the error-information Tabs. A rerun also needed to reset the simulated state before asserting the default tab. Both failed transcripts remain in `diagnostics-first.log` and `diagnostics-second.log`; corrected assertions pass without changing the specimen or suppressing audits.

All five final commands exit 0: `pnpm check`, `pnpm test` with 36 files and 637 tests, `pnpm build`, and data checks for `.taste-lab` and `examples/demo/.taste-lab`. The existing build chunk-size advisory remains. Explicit Biome and Impeccable checks cover the six ignored source files. The lab TypeScript check includes those linked files.

All 246 protected files and the original 43-line log prefix remain intact. The app's genuine 044A append is allowed; QA submits no answer. Raw measurements, scripts, PNGs and command receipts live in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-10/`, using private root-disk scratch rather than the quota-limited /tmp.

## Operator flow and limits

Refresh round-044 in Full width. A shows all diagnostics immediately. On B, switch Overview and Diagnostics, then use Open working example. Try the other simulated states and recover. This is lead-owned proof, not independent review, whole-app accessibility certification, physical-device or Safari testing.

No real request, source repair or backend recovery is implemented. The draft specimen is not an agreed production component. Production mobile sidebar focus and a separate numeric hover/focus contrast matrix remain outside this check. This PR contains the report, not the ignored prototype files.
