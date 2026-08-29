import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Minimal config — no aliasing, no env-based API base yet.
// Backend is assumed at http://localhost:8000 (see App.jsx).
export default defineConfig({
  plugins: [react()],
});
