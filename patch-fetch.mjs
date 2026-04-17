import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "C:\\dev\\worldwideview-plugins\\packages";
const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const indexTsPath = join(pkgPath, "src", "index.ts");
    const indexTsxPath = join(pkgPath, "src", "index.tsx");
    
    let targetFile = indexTsPath;
    if (!existsSync(targetFile)) targetFile = indexTsxPath;
    if (!existsSync(targetFile)) continue;

    const content = readFileSync(targetFile, "utf-8");
    
    // Look for fetch("/data/...")
    const regex = /fetch\(\s*["']\/data\/([^"']+)["']\s*\)/g;
    if (regex.test(content)) {
        const pkgJson = JSON.parse(readFileSync(join(pkgPath, "package.json"), "utf-8"));
        const newContent = content.replace(regex, `fetch("https://cdn.jsdelivr.net/npm/${pkgJson.name}@latest/data/$1")`);
        
        // Bump version
        const vParts = pkgJson.version.split(".");
        vParts[2] = (parseInt(vParts[2], 10) + 1).toString();
        pkgJson.version = vParts.join(".");
        
        writeFileSync(targetFile, newContent);
        writeFileSync(join(pkgPath, "package.json"), JSON.stringify(pkgJson, null, 2) + "\n");
        console.log(`Patched ${pkg} (bumped to ${pkgJson.version})`);
    }
}
