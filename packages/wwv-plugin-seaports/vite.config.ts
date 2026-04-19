import { defineConfig } from "vite";
import { wwvPluginGlobals, wwvStaticCompiler } from "@worldwideview/wwv-plugin-sdk";

export default defineConfig({
  plugins: [wwvStaticCompiler(), wwvPluginGlobals()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "frontend.mjs",
    },
    minify: true,
    sourcemap: false,
  },
});
