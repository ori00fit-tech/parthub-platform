import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export function createViteConfig({ port = 3000, envPrefix = "VITE_" } = {}) {
  return defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "src"),
      },
    },
    server: {
      port,
      strictPort: false,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
          },
        },
      },
    },
    envPrefix,
  });
}
