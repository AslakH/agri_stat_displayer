import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png",
        "icons/apple-touch-icon.svg"
      ],
      manifest: {
        name: "Agricola Card Stats",
        short_name: "Agri Stats",
        description: "Phone-first Agricola card lookup with dataset switching.",
        theme_color: "#3f4e36",
        background_color: "#f4ead7",
        display: "standalone",
        scope: base,
        start_url: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: `${base}icons/icon.svg`,
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        runtimeCaching: [
          {
            urlPattern: /\/datasets\/.*\.json$/,
            handler: "CacheFirst",
            options: {
              cacheName: "dataset-cache-v1"
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts"
  }
});
