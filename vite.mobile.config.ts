import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const commit =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? process.env.COMMIT_REF ?? process.env.VITE_COMMIT_SHA ?? "";
const appVersion = `${pkg.version}${commit ? `-${commit.slice(0, 7)}` : ""}`;

export default defineConfig({
  root: "client",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src")
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:4000"
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});

