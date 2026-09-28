// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://noahairmet.com",
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  build: {
    // The CSP allows only same-origin files: no inline styles or scripts.
    inlineStylesheets: "never",
  },
  vite: {
    // Astro inlines small scripts under this limit; 0 keeps every script a file.
    build: { assetsInlineLimit: 0 },
  },
});
