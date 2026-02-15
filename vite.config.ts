import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React + Router — общий фреймворк (~140KB)
          vendor: ["react", "react-dom", "react-router-dom"],
          // Данные — загружаются отдельно по мере надобности
          "data-quiz": ["./src/data/quiz.ts"],
          "data-content": [
            "./src/data/tafsir.ts",
            "./src/data/dua.ts",
            "./src/data/dhikr.ts",
            "./src/data/names.ts",
          ],
        },
      },
    },
  },
});
