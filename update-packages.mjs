import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "C:\\dev\\worldwideview-plugins\\packages";
const PUBLIC_DATA_DIR = "C:\\dev\\worldwideview\\public\\data";

const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const packageJsonPath = join(pkgPath, "package.json");

    if (!existsSync(packageJsonPath)) continue;

    // 1. Update package.json
    const pkgJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    
    // Replace sdk peerDep from workspace:* to ^1.2.1
    if (pkgJson.peerDependencies && pkgJson.peerDependencies["@worldwideview/wwv-plugin-sdk"]) {
        pkgJson.peerDependencies["@worldwideview/wwv-plugin-sdk"] = "^1.2.1";
    }

    // Update repository
    if (pkgJson.repository && pkgJson.repository.url) {
        pkgJson.repository.url = pkgJson.repository.url.replace("worldwideview.git", "worldwideview-plugins.git");
        pkgJson.repository.directory = `packages/${pkg}`;
    }

    // 2. Move GeoJSON if it's a static plugin
    const isStatic = pkgJson.worldwideview?.format === "static";
    let hasData = false;
    
    if (isStatic && pkgJson.worldwideview?.id) {
        const pluginId = pkgJson.worldwideview.id;
        // some plugins might share a name with their ID, or maybe we just check if geojson exists
        const geojsonName = `${pluginId}.geojson`;
        const sourceGeojsonPath = join(PUBLIC_DATA_DIR, geojsonName);
        
        if (existsSync(sourceGeojsonPath)) {
            const destDataDir = join(pkgPath, "data");
            if (!existsSync(destDataDir)) mkdirSync(destDataDir, { recursive: true });
            const destGeojsonPath = join(destDataDir, geojsonName);
            
            // Move file
            writeFileSync(destGeojsonPath, readFileSync(sourceGeojsonPath));
            console.log(`Moved ${geojsonName} to ${pkg}`);
            hasData = true;
        }
    }

    // Include data in published files if we have it
    if (hasData) {
        if (Array.isArray(pkgJson.files) && !pkgJson.files.includes("data")) {
            pkgJson.files.push("data");
        }
    }

    writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
}
console.log("Package updates complete.");
