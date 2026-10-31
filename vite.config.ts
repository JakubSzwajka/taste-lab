/// <reference types="vitest/config" />
import { createHash } from "node:crypto";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { labPaths } from "./server/lab-dir.ts";
import { tasteLab } from "./server/vite-plugin.ts";

const lab = import.meta.dirname;
// The data dir to serve. `taste-lab serve --dir` sets TASTE_LAB_DIR. Default: the demo.
const dataDir = path.resolve(
  lab,
  process.env.TASTE_LAB_DIR ?? "examples/demo/.taste-lab",
);
// Vite applies aliases with `String.replace`, so `$&`, `$1` or `$$` in a path would
// be expanded. Double each `$` to keep directory names literal.
const literal = (p: string) => p.replace(/\$/g, "$$$$");
const dirKey = createHash("sha1").update(dataDir).digest("hex").slice(0, 10);

export default defineConfig({
  root: lab,
  // No file is ever served from a `public/` folder. Vite serves it without the
  // `server.fs.deny` check, so a data dir placed there (or a symlink into one) would
  // expose taste.jsonl. The lab has no public assets.
  publicDir: false,
  // One optimizer cache per data dir, so two labs running at once do not
  // overwrite each other's prebundled deps.
  cacheDir: path.join(lab, "node_modules/.vite", `lab-${dirKey}`),
  plugins: [
    tasteLab({ dataDir, css: path.join(lab, "src/index.css") }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // First match wins. Variants import `@/fixtures` and `@/library/*` from the
    // data dir and `@/components/ui/*`, `@/lib/utils` from the lab.
    alias: [
      {
        find: /^@\/fixtures$/,
        replacement: literal(labPaths(dataDir).fixtures),
      },
      {
        // `@/library/<name>/<Name>` is a library component in the data dir.
        find: /^@\/library\//,
        replacement: literal(`${labPaths(dataDir).library}/`),
      },
      { find: /^@lab\//, replacement: literal(`${dataDir}/`) },
      { find: "@", replacement: literal(path.join(lab, "src")) },
    ],
    // Data dir files can live outside this repo. Resolve their bare imports
    // from the lab's node_modules, and keep one React.
    dedupe: ["react", "react-dom", "lucide-react", "class-variance-authority"],
  },
  server: {
    host: "127.0.0.1",
    fs: {
      allow: [lab, dataDir],
      // Setting `deny` replaces Vite's list, so its 8.x defaults are repeated here.
      // The app reads the log only through /api/taste, never as a file.
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem,key,p12,pfx,cer,der}",
        ".npmrc",
        ".yarnrc.yml",
        "**/.git/**",
        "taste.jsonl",
      ],
    },
  },
  preview: { host: "127.0.0.1" },
  test: { include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"] },
});
