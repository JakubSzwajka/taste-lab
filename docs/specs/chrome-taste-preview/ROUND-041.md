# Round-041: desktop field height

Round-040 B selects 16px gaps around the desktop Inspector separator. Round-041 keeps that spacing and compares 36px with 32px search and Caption inputs. Text size and field widths do not change. Mobile fields stay 44px.

Live files are `rounds/round-041/{a.tsx,b.tsx,round.json}` in `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`, based on round-040 B. A copies the winning wrapper. B adds desktop height and minimum-height rules for sidebar inputs only. Shared library source, historical rounds, fixtures, fonts and theme.css remain unchanged.

```text
Desktop                         A       B
Search and Caption height      36px    32px
Input and tree text            14px    14px
Tree row height                28px    28px
Inspector separator gaps       16px    16px
Theme and navigation controls  44px    44px
```

The tree starts 4px higher beneath B's shorter search field. Its row heights, group gaps and labels stay fixed. Caption's label stays in place, while the helper text below the input moves up 4px. Both retain 256px side panels, 56+40px desktop header bars, brighter charcoal and IBM Plex Sans. At 768px and 390px, both fields remain 44px and Inspector gaps remain 24px.

## Verification

Lead-owned Chromium checked 16 viewport/theme/variant cases: 1440×1600, 1024×1100, 768×1024 and 390×844, in light and dark for A and B. Both desktop inputs measure 36px in A and 32px in B with unchanged widths and 14px text. Inspector section positions and gaps remain fixed between variants. Tree text stays 14px with 20px line height. The document and specimen fit horizontally, Plex loads, and the inner preview retains Geist, its separate theme and all three tasks.

Sixteen scoped Library axe audits report zero violations and zero incomplete results. Desktop B passes search no-match and recovery, Caption editing and restore, pointer folding, Tab to the next entry and Enter folding. Phone B switches between Preview, Inspector and Layers. The initial search helper cleared the displayed value but left the no-match state; real Ctrl+A/Backspace plus a restoration wait passes. Only the automation changed, and its first failure remains in `interactions-first.log`.

I inspected fresh desktop A/B and phone B Inspector captures, then closed the owned browser. Real scrolling exposes the phone Caption field above the unchanged host answer bar. Server 5301 stays running.

Final checks exit 0:

- `pnpm check`
- `pnpm test`: 36 files, 637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit round Biome and Impeccable checks; detector has no findings

All 234 protected files and the original 40 taste-log lines remain unchanged. QA submits no answer. DESIGN.md records round-040 B and the open field-height question; the three round files are new. Evidence and logs are saved in `~/.pi/agent/proof/taste-lab/feat-chrome-taste-preview/run-07/`. Commands use private root-disk scratch storage because of the previously confirmed `/tmp` quota failure. No independent review is claimed.

## Operator flow and limits

Refresh round-041 in Full width on desktop. Switch A/B and compare the search field and Caption input. Try typing and clearing search. Font sizes, panel widths, buttons and Inspector gaps should not change. On a phone, both fields should remain 44px. Use the real answer bar to record the preferred height.

The host answer bar can cover lower controls; scroll them above it. Physical devices, Safari, whole-app accessibility and a separate numeric hover/focus contrast matrix remain unverified. Production mobile sidebar focus restoration is unchanged. No production styling, theme promotion or generated UI edit is included. The report PR contains no ignored prototype assets.
