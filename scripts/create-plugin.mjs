#!/usr/bin/env node
// ─── WWV Bundle Plugin Scaffolder ──────────────────────────────
// Creates a new WorldWideView plugin with a full React+Vite bundle build system.
//
// Usage:
//   node scripts/create-plugin.mjs <plugin-name> <category>
//
// Example:
//   node scripts/create-plugin.mjs my-new-plugin Custom

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { execSync } from "child_process";

const pluginName = process.argv[2];
const category = process.argv[3] || "Custom";

if (!pluginName) {
  console.error("Usage: node scripts/create-plugin.mjs <plugin-name> [category]");
  process.exit(1);
}

// Clean up name
const cleanName = pluginName.toLowerCase().replace(/[^a-z0-9-]/g, "");
const pkgName = cleanName.startsWith("wwv-plugin-") ? cleanName : `wwv-plugin-${cleanName}`;
const shortName = pkgName.replace("wwv-plugin-", "");

const ROOT = resolve(import.meta.dirname, "..");
const PKG_DIR = join(ROOT, "packages", pkgName);
const SRC_DIR = join(PKG_DIR, "src");

if (existsSync(PKG_DIR)) {
  console.error(`❌ Plugin directory already exists: ${PKG_DIR}`);
  process.exit(1);
}

console.log(`\n🚀 Scaffolding new bundle plugin: ${pkgName}...`);

// 1. Create directories
mkdirSync(SRC_DIR, { recursive: true });

// 2. Write package.json
const packageJson = {
  name: `@worldwideview/${pkgName}`,
  version: "1.0.0",
  description: `WorldWideView plugin — ${shortName}`,
  main: "dist/frontend.mjs",
  module: "dist/frontend.mjs",
  type: "module",
  types: "src/index.tsx",
  files: ["dist", "src"],
  scripts: {
    "build": "vite build",
    "dev": "vite build --watch"
  },
  keywords: ["worldwideview", "worldwideview-plugin", pkgName, shortName],
  repository: {
    type: "git",
    url: "https://github.com/silvertakana/worldwideview-plugins.git",
    directory: `packages/${pkgName}`
  },
  license: "ISC",
  peerDependencies: {
    "@worldwideview/wwv-plugin-sdk": "workspace:*",
    "cesium": "*",
    "lucide-react": "*",
    "react": "*",
    "react-dom": "*",
    "resium": "*",
    "zustand": "*"
  },
  devDependencies: {
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.0"
  },
  worldwideview: {
    id: shortName,
    format: "bundle",
    category: category,
    icon: "Package"
  }
};
writeFileSync(join(PKG_DIR, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");

// 3. Write vite.config.ts
const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    minify: "esbuild",
    lib: {
      entry: "src/index.tsx",
      name: "Plugin",
      formats: ["es"],
      fileName: () => "frontend.mjs",
    },
    outDir: "dist",
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "cesium",
        "resium",
        "zustand",
        "lucide-react",
        "@worldwideview/wwv-plugin-sdk"
      ]
    }
  }
});
`;
writeFileSync(join(PKG_DIR, "vite.config.ts"), viteConfig);

// 4. Write tsconfig.json
const tsconfig = `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
`;
writeFileSync(join(PKG_DIR, "tsconfig.json"), tsconfig);

// 5. Write src/index.tsx
const className = shortName.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("") + "Plugin";
const indexTsx = `import React from 'react';
import { Package } from "lucide-react";
import type { WorldPlugin, PluginContext, GeoEntity, TimeRange } from "@worldwideview/wwv-plugin-sdk";

export class ${className} implements WorldPlugin {
  id = "${shortName}";
  name = "${shortName}";
  description = "A dynamically loaded frontend bundle plugin.";
  category = "${category}";
  icon = Package;
  version = "1.0.0";
  
  async initialize(ctx: PluginContext) {
    console.log(\`[\${this.name}] Initialized\`);
  }

  destroy() {
    console.log(\`[\${this.name}] Destroyed\`);
  }

  async fetch(range: TimeRange): Promise<GeoEntity[]> {
    return [];
  }

  getPollingInterval() {
    return 60000;
  }
}
`;
writeFileSync(join(SRC_DIR, "index.tsx"), indexTsx);

// 6. Provide install steps
console.log(`\n✅ Scaffolded ${pkgName} inside packages/`);
console.log(`\nTo get started:`);
console.log(`  1. cd packages/${pkgName}`);
console.log(`  2. pnpm install`);
console.log(`  3. pnpm build`);
console.log(`  4. npm publish --access public\n`);
