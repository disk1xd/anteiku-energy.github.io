import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://anteiku-energy.github.io",
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: {
      theme: "poimandres",
      wrap: true,
    },
    smartypants: true,
  },
});
