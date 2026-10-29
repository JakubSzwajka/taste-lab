import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { tasteLog } from "./server/vite-plugin.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), tasteLog()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
  test: { include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"] },
});
