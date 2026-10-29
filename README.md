# taste-lab

A local shadcn app for tuning UI taste. You compare 2 to 4 component variants side by side, pick one, tag it and say why. An agent reads that log and writes the next round. The app never calls an LLM.

The taste data for an app lives in a `.taste-lab` folder in that app's repo. This lab serves any such folder.

## Run

```sh
pnpm install
pnpm dev     # serves the demo in examples/demo/.taste-lab, prints a 127.0.0.1 URL
```

For another repo, from any folder:

```sh
node <taste-lab>/bin/taste-lab.mjs init  --dir ../my-app/.taste-lab
node <taste-lab>/bin/taste-lab.mjs check --dir ../my-app/.taste-lab
node <taste-lab>/bin/taste-lab.mjs serve --dir ../my-app/.taste-lab [--port N] [--lan [--host <ip>]]
```

`init` creates the folder with a sample fixture, an empty `library/` and an empty `theme.css`, and refuses to overwrite one that exists. `check` validates `theme.css`, rounds and `library/` entries and scans variant and library files; it exits 1 and lists the problems when something is wrong. `serve` starts the lab on 127.0.0.1. Without `--port` it takes the first free port from 5300, skipping 3000, 3326, 5173 and 5310.

`check` loads `fixtures/index.ts` and needs both exports: `fixtures` and `fixtureKeys` (the same keys). It reports broken files, dangling or looping symlinks and unreadable paths as problems. Data dir paths may contain spaces, quotes (not both kinds) and `$`. `serve`, `init` and `check` reject paths with a line break or control character, a backslash, `*`, `{` or `}`, or both quote kinds: Tailwind reads its `@source` path raw as a glob and cannot carry them.

### Open the lab from another device on your LAN

`serve --lan` binds one private IPv4 address instead of 127.0.0.1 and prints a link with a token:

```sh
node <taste-lab>/bin/taste-lab.mjs serve --dir ../my-app/.taste-lab --lan
#   LAN address 192.168.1.23 (wlp10s0). The link token changes on every run.
#   http://192.168.1.23:5301/?k=<token>
```

- The address is the interface that carries the default route (read from `/proc/net/route`, Linux only). Without a default route, it is the first private IPv4 that is not on a docker, bridge, veth, libvirt or tunnel interface. The output names other candidates.
- `--host <ip>` picks the address yourself. It must be a private or loopback IPv4 (10/8, 172.16/12, 192.168/16, 127/8). `--host` without `--lan` is a usage error (exit 2). The server never binds 0.0.0.0.
- Open the printed link once. The server swaps `?k=` for a cookie (`taste_lab_<port>`, `HttpOnly`, `SameSite=Strict`) and redirects to the same page without `k`. The app never sees the token, and nothing is kept in `localStorage`.
- The token is 128 random bits, made at start. It lives in server memory, the printed URL and that browser cookie only. It is never written to disk or into the data dir, and Vite never sees a URL that carries it, so it stays out of `DEBUG=vite:*` logs. It changes on every run, so an old link or cookie stops working after a restart.
- Protected: every HTTP request, including the page, modules, `/@fs` files, assets, `/api/taste` and the HMR WebSocket. A request needs a private remote address, `Host` equal to `<ip>:<port>`, an `Origin` (if sent) equal to `http://<ip>:<port>` and the cookie. A bad address, Host or Origin gets 403. A missing or wrong cookie gets 401 and a page that says "Open the link printed by `taste-lab serve --lan`". The JSON content type, size limit and validation rules of the API still apply.
- The gate covers listeners attached before it, which today is all of Vite's HTTP and HMR handlers. A listener added later, such as a configured `server.proxy`, is not covered. The lab configures no proxy.
- Anyone on the LAN who has the link can read everything the lab serves, including the round and library source. Use it on a network you trust. There is no HTTPS, so the token and cookie travel in clear text.
- In every mode, Vite refuses to serve `taste.jsonl` as a file (`server.fs.deny`). The app reads the log only through `/api/taste`.
- Vite public serving is off (`publicDir: false`), so nothing is served from a `public/` folder. A data dir inside the lab's `public/` folder is also rejected (symlinks followed), as defense in depth.
- Without `--lan`, nothing changes: 127.0.0.1 only, no token.

Node version is pinned in `.node-version`. pnpm version is in `package.json`.

### Use it from pi

This repo is a [pi](https://pi.dev) package with a `/taste` command and a `taste` skill. Install it once from the local checkout. It uses this repo's own `node_modules`, so run `pnpm install` first.

```sh
pi install ~/DEV/priv/taste-lab
```

Then, in a pi session in any repo:

| Command               | Does                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/taste`              | Serves `<cwd>/.taste-lab` on 127.0.0.1 and the LAN. Shows both links. Offers `init` if the folder is missing. |
| `/taste local`        | Same, without the LAN listener and link.                                                                      |
| `/taste --dir <path>` | Serves another data dir. Combines with `local`.                                                               |
| `/taste status`       | Shows the links again.                                                                                        |
| `/taste stop`         | Stops the server. Quitting pi stops it too.                                                                   |

The links, including the LAN token, show only in pi's UI: a notification, a widget below the editor and a status item. The agent never sees them. Each answer you log wakes the agent with one line (`answered round-NNN (...): pick b; tags ...; reason ...`). The `taste` skill then has it write the next round, run `check` and ask you to refresh. If the agent is busy, the answer waits until its current run ends.

The server's stderr goes to a log in the OS temp folder (`taste-lab-pi/`). If the server dies, pi says so and names that log.

## Use

1. Open the URL. The current round is the first one with no answer.
2. Toggle light or dark. All variants switch.
3. Pick with keys `1` to `4`, `n` for none, `m` for mix. Add tags and a reason. Press Enter to submit. In the reason box, use Ctrl/Cmd+Enter. Enter on a focused button or link keeps its normal action (toggle, follow) and does not submit.
   A view switch ("Side by side" or "Full width") sits above the variants. Full width shows one variant at full page width with A/B/C tabs. `←` and `→` flip between variants and wrap around. Number keys pick and also show that variant. Arrow keys do nothing while the reason box or a toggle, tab or menu has focus. Use full width for tables and layouts that need room.
4. Each submit appends one line to `.taste-lab/taste.jsonl` in the served folder and moves to the next round.
5. Open History to see past answers, newest first.
6. Open Library to see the agreed components: each entry has examples at their width, the rounds it came from (links to `#/round/<id>`) and its rules.

7. Open Theme to see every shadcn token as a swatch in light and dark. Values from `theme.css` are marked. The rest are stock. `--radius` shows as a sample box.

With no rounds in `.taste-lab/rounds/`, the app shows a "no rounds yet" screen.

## Scripts

| Script         | Does                                                      |
| -------------- | --------------------------------------------------------- |
| `pnpm dev`     | `taste-lab serve` for the demo, on 127.0.0.1              |
| `pnpm check`   | `tsc --noEmit` and Biome                                  |
| `pnpm test`    | Vitest                                                    |
| `pnpm build`   | type check and Vite build                                 |
| `pnpm preview` | serve the build on 127.0.0.1 (the log API works here too) |

## Layout

A data dir, committed in each app repo:

```
<repo>/.taste-lab/
  config.json         { "version": 1, "name": "<app name>" }, name defaults to <repo>
  fixtures/index.ts   sample data for variants, imported as @/fixtures
  theme.css           shadcn tokens for this app, over the lab's stock theme (see Theme)
  rounds/round-NNN/   rounds written by the agent (round.json + a.tsx, b.tsx, ...)
  library/<name>/     agreed components: <Name>.tsx, examples.tsx, meta.json
  taste.jsonl         append-only answer log
  DESIGN.md           distilled rules for this app
```

This repo:

```
bin/taste-lab.mjs        CLI entry (Node runs the TypeScript in cli/ directly)
cli/                     serve, init, check, port picking, variant scanner
pi/                      pi package: /taste extension, taste skill, helpers in pi/lib
examples/demo/.taste-lab the demo data dir (rounds 1 to 7, empty theme.css)
server/                  Vite plugin and /api/taste middleware
src/                     lab UI
src/components/ui/       stock shadcn primitives, generated, not hand-edited
tests/                   loader, library, log writer, CLI, variant rule and pi extension tests
```

## Theme

`<dir>/theme.css` holds the shadcn tokens this app's lab renders with: rounds, library, history and the app chrome. The lab's own `src/index.css` is the stock theme. Without a `theme.css`, or with empty blocks, you see stock.

```css
/* theme.css: only :root (light) and .dark, only shadcn custom properties */
:root {
  --primary: oklch(0.55 0.2 255);
}
.dark {
  --primary: oklch(0.75 0.15 255);
}
```

- Allowed: `:root` and `.dark` blocks, comments, and custom properties named like the variables in `src/index.css` (`--background`, `--primary`, `--radius`, `--chart-1` to `--chart-5`, `--sidebar-*` and the `-foreground` pairs). Raw colors are fine here. This file is the one place they live.
- Not allowed: other selectors, at-rules, `@import`, `url()`, `!important`, other names, non-custom properties. `taste-lab check` lists each with its line. The app ignores a rejected part and the Theme page lists it.
- Order: stock tokens, then `theme.css`, then each variant's `round.json` `tokens`. Round tokens win.
- A token missing from a mode falls back to stock for that mode. A `:root` value does not change the stock `.dark` value. A token that stock defines only in `:root`, like `--radius`, applies to both modes.
- A `theme.css` created, edited or deleted while the server runs updates the page without a restart or reload.
- Do not use `light-dark()` in `theme.css`. Write the two values into `:root` and `.dark`.

To promote a token round winner, copy the winning variant's `tokens` into `:root` and `.dark`. Split each `light-dark(a, b)` into `a` in `:root` and `b` in `.dark`. Cite the round in a comment next to the values and in the Tokens table of `DESIGN.md`. Then run `check`.

## Library

`library/<name>/` holds a component the operator agreed on, with examples and provenance. Names are kebab-case. The component is a named export `<Name>` in `<Name>.tsx`, takes its data through props and follows the variant rules (shadcn only, no raw colors, no `style` prop). `examples.tsx` holds named no-props components, one per example or state, and may import `@/fixtures`. `meta.json` has `name`, `title`, `description`, `status` (`draft` or `agreed`), `examples` (`export`, `title`, `width` of `column` or `full`), `provenance` (`round`, `pick`, `note`) and `rules`.

Round variants can import a library component as `@/library/<name>/<Name>`, to iterate on an agreed component. To promote a winner, copy the winning variant into `library/<name>/`, turn the fixture use into props, add examples and write `meta.json` with the rounds it came from. Details and the full contract are in [AGENTS.md](AGENTS.md). Variants may also import `class-variance-authority`, so a round can copy a library component that uses `cva`.

Rules for variants, the round and log contracts, and the agent loop are in [AGENTS.md](AGENTS.md).
