import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "C:\\dev\\worldwideview-plugins\\packages";
const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const packageJsonPath = join(pkgPath, "package.json");
    if (!existsSync(packageJsonPath)) continue;

    const pkgJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    
    if (pkgJson.dependencies && pkgJson.dependencies["@worldwideview/wwv-plugin-sdk"]) {
        pkgJson.dependencies["@worldwideview/wwv-plugin-sdk"] = "^1.2.1";
    }
    if (pkgJson.peerDependencies && pkgJson.peerDependencies["@worldwideview/wwv-plugin-sdk"]) {
        pkgJson.peerDependencies["@worldwideview/wwv-plugin-sdk"] = "^1.2.1";
    }

    writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
}
console.log("Dependencies fully patched.");
