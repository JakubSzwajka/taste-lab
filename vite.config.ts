import { createHash } from "node:crypto";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { labPaths } from "./server/lab-dir.ts";
import { tasteLab } from "./server/vite-plugin.ts";

const lab = import.meta.dirname;
// The data dir to serve. `taste-lab serve --dir` sets TASTE_LAB_DIR. Default: the demo.
const dataDir = path.resolve(
  lab,
  process.env.TASTE_LAB_DIR ?? "examples/demo/.taste-lab",
);
const dirKey = createHash("sha1").update(dataDir).digest("hex").slice(0, 10);

export default defineConfig({
  root: lab,
  // One optimizer cache per data dir, so two labs running at once do not
  // overwrite each other's prebundled deps.
  cacheDir: path.join(lab, "node_modules/.vite", `lab-${dirKey}`),
  plugins: [
    tasteLab({ dataDir, css: path.join(lab, "src/index.css") }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // First match wins. Variants import `@/fixtures` from the data dir and
    // `@/components/ui/*`, `@/lib/utils` from the lab.
    alias: [
      { find: /^@\/fixtures$/, replacement: labPaths(dataDir).fixtures },
      { find: /^@lab\//, replacement: `${dataDir}/` },
      { find: "@", replacement: path.join(lab, "src") },
    ],
    // Data dir files can live outside this repo. Resolve their bare imports
    // from the lab's node_modules, and keep one React.
    dedupe: ["react", "react-dom", "lucide-react"],
  },
  server: {
    host: "127.0.0.1",
    fs: { allow: [lab, dataDir] },
  },
  preview: { host: "127.0.0.1" },
  test: { include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"] },
});
