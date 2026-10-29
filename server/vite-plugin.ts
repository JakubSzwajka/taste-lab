import { relative } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { themeToCss } from "../src/lib/taste-theme.ts";
import { labPaths, readLabConfig, tailwindSource } from "./lab-dir.ts";
import { createTasteMiddleware } from "./taste-log.ts";
import { loadTheme } from "./theme-file.ts";

export const CONFIG_MODULE = "virtual:taste-lab/config";
const RESOLVED_CONFIG = `\0${CONFIG_MODULE}`;
export const THEME_MODULE = "virtual:taste-lab/theme";
const RESOLVED_THEME = `\0${THEME_MODULE}`;
export const THEME_EVENT = "taste-lab:theme";

const inside = (dir: string, file: string) => {
  const rel = relative(dir, file);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith("/");
};

/**
 * Serves one `.taste-lab` data dir.
 * - `/api/taste` reads and appends `<dataDir>/taste.jsonl` (dev and preview).
 * - `virtual:taste-lab/config` exposes config.json (the app name).
 * - Adds `@source "<dataDir>"` to the lab stylesheet so Tailwind scans the data dir.
 * - Appends `<dataDir>/theme.css` to the lab stylesheet, after the stock tokens.
 *   Only the accepted `:root` and `.dark` values are emitted, so a broken file
 *   cannot break the stylesheet. Round `tokens` are inline styles and still win.
 * - `virtual:taste-lab/theme` exposes stock and theme tokens to the Theme page.
 * - Watches the data dir. A new file there regenerates the stylesheet: Tailwind
 *   only re-scans when the CSS module is transformed again, and nothing else
 *   invalidates it for a file it has never seen. The same path serves theme.css
 *   when it is added, edited or deleted, and pushes the new tokens to open tabs.
 * Must come before `tailwindcss()` in the plugin list.
 */
export function tasteLab(opts: { dataDir: string; css: string }): Plugin {
  const { dataDir, css } = opts;
  const middleware = createTasteMiddleware(labPaths(dataDir).log);
  return {
    name: "taste-lab",
    enforce: "pre",
    resolveId(id) {
      if (id === CONFIG_MODULE) return RESOLVED_CONFIG;
      if (id === THEME_MODULE) return RESOLVED_THEME;
    },
    load(id) {
      if (id === RESOLVED_THEME) return themeModule(loadTheme(dataDir, css));
      if (id !== RESOLVED_CONFIG) return;
      return `export default ${JSON.stringify(readLabConfig(dataDir))};`;
    },
    transform: {
      filter: { id: /\.css(?:\?.*)?$/ },
      handler(code, id) {
        if (id.split("?")[0] !== css) return;
        const { stock, theme } = loadTheme(dataDir, css);
        return `${code}\n${tailwindSource(dataDir)}\n${themeToCss(stock, theme)}`;
      },
    },
    configureServer(server) {
      server.middlewares.use(middleware);
      server.watcher.add(dataDir);
      const themeFile = labPaths(dataDir).theme;
      server.watcher.on("add", (file) => {
        if (file === themeFile) void reloadTheme(server, css, dataDir);
        else if (inside(dataDir, file)) void reloadCss(server, css);
      });
      for (const event of ["change", "unlink"] as const) {
        server.watcher.on(event, (file) => {
          if (file === themeFile) void reloadTheme(server, css, dataDir);
        });
      }
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

async function reloadCss(server: ViteDevServer, css: string) {
  const mods = server.moduleGraph.getModulesByFile(css);
  for (const mod of mods ?? []) await server.reloadModule(mod);
}

/** Client module: the theme data, plus a subscription the HMR event feeds. */
function themeModule(data: unknown) {
  return `let current = ${JSON.stringify(data)};
const subs = new Set();
export const getThemeData = () => current;
export const subscribeThemeData = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
if (import.meta.hot) {
  import.meta.hot.on(${JSON.stringify(THEME_EVENT)}, (next) => {
    current = next;
    for (const fn of subs) fn();
  });
}
`;
}

/** theme.css changed: rebuild the stylesheet and tell open tabs the new tokens. */
async function reloadTheme(
  server: ViteDevServer,
  css: string,
  dataDir: string,
) {
  const mod = server.moduleGraph.getModuleById(RESOLVED_THEME);
  if (mod) server.moduleGraph.invalidateModule(mod); // a reload gets fresh data
  await reloadCss(server, css);
  server.ws.send({
    type: "custom",
    event: THEME_EVENT,
    data: loadTheme(dataDir, css),
  });
}
