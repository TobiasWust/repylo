import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "repylo – Every rep counts",
        short_name: "repylo",
        description: "Trainingstagebuch ohne Account. Every rep counts.",
        theme_color: "#789fbd",
        background_color: "#789fbd",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,wasm}"],
        // The SQLite WebAssembly binary is larger than Workbox's 2 MB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  // Vite must not prebundle sqlite-wasm, or its .wasm URL breaks (per Evolu docs).
  optimizeDeps: { exclude: ["@evolu/sqlite-wasm"] },
  worker: { format: "es" },
});
