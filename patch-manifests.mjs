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

  if (!pkg.worldwideview || Object.keys(pkg.worldwideview).length === 0) {
    const defaultId = dir.replace('wwv-plugin-', '');
    
    // Guess category from name
    let category = "Custom";
    if (dir.includes('aviation') || dir.includes('airport')) category = "Aviation";
    else if (dir.includes('maritime') || dir.includes('seaport') || dir.includes('lighthouse')) category = "Maritime";
    else if (dir.includes('military') || dir.includes('defense')) category = "Military";
    else if (dir.includes('conflict') || dir.includes('unrest')) category = "Conflict";
    else if (dir.includes('cyber') || dir.includes('jamming')) category = "Intelligence";
    else if (dir.includes('satellite') || dir.includes('space')) category = "Space";
    else if (dir.includes('volcano') || dir.includes('earthquake') || dir.includes('wildfire')) category = "Natural Disaster";
    else if (dir.includes('borders') || dir.includes('embassies')) category = "Infrastructure";
    
    // Generate an icon name based on category
    let icon = "Layer";
    if (category === "Aviation") icon = "Plane";
    else if (category === "Maritime") icon = "Ship";
    else if (category === "Military") icon = "Shield";
    else if (category === "Conflict") icon = "Crosshair";
    else if (category === "Space") icon = "Rocket";
    else if (category === "Natural Disaster") icon = "Flame";

    pkg.worldwideview = {
      id: defaultId,
      format: "bundle",
      category: category,
      icon: icon
    };

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(`[PATCHED] Added worldwideview block to ${dir}`);
    patched++;
  }
}

console.log(`Done. Patched ${patched} packages.`);
