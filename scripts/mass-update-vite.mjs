import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PACKAGES_DIR = path.resolve(process.cwd(), "packages");

function updatePlugin(dirName) {
    const pluginDir = path.join(PACKAGES_DIR, dirName);
    const packageJsonPath = path.join(pluginDir, "package.json");
    const viteConfigPath = path.join(pluginDir, "vite.config.ts");

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(viteConfigPath)) {
        return;
    }

    console.log(`\nProcessing ${dirName}...`);

    // 1. Update package.json
    let pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    let versionChanged = false;
    
    // Bump patch version
    const parts = pkgJson.version.split(".");
    parts[2] = parseInt(parts[2], 10) + 1;
    pkgJson.version = parts.join(".");
    
    // Update SDK dependency
    ["dependencies", "devDependencies", "peerDependencies"].forEach(depType => {
        if (pkgJson[depType] && pkgJson[depType]["@worldwideview/wwv-plugin-sdk"]) {
            pkgJson[depType]["@worldwideview/wwv-plugin-sdk"] = "^1.2.7";
        }
    });
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
    console.log(`  - Bumped version to ${pkgJson.version}`);

    // 2. Update vite.config.ts
    let viteConfig = fs.readFileSync(viteConfigPath, "utf-8");
    
    // Clean up old stuff
    const originalConfig = viteConfig;
    
    // Add import if missing
    if (!viteConfig.includes("wwvPluginGlobals")) {
        viteConfig = viteConfig.replace(
            /(import {?.*?defineConfig.*?from "vite";)/,
            `$1\nimport { wwvPluginGlobals } from "@worldwideview/wwv-plugin-sdk";`
        );
        
        // Remove old externalGlobals import
        viteConfig = viteConfig.replace(/import externalGlobals.*?;\n?/g, "");
        
        // Add to plugins array (or create one in root)
        if (viteConfig.includes("plugins: [")) {
            // Usually plugins: [react()] or plugins: [externalGlobals(...)]
            if (viteConfig.includes("externalGlobals({")) {
                // If it has a plugins block inside rollupOptions that we need to wipe, we'll wipe rollupOptions entirely soon.
            }
        }
        
        // Standardize the whole defineConfig because many are messy or contain rollupOptions
        if (viteConfig.includes("rollupOptions")) {
             viteConfig = viteConfig.replace(/rollupOptions:\s*\{[\s\S]*?\},?\s*(?=minify|sourcemap|outDir|\})/g, "");
        }

        // Add wwvPluginGlobals() to the main plugins array.
        // It might be empty or missing. If the file imports react from "@vitejs/plugin-react", it has plugins: [react()].
        if (viteConfig.includes("plugins: [react()]")) {
            viteConfig = viteConfig.replace("plugins: [react()]", "plugins: [react(), wwvPluginGlobals()]");
        } else if (viteConfig.includes("export default defineConfig({\n  build")) {
             viteConfig = viteConfig.replace("export default defineConfig({\n", "export default defineConfig({\n  plugins: [wwvPluginGlobals()],\n");
        } else if (viteConfig.includes("export default defineConfig({\n  plugins: [\n")) {
             // Handle multiline plugins
             viteConfig = viteConfig.replace(/plugins: \[\n/, "plugins: [\n    wwvPluginGlobals(),\n");
        }
    }
    
    if (viteConfig !== originalConfig) {
        fs.writeFileSync(viteConfigPath, viteConfig);
        console.log(`  - Updated vite.config.ts`);
    } else {
        console.log(`  - vite.config.ts unchanged or already updated`);
    }
}

const dirs = fs.readdirSync(PACKAGES_DIR);
for (const d of dirs) {
    if (fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory() && d.startsWith("wwv-plugin-")) {
        updatePlugin(d);
    }
}

console.log("\nMass update completed.");
