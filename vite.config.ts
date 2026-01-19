import { crx } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    solid(),
    crx({
      manifest,
      contentScripts: {
        injectCss: true,
      },
    }),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: "src/sidepanel/index.html",
      },
    },
  },
});
