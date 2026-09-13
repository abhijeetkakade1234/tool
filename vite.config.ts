import path from "node:path"
import { defineConfig, type Connect, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import { handleFetchPage } from "./src/lib/server/fetchPage.ts"

/**
 * Serves the Link Preview page fetcher at /api/fetch-page under `vite dev` and
 * `vite preview`. In production the same handler runs as a Cloudflare Pages
 * Function (functions/api/fetch-page.ts).
 */
function fetchPageApi(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith("/api/fetch-page")) return next()
    const request = new Request(new URL(req.url, "http://localhost"), { method: req.method })
    // Locally, previewing localhost / LAN pages is useful, so private hosts are allowed.
    handleFetchPage(request, { allowPrivate: true }).then(async (response) => {
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(await response.text())
    }, next)
  }
  return {
    name: "fileforge-fetch-page-api",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    fetchPageApi(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "FileForge",
        short_name: "FileForge",
        description:
          "Local-first browser toolbox for PDFs and images. Files never leave your device.",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // The HEIC page bundles a ~3MB libheif WASM build; don't force it on
        // every visitor at install time — cache it on first use instead.
        globIgnores: ["**/HeicConvertPage-*.js"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/HeicConvertPage-.*\.js$/,
            handler: "CacheFirst",
            options: { cacheName: "heic-converter" },
          },
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  // ffmpeg.wasm spins up its own worker from an import.meta.url reference; letting
  // esbuild pre-bundle it rewrites that URL and breaks the worker at runtime.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
