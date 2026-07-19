import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "IMAN — Путь мусульманина",
        short_name: "IMAN",
        description: "Приложение для укрепления веры и духовного роста",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Tafsir chunk is ~11 MB (full Tafsir Al-Sa'di for all 6236 ayahs).
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // Сразу активируем новый SW и удаляем старый кэш — пользователь
        // получает актуальную версию без ручного жёсткого рефреша
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // index.html всегда из сети — чтобы новые JS-чанки находились
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5555,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React + Router — общий фреймворк (~140KB)
          vendor: ["react", "react-dom", "react-router-dom"],
          // Данные — загружаются отдельно по мере надобности
          "data-quiz": ["./src/data/quiz.ts"],
          // Тафсир Саади выделен в отдельный чанк — большой (~11MB), загружается только со страницей Корана
          "data-tafsir": ["./src/data/tafsir.ts", "./src/data/tafsir-saadi.json"],
          "data-content": [
            "./src/data/dua.ts",
            "./src/data/dhikr.ts",
            "./src/data/names.ts",
          ],
        },
      },
    },
  },
});
