/**
 * Vite config for building the Netlify serverless function.
 * Bundles ALL server code + npm deps into a single file for Netlify.
 */
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "netlify/functions/api.mts"),
      name: "api",
      fileName: "api",
      formats: ["es"],
    },
    outDir: "netlify/functions-built",
    target: "node20",
    ssr: true,
    rollupOptions: {
      // Only externalize Node.js built-in modules
      external: [
        /^node:/,
        "fs", "path", "url", "http", "https", "os", "crypto", "net", "tls",
        "stream", "util", "events", "buffer", "querystring", "child_process",
        "zlib", "assert", "string_decoder", "worker_threads", "perf_hooks",
        "stream/web", "diagnostics_channel", "async_hooks",
      ],
      output: {
        format: "es",
        entryFileNames: "api.mjs",
        inlineDynamicImports: true,
      },
    },
    minify: true,
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  ssr: {
    // Bundle everything - don't treat any npm package as external
    noExternal: true,
  },
});
