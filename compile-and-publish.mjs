import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';
const packagesToRepublish = [
  'wwv-plugin-civil-unrest',
  'wwv-plugin-conflict-events',
  'wwv-plugin-cyber-attacks',
  'wwv-plugin-gps-jamming',
  'wwv-plugin-international-sanctions',
  'wwv-plugin-osm-search',
  'wwv-plugin-surveillance-satellites',
  'wwv-plugin-undersea-cables'
];

const viteConfigContent = `import { defineConfig } from "vite";
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

for (const pkg of packagesToRepublish) {
  const dir = path.join(packagesDir, pkg);
  
  // 1. Add Vite Dependency & tsconfig if not present
  try {
    execSync('pnpm add -D vite @vitejs/plugin-react', { cwd: dir, stdio: 'inherit' });
  } catch (e) {
    console.warn(`Could not add Vite to ${pkg}`);
  }

  // 2. Write vite.config.ts
  fs.writeFileSync(path.join(dir, 'vite.config.ts'), viteConfigContent);
  
  // 3. Rename src/index.ts to src/index.tsx if it is .ts
  if (fs.existsSync(path.join(dir, 'src', 'index.ts'))) {
    fs.renameSync(path.join(dir, 'src', 'index.ts'), path.join(dir, 'src', 'index.tsx'));
  }

  // 4. Update package.json
  const pkgJsonPath = path.join(dir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  pkgJson.main = "dist/frontend.mjs";
  pkgJson.module = "dist/frontend.mjs";
  pkgJson.type = "module";
  if (!pkgJson.scripts) pkgJson.scripts = {};
  pkgJson.scripts.build = "vite build";
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

  // 5. Build and Publish
  try {
    console.log(`\nBuilding and publishing ${pkg}...`);
    execSync('npm version patch', { cwd: dir, stdio: 'inherit' });
    execSync('pnpm build', { cwd: dir, stdio: 'inherit' });
    execSync('npm publish --access public', { cwd: dir, stdio: 'inherit' });
    console.log(`✅ Fully built and published ${pkg}!`);
  } catch (e) {
    console.error(`❌ Failed on ${pkg}:`, e.message);
  }
}
