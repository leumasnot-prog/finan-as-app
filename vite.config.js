import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// ARTIFACT=1: tudo embutido num arquivo (emojis inclusos), para publicar como página única.
export default defineConfig({
  plugins: [react()],
  build: process.env.ARTIFACT ? { assetsInlineLimit: 100_000_000 } : {},
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { environment: "node" },
});
