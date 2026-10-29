import { resolve } from "node:path";
import type { Plugin } from "vite";
import { createTasteMiddleware } from "./taste-log.ts";

/** Serves /api/taste in `vite` and `vite preview`. Appends to taste/taste.jsonl. */
export function tasteLog(): Plugin {
  const file = resolve(process.cwd(), "taste/taste.jsonl");
  const middleware = createTasteMiddleware(file);
  return {
    name: "taste-log",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
