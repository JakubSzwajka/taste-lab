# Chrome taste previews

Goal: let the operator compare brighter dark chrome, workbench spacing and font families in the existing lab before changing the live interface.

## Scope

Three independent rounds in the existing local data dir:

| Round | Axis                   | Choices                                             |
| ----- | ---------------------- | --------------------------------------------------- |
| 033   | Dark chrome brightness | Current deep slate, lifted slate, brighter charcoal |
| 034   | Spacing                | Compact or comfortable                              |
| 035   | Font family            | Geist, DM Sans, IBM Plex Sans                       |

Each uses the same shadcn-only specimen with Library, Compare, Theme and History sample pages. The specimen is not a replacement production workbench. All actions stay local; Try submit never posts an answer.

## Acceptance

- Existing server on port5301 stays running; new rounds appear without a restart.
- Only the stated axis changes within a round. Light palette is identical across033 choices. The teal accent is retained.
- The task table has its own explicit prototype theme and keeps Geist in all alternatives.
- DM Sans and IBM Plex Sans load as actual self-hosted variable fonts, not renamed fallbacks. Include the font licenses. Browser requests stay local.
- Compact desktop spacing:24px canvas padding,16px panels,8px group gaps,32px tree rows. Comfortable:32/24/12/40px. Header heights remain64/48px. Mobile controls keep44px targets.
- All fixture task rows, library entries, history entries and theme tokens remain available in their sample pages.
- Existing rounds, components, fixtures, theme.css and taste.jsonl stay unchanged. DESIGN.md may record this preview request only.
- Data validation, type/lint checks and tests pass. Browser inspection covers every variant and narrow/desktop layouts. Findings remain explicit.

## Location and persistence

Live data: `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas/.taste-lab/`.

The new task worktree links to that data. This repo intentionally ignores its root taste data. The PR preserves this spec and verification report, not the prototypes or font binaries. Keep the existing data directory. No production CSS, fonts, backend or generated UI files are changed.

User approval is for previews only, not for applying any winner or merging this report PR. See [MANUAL_TESTING.md](MANUAL_TESTING.md).
