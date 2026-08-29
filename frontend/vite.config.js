import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Hour 0-1 (FR1): scaffolding only. Dev server proxies /api to the FastAPI
// backend on :8000 so the frontend never hardcodes a full URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
