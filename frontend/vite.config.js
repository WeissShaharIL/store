import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
      ],
      manifest: {
        id: "/?source=pwa",
        name: "Store ארונות",
        short_name: "Store",
        description: "ארונות בהתאמה אישית",
        dir: "rtl",
        lang: "he",
        scope: "/",
        start_url: "/?source=pwa",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#1a1a2e",
        categories: ["shopping"],
        prefer_related_applications: false,
        launch_handler: { client_mode: "navigate-existing" },
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globIgnores: [
          "**/three-bundle-*.js",
          "**/closet3d-shared-*.js",
          "**/lebombo_1k.hdr",
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
            handler: "CacheFirst",
            options: {
              cacheName: "uploads-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/public/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "public-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/") || id.includes("@react-three")) {
            return "three-bundle";
          }
          if (
            id.includes("/pages/admin/closet3d/") ||
            id.includes("/pages/admin/closet-builder/")
          ) {
            return "closet3d-shared";
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
