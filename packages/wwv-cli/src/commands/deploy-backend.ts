import fs from "fs";
import path from "path";

export function deployBackendCommand(pluginDir: string, hostPath: string) {
    if (!hostPath) {
        console.error("❌ Please provide the path to your shared backend host.\nExample: wwv deploy-backend ../my-backend");
        process.exit(1);
    }

    // Attempt to load plugin.json or package.json to get the plugin slug
    let pluginSlug = "";
    const packageJsonPath = path.join(pluginDir, "package.json");
    const pluginJsonPath = path.join(pluginDir, "plugin.json");

    if (fs.existsSync(pluginJsonPath)) {
        const pjson = JSON.parse(fs.readFileSync(pluginJsonPath, "utf-8"));
        pluginSlug = pjson.id;
    } else if (fs.existsSync(packageJsonPath)) {
        const pjson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        pluginSlug = pjson.worldwideview?.id || pjson.name.replace("wwv-plugin-", "");
    }

    if (!pluginSlug) {
        console.error("❌ Could not determine plugin ID. Make sure worldwideview.id is set in package.json or plugin.json exists.");
        process.exit(1);
    }

    const sourceFile = path.join(pluginDir, "dist", "backend.mjs");
    const destDir = path.resolve(pluginDir, hostPath, "plugins", pluginSlug);
    const destFile = path.join(destDir, "backend.mjs");

    if (!fs.existsSync(sourceFile)) {
        console.error("❌ dist/backend.mjs not found. Run 'npm run build' first.");
        process.exit(1);
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourceFile, destFile);

    console.log(`✅ Successfully deployed backend to:`);
    console.log(`   ${destFile}`);
}
