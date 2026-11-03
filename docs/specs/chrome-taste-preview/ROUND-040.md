# Round-040: Inspector section spacing

Round-039 A keeps 14px tree text. Round-040 compares the gaps around the Inspector separator without changing fields, type or the selected desktop layout. A retains 24px on each side; B uses 16px. Both preserve mobile spacing.

The live files are `rounds/round-040/{a.tsx,b.tsx,round.json}` in `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`, based on round-039 A. A copies the winner. B adds one desktop-only spacing override to the Inspector's Design panel. Historical rounds, shared library source, fixtures, fonts and theme.css stay unchanged.

```text
Desktop Inspector                  A       B
Canvas-to-separator gap            24px    16px
Separator-to-Properties gap        24px    16px
Properties top within Design      169px   153px
Caption input height              36px    36px
Theme button height               44px    44px
```

The 56+40px desktop header, 44px navigation controls, 256px side panels and 14px tree labels in 28px rows stay fixed. IBM Plex Sans, brighter charcoal, panel and canvas padding also remain unchanged. At 768px and 390px, both Inspector gaps stay 24px and Caption inputs stay 44px tall. Mobile tree rows remain 44px.

## Verification

Lead-owned Chromium checked 16 viewport/theme/variant cases: 1440×1600, 1024×1100, 768×1024 and 390×844, in light and dark for A and B. Measurements use section and separator rectangles, not a computed row-gap value. Properties moves up exactly 16px on desktop and stays in the same position between variants on mobile. Field and button heights remain fixed. All 13 interactive tree labels and the broken-entry label retain 14px text with 20px line height. The document and specimen fit horizontally. The real Plex font loads; the inner prototype retains Geist, its separate theme and three task rows.

Sixteen scoped Library axe audits report zero violations and zero incomplete results. Desktop B passes pointer folding, Tab to the next entry header and Enter folding. Phone B switches between Preview, Inspector and Layers. I inspected fresh desktop A/B and phone B Inspector captures, then closed the owned browser. The phone capture uses real scrolling to expose both sections above the unchanged host answer bar. Server 5301 stays running.

Final checks exit 0:

- `pnpm check`
- `pnpm test`: 36 files, 637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit round Biome and Impeccable checks; detector has no findings

The preservation check finds all 231 protected files unchanged and the original 39 log lines intact. QA submits no answer. Only DESIGN.md records the chosen typography and new spacing question; the three round files are new.

Logs, measurements, scripts and inspected images are saved in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-06/`. Initial redirected checks failed when `/tmp` rejected writes with `Disk quota exceeded`; native pnpm also aborted with unsymbolized stacks. Root-disk logging and a short private root-disk TMPDIR restore normal commands. No system settings or package versions changed, and no core was extracted. An initial Chrome socket-path error and a later screenshot-helper quoting error were corrected in the owned QA setup, not in the prototype. The evidence retains those failures. No independent review is claimed.

## Operator flow

Refresh round-040 in Full width on desktop. Switch A/B and compare the separation between Canvas and Properties in the right-hand Design panel. Field sizes and tree text should not change. On a phone, open Inspector; its spacing should stay the same. Record the preference in the real answer bar.

The host answer bar can cover lower controls, so scroll them above it. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. Production mobile sidebar focus restoration is unchanged. No production styles are applied, and the report PR contains no ignored prototype assets.
