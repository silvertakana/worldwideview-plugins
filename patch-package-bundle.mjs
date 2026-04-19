import fs from 'fs';
import path from 'path';

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';
const dirs = fs.readdirSync(packagesDir);

let patched = 0;

for (const dir of dirs) {
  if (!dir.startsWith('wwv-plugin-') || dir === 'wwv-plugin-sdk') continue;

  const pkgPath = path.join(packagesDir, dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgRaw);

  if (pkg.worldwideview && pkg.worldwideview.format !== "bundle") {
    pkg.worldwideview.format = "bundle";
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(`[PATCHED] ${dir} format -> bundle`);
    patched++;
  }
}

console.log(`Done. Patched ${patched} packages.`);
