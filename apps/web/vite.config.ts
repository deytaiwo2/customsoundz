import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic"
    }),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: {
        name: "Dublu Vé Entertainments",
        short_name: "Dublu Vé",
        description: "Music artists, custom songs, brand jingles, voice-over and professional audio production.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#f97316",
        icons: [
          { src: "/brand/dublu-ve-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          { src: "/icons/ess-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/ess-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      includeAssets: ["offline.html", "brand/dublu-ve-mark.svg"]
    })
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      }
    }
  },

  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
