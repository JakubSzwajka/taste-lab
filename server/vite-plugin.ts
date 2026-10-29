import { relative } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { labPaths, readLabConfig } from "./lab-dir.ts";
import { createTasteMiddleware } from "./taste-log.ts";

export const CONFIG_MODULE = "virtual:taste-lab/config";
const RESOLVED_CONFIG = `\0${CONFIG_MODULE}`;

const inside = (dir: string, file: string) => {
  const rel = relative(dir, file);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith("/");
};

/**
 * Serves one `.taste-lab` data dir.
 * - `/api/taste` reads and appends `<dataDir>/taste.jsonl` (dev and preview).
 * - `virtual:taste-lab/config` exposes config.json (the app name).
 * - Adds `@source "<dataDir>"` to the lab stylesheet so Tailwind scans the data dir.
 * - Watches the data dir. A new file there regenerates the stylesheet: Tailwind
 *   only re-scans when the CSS module is transformed again, and nothing else
 *   invalidates it for a file it has never seen.
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
    },
    load(id) {
      if (id !== RESOLVED_CONFIG) return;
      return `export default ${JSON.stringify(readLabConfig(dataDir))};`;
    },
    transform: {
      filter: { id: /\.css(?:\?.*)?$/ },
      handler(code, id) {
        if (id.split("?")[0] !== css) return;
        return `${code}\n@source ${JSON.stringify(dataDir)};\n`;
      },
    },
    configureServer(server) {
      server.middlewares.use(middleware);
      server.watcher.add(dataDir);
      server.watcher.on("add", (file) => {
        if (inside(dataDir, file)) void reloadCss(server, css);
      });
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
