import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Properly process .scss files
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2, // Additional optimization passes
        collapse_vars: true,
        pure_getters: true,
        keep_infinity: true,
        side_effects: true,
      },
      mangle: {
        toplevel: true,
      },
    },
    rollupOptions: {
      external: ["electron", "path", "fs", "util"],
      output: {
        // Bundle into fewer chunks, prioritizing smaller package size
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: [
            "@radix-ui/react-checkbox",
            "@radix-ui/react-icons",
            "@radix-ui/react-label",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
        },
        // Ensure every chunk has a deterministic name
        entryFileNames: "[name].[hash].js",
        chunkFileNames: "[name].[hash].js",
        assetFileNames: "[name].[hash].[ext]",
      },
    },
    target: "es2020", // Modern target for smaller output
    cssCodeSplit: false, // Bundle all CSS into one file
    reportCompressedSize: false, // Speed up build
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["electron"],
    include: [
      "react",
      "react-dom",
      "clsx",
      "class-variance-authority",
      "lucide-react",
      "tailwind-merge",
    ],
  },
});
