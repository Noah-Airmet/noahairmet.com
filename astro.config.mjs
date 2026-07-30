// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://noahairmet.com",
  integrations: [sitemap()],
  build: {
    // The production CSP is style-src 'self'; never inline styles.
    inlineStylesheets: "never",
  },
});
