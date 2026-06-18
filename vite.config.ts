import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
) as { version: string };

function resolveCommitId() {
  const vercelCommit = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelCommit) return vercelCommit.slice(0, 7);

  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: __dirname,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

const appVersion = `v${packageVersion.version} · ${resolveCommitId()}`;

const plugins = [react(), tailwindcss()];

export default defineConfig({
  base: '/',
  plugins,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(__dirname),
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "client/dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    host: "127.0.0.1",
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
