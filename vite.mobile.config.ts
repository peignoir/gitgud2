import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "client",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src")
    }
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:4000"
    }
  },
  build: {
    outDir: "../dist-client",
    emptyOutDir: true
  }
});

