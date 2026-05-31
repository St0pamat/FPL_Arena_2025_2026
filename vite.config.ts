import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Pliki w public/ (w tym public/soundtracks/*.wav i ZIP ~570 MB, gitignore)
 * sa kopiowane do dist/ bez zmian przez copyPublicDir.
 * Przed deployem: npm run verify-public -- --strict && npm run build && npm run verify-dist
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: path.resolve(__dirname, "public"),
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    copyPublicDir: true,
    emptyOutDir: true,
    // Duze pliki WAV/ZIP nie trafiaja do bundla JS — tylko kopia z public/
    assetsInlineLimit: 0,
  },
});
