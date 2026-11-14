import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: { port: 3001 },
  build: {
    sourcemap: true,
    // React and the router change rarely: their own file stays cached across releases.
    rollupOptions: { output: { manualChunks: { react: ["react", "react-dom", "react-router-dom"] } } },
  },
});
