# Screens and components in the library

## Goal

Let the operator browse reusable components and real-size interactive screens composed from those components as distinct kinds of library entry.

## Operator direction

The original request was to borrow ideas from https://github.com/kgoedecke/doop and implement them one at a time while watching taste previews. Round-023 compared three connected app-canvas arrangements. The operator answered mix, describing it as also none.

Round-023 changes the order of work:

- Screens are compositions of actual components, including their interactivity. They are not layout-only mockups.
- The Library should distinguish Screens and Components. A screen is still a component in the composition sense.
- Opening a screen must show it at real size, not as a scaled canvas thumbnail.
- Flows visualize connections across screens and are a separate concept. Postpone them.

These definitions are captured in the root `CONTEXT.md`. No canvas arrangement from round-023 is approved.

## Next taste round

Round-024 compares two navigation treatments for the same Library content: separate Screens/Components tabs versus grouped Screens/Components in one tree. Keep the selected screen, its rendered components, fixture data, interaction behavior and inspector identical. Preserve the incumbent lab theme and layers/inspector direction from rounds 020 d and 022 c.

Start with a real-size task-list screen assembled from imported library components. Show its used components and let the operator inspect an individual component, then return to the composed screen. Search/filter and edit/save/cancel should work with local data. Provide a second screen composition so Screens is a real category. Screen selection is library browsing, not a flow diagram.

## Acceptance criteria

1. A checked round-024 compares two full-width Library navigation arrangements using the same data and screen/component source.
2. Screens and Components are distinct, working browsing categories. Selecting a screen renders a complete interactive composition of shared component imports.
3. Screen content starts at 100%, with no transform, CSS zoom, 640px mini viewport, or extra Play gate. Use available space responsively; scroll rather than silently shrink a fixed intended viewport. Keep optional focus/inspector collapse useful for viewing the screen at size.
4. The operator can discover a screen's component composition and open an actual used component's example, then return to the screen. Do not claim arbitrary runtime dependency discovery.
5. The same fixture-backed interactions work in each variant: screen selection, component browsing, search/filter, edit/cancel and mock save. There is no backend requirement.
6. The prototype follows the shadcn/import/token rules and passes data-dir check plus pnpm check. Browser checks cover the rendered result and local interactions.
7. New entries remain draft until the operator chooses. Existing answers, old rounds and the production source remain unchanged during this prototype.

## Production gate

After the round-024 pick, define the smallest backward-compatible Library entry distinction and implement the chosen browsing treatment. Keep old component metadata and controls working. Do not implement a new app-canvas route or app manifest from the superseded round-023 plan.

## Deferred

Flow diagrams, infinite canvas, pan/zoom, connectors, vector drawing, arbitrary DOM styling, multiplayer, in-app AI, live-site import, approval invalidation, automatic dependency discovery and comments-to-agent transport. No Doop source is copied.

## Preview and history

Branch: `feat/app-canvas`.

Worktree: `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas`.

The lead owns the existing taste preview for the isolated worktree `.taste-lab`. Root `.taste-lab` is gitignored. Preserve local prototype files in this worktree and record decisions here before implementing a committed demo. `PROTOTYPE.md` records the earlier round-023 preview and its limitations. It is historical, not an approved design.

See `MANUAL_TESTING.md` for the current acceptance flow.
