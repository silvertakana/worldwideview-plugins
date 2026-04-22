import fs from "fs";
import path from "path";

export function deployBackendCommand(cwd: string, hostPath: string) {
    if (!hostPath) {
        console.error("Please provide the path to your shared backend host.\nExample: wwv deploy-backend ../my-backend");
        process.exit(1);
    }

    const packageJsonPath = path.join(cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        console.error("package.json not found. Are you running this from the plugin root?");
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const pluginName = packageJson.name.replace("wwv-plugin-", "");

    const sourceFile = path.join(cwd, "dist", "backend.mjs");
    const destDir = path.join(cwd, hostPath, "plugins", pluginName);
    const destFile = path.join(destDir, "backend.mjs");

    if (!fs.existsSync(sourceFile)) {
        console.error("dist/backend.mjs not found. Run 'npm run build' first.");
        process.exit(1);
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourceFile, destFile);

    console.log(`✅ Successfully deployed backend to:`);
    console.log(`   ${path.resolve(destFile)}`);
}
