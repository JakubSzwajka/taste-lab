# Round-046: Desktop workspace resizing

Round-045 rejects mobile support. Round-046 returns to desktop and compares fixed panels with draggable dividers, both starting at the selected 256px Layers and Inspector widths. The app recorded A, Fixed workspace, in dark flip view at `2026-11-02T23:13:46.168Z`, with no tags or reason. DESIGN.md records fixed panels; no round-047 is created under this request.

## The comparison

A keeps the chosen three-column grid. B uses stock shadcn ResizablePanelGroup, Panel and Handle primitives. Side panels stop at 224px and the canvas at 320px. B preserves side-panel pixel widths when the host resizes; re-entering Library resets the starting layout. No reload persistence is implemented. Its two divider rails take 2px from the canvas compared with A.

Both variants retain compact spacing, real Plex chrome, the independent Geist task prototype and round-044 A's upfront diagnostics in a focused panel. Ready, Loading, Empty and Error remain local simulations. Recovery restores all three tasks and focuses their heading. Other sample pages do not gain resize controls.

New ignored files are `rounds/round-046/{a.tsx,b.tsx,round.json}` and draft `library/lab-resizable-preview/{LabResizablePreview.tsx,examples.tsx,meta.json}`. The specimen copies the frozen error-information module and shares its pane JSX between layout branches. Explicit pane attributes replace positional styling selectors, so wrapping panes cannot change Inspector or tree spacing. Semantic grip colors make the dividers visible. Historical sources, generated primitives and production remain untouched.

## Verification

Lead-owned Chromium checks 12 geometry cases and 48 state cases across 1024×1100, 1440×1600 and 1920×1200, both themes and A/B. Chosen sizes, colors, font isolation, full-height sidebars and horizontal fit pass. Thirty-six standard recoveries restore three tasks and heading focus.

Six B resize flows test both pointer dividers and both keyboard dividers, minimum side widths, the 320px canvas limit and layout reset. Twelve additional audits cover constrained Ready and Error states; six additional Error recoveries pass. Twelve Compare/Theme/History cases verify identical A/B content and no stray resize handles. All 72 scoped axe audits finish with zero violations and zero incomplete results. Search no-match and real keyboard clearing, Caption restoration, and pointer plus Tab/Enter folding also pass.

Failures are retained in `resizing-first.log`, `resizing-second.log` and `resizing-third.log`. The harness first needed integer pointer coordinates and explicit focus. Keyboard testing then exposed a real host collision: separator arrows also flipped the outer variant. A local key boundary in the new specimen lets the stock separator handle its keys without reaching the host. Production key handling is unchanged. Full reruns pass.

PNG inspection caught a separate visual regression: B's Layers background stopped at the tree instead of filling the panel. The new aside now fills its height and uses the stock divider instead of a duplicate border. A/B height assertions cover this regression; the full current-source matrix, resize flows and page checks pass again.

I inspected final A/B Ready, B dragged and B constrained Error images. The owned browser is closed. Server 5301 remains HTTP200 and is never stopped or restarted. Real scrolling keeps the existing host answer overlay intact.

All five final commands exit 0: `pnpm check`, `pnpm test` with 36 files and 637 tests, `pnpm build`, and data checks for `.taste-lab` and `examples/demo/.taste-lab`. The existing chunk-size advisory remains. Explicit Biome and Impeccable checks cover all six new files; the lab TypeScript check includes linked prototype sources.

All 255 protected files and the original 45-line log prefix remain intact. The app's genuine 046A append is allowed; QA submits no taste answer. The data dir has 263 files. Scripts, inspected PNGs, measurements and exit receipts live in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-12/`, using private root-disk scratch.

## Scope and limits

This is desktop-only proof, not independent review or whole-app accessibility certification. Physical-device/Safari testing and a separate numeric hover/focus contrast matrix are not included. The known host answer overlay and historical phone findings remain outside this task. No backend behavior, source repair, persistence or production resizing is approved. The shared specimen remains draft. The PR preserves this report, not the ignored prototype assets.
