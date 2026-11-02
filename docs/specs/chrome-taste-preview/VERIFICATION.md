# Preview verification

## Delivered

The existing lab serves rounds033–035 without a restart. Production chrome, fonts and theme.css are unchanged. A shared draft `lab-chrome-preview` specimen supplies the four sample pages; it is not the production Library workbench.

Live files are in `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`. The report worktree has an ignored local directory linking to that data. Neither the prototype files nor font binaries are included in this report PR.

## Browser evidence

Lead-owned Chromium session `chrome-taste-preview`, now closed. The operator's5301 server remains running. No independent prover or cross-family review is claimed.

Evidence: `/tmp/chrome-taste-preview/`.

| Check                                 | Result                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| All8 alternatives, dark desktop1440px | Passed                                                                                         |
| Brightness light-mode control         | All3 backgrounds identical at `oklch(0.99 0.003 255)`                                          |
| Dark background A/B/C                 | `oklch(0.16 0.012 255)`, `oklch(0.22 0.012 255)`, `oklch(0.27 0.012 255)`                      |
| Compact desktop                       | Canvas24px, panels16px, rows32px                                                               |
| Comfortable desktop                   | Canvas32px, panels24px, rows40px                                                               |
| Fonts                                 | Computed Geist / Lab DM Sans / Lab IBM Plex Sans; actual requested variable faces loaded       |
| Fixed prototype                       | Geist and original theme values retained across choices; independent light/dark control works  |
| Mobile390px,5 representative choices  | Specimen fits its container, page icons remain inside it, tree rows44px                        |
| Scoped axe audits                     | 32 passes with zero reported violations:8 alternatives ×4 sample pages                         |
| Sample interactions                   | Search/no-match/recovery, folding, example breadcrumb, editable reason and local submit passed |
| Fixture collections                   | All3 task rows,4 library entries,12 history entries and32 token rows available                 |
| Preservation                          | 200 historical files unchanged; original32 taste-log lines retained byte-for-byte              |

The app appended3 genuine operator answers during verification:033C brighter charcoal,034A compact with reason "even slightly more compacted?",035C IBM Plex Sans. No sample action submitted a real taste answer. No choice is applied to production or promoted by this task.

Raw results: `measurements.json`, `audit-summary.json`, `preservation.json`, `browser.log`, `audit-browser.log`. Safe comparison captures: `comparison-033.png` and `comparison-035.png`; their source captures are `clean-33-*.png` and `clean-35-*.png`. Initial harness failures remain in the `browser-first` through `browser-fourth` and `audit-browser-first` through `audit-browser-third` logs.

## Corrections during verification

- Replaced rejected `import.meta` asset lookup with a stylesheet prop. Round035 supplies the explicit local served CSS path. Moving the data dir requires updating those3 URLs.
- Kept the flask alone in the narrow specimen header so all4 page targets fit.
- Replaced nested main landmarks with named sections. Made the sample tables keyboard-focusable so scroll containers have keyboard access. No generated UI file was edited and no lint rule was suppressed.
- Waited for fonts and transitions before capture. Used visible, variant-scoped inputs, narrow-screen tab names and real document scrolling above the host answer bar. Corrected the history fixture expectation from9 to12. These harness fixes do not change the comparison axes.

## Checks

All exit0 on the final preview source:

- `pnpm check`
- `pnpm test`:36 files,637 tests
- `pnpm build`: existing large-chunk advisory remains
- `node bin/taste-lab.mjs check --dir .taste-lab`
- `node bin/taste-lab.mjs check --dir examples/demo/.taste-lab`
- Explicit Biome check on the new ignored library and rounds
- Impeccable detector on the new library: no findings
- Browser matrix and scoped audit scripts

Logs are under `/tmp/chrome-taste-preview/`: `check.log`, `test.log`, `build.log`, `data.log`, `demo.log`, `format.log`, `detect.json`.

## Not fixed and limits

- Existing real Compare answer bar still covers the lower specimen at some scroll positions. At390px, its Pick-a-variant row makes the document453px wide for3-choice rounds. The specimen itself does not overflow. Scroll to inspect controls above the bar. No host overlay was hidden for tests or screenshots.
- Incumbent production mobile sidebar focus restoration is unchanged.
- Chromium viewport checks are not physical-device or Safari testing. Scoped axe audits are not whole-app accessibility approval. Hover/focus contrast was not measured as a separate numeric matrix for this task.
- Latin normal variable fonts only, locally copied from Fontsource Variable5.3.0. Font licenses are alongside the2 WOFF2 files. No browser font request needs an external host.

## Effects

No migration, deployment, external write or production restyle. Preview actions modify local React state only. Only the app appends operator answers. Keep the original ignored data dir and its worktree; merging or reverting this report does not create or remove those local assets.
