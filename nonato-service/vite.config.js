import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { execSync } from "child_process";

// ── Identificação do build (ver src/config/buildInfo.js) ──────────────────
// Carimbado em cada `vite build`: data/hora e o commit do GitHub em que o
// build foi feito. "dirty" = havia alterações por guardar (o commit indicado
// é o anterior) — por isso convém fazer commit ANTES do build (npm run deploy).
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};
const BUILD_INFO = {
  time: new Date().toISOString(),
  commit: git("rev-parse --short HEAD"),
  commitTitle: git("log -1 --format=%s"),
  // Só conta código (o build mexe em stats.html e na cache do Firebase).
  dirty: git("status --porcelain -- src public firestore.rules storage.rules") !== "",
};

// Publica /version.json com a hora do build: a app compara-a com a sua para
// saber se já existe uma versão mais recente no site.
const versionFilePlugin = () => ({
  name: "nonato-version-file",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({ time: BUILD_INFO.time, commit: BUILD_INFO.commit }),
    });
  },
});

export default defineConfig({
  plugins: [react(), visualizer({ open: true }), versionFilePlugin()],
  define: {
    __BUILD_INFO__: JSON.stringify(BUILD_INFO),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom")
          ) {
            return "react";
          }

          // Firebase (regex catch all)
          if (id.includes("node_modules/firebase/")) {
            return "firebase";
          }

          // UI (Radix, motion, lucide)
          if (
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/lucide-react")
          ) {
            return "ui";
          }

          // Charts
          if (id.includes("node_modules/recharts")) {
            return "charts";
          }

          // PDF
          if (id.includes("node_modules/pdf-lib")) {
            return "pdf";
          }

          // Datas
          if (
            id.includes("node_modules/moment") ||
            id.includes("node_modules/date-fns")
          ) {
            return "dates";
          }

          // QR
          if (
            id.includes("node_modules/qrcode.react") ||
            id.includes("node_modules/react-qr-code")
          ) {
            return "qrcode";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
