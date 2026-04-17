import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "C:\\dev\\worldwideview-plugins\\packages";
const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const buildPath = join(pkgPath, "dist", "frontend.mjs");
    const pkgJsonPath = join(pkgPath, "package.json");
    
    if (!existsSync(buildPath) || !existsSync(pkgJsonPath)) continue;

    const content = readFileSync(buildPath, "utf-8");
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    
    // In webpack/vite output, fetch might look like `fetch("/data/airports.geojson")` or `fetch("/data/embassies.geojson")`
    // Let's replace any fetch("/data/xyz") with the NPM CDN!
    const regex = /"\/data\/([^"]+\.geojson)"/g;
    
    if (regex.test(content)) {
        const newContent = content.replace(regex, `"https://cdn.jsdelivr.net/npm/${pkgJson.name}@latest/data/$1"`);
        
        // Bump version again to 1.0.X
        const vParts = pkgJson.version.split(".");
        vParts[2] = (parseInt(vParts[2], 10) + 1).toString();
        pkgJson.version = vParts.join(".");
        
        writeFileSync(buildPath, newContent);
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
        console.log(`Patched BUNDLE for ${pkg} (bumped to ${pkgJson.version})`);
    } else {
        // Did we already patch the bundle in a previous successful build? Maybe not.
        // Let me also check single quotes just in case
        const regexSq = /'\/data\/([^']+\.geojson)'/g;
        if (regexSq.test(content)) {
            const newContent = content.replace(regexSq, `"https://cdn.jsdelivr.net/npm/${pkgJson.name}@latest/data/$1"`);
            const vParts = pkgJson.version.split(".");
            vParts[2] = (parseInt(vParts[2], 10) + 1).toString();
            pkgJson.version = vParts.join(".");
            writeFileSync(buildPath, newContent);
            writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
            console.log(`Patched BUNDLE (sq) for ${pkg} (bumped to ${pkgJson.version})`);
        }
    }
}
