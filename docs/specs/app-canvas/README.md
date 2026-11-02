# App canvas

## Goal

Let the operator assemble and judge a clickable app design made from live library components, with mock data and an overview canvas.

## Operator brief

The operator wants to borrow ideas from https://github.com/kgoedecke/doop and implement them one at a time, watching previews and answering taste rounds. They want library components connected into a full app design. Real backend data flows are not required. They are interested in an infinite canvas.

## First increment

Prototype the workspace arrangement first, then implement the chosen arrangement as a new app-canvas view without replacing the existing Library workbench.

The overview shows screen frames, their names and navigation connections. A Play view shows one screen at a usable size and permits navigation. Screen source imports real library components rather than copying their rendered markup. Use one fixture-backed task flow: task list, task detail, edit sheet and a mocked saved state.

The workspace follows the existing taste.lab theme, icon sizes and layers/inspector direction recorded in `.taste-lab/DESIGN.md`, especially rounds 020 d and 022 c. Compare meaningful arrangements of the same content, not different palettes. Do not copy Doop's AGPL source.

## Acceptance criteria

1. A checked taste round compares 2 to 3 full-width workspace arrangements with the same screen data.
2. The operator can choose a layout and request refinements through the existing answer mechanism.
3. The implemented app canvas is opt-in and does not break Compare, Library, Theme or History.
4. Frames render actual TSX compositions importing library components. Changes to a shared component reach its screen usages through Vite updates.
5. Overview mode selects screens without accidentally triggering their app actions. Play mode permits list-to-detail navigation, edit-sheet open/close, mocked Save and return navigation.
6. The canvas supports pan/zoom and fit-to-content, with usable labels and keyboard controls. Screen dimensions are independent of zoom.
7. Missing screen source and invalid navigation targets produce local, readable errors instead of blanking the lab.
8. Data stays in the served data dir and remains file-authored. The lab does not call an LLM. Tests, checks and a demo build pass.

## Prototype gate

The first taste round settles workspace arrangement only. Clearly distinguish working prototype interactions from deferred production features. Do not mark draft screen components agreed without an operator pick. A subsequent implementation brief will fix the data contract and exact production paths after that pick.

## Deferred

Vector drawing, arbitrary DOM styling, multiplayer, in-app AI, live-site import, approval invalidation, automatic dependency discovery and comments-to-agent transport. Do not claim these work in a preview.

## Preview

Task branch: `feat/app-canvas`.

Task worktree: `/home/kuba/.herdr/worktrees/taste-lab/feat-app-canvas`.

The worktree has an isolated copy of the existing local `.taste-lab` data. Its next free round is 023. Existing local design decisions and answers remain untouched in the primary checkout. Root `.taste-lab` is gitignored; save the chosen direction in this spec before implementing a committed demo.

## Human acceptance flow

See `MANUAL_TESTING.md` in this folder.
