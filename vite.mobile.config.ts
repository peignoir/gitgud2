import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/client/src"
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

