import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [react(), visualizer({ open: true })],
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
