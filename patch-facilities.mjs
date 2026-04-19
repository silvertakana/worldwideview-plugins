import fs from 'fs';
import path from 'path';

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';
const dirs = fs.readdirSync(packagesDir);

let patched = 0;

for (const dir of dirs) {
  if (!dir.startsWith('wwv-plugin-')) continue;

  const pkgDir = path.join(packagesDir, dir);
  let indexFile = path.join(pkgDir, 'src', 'index.ts');
  if (!fs.existsSync(indexFile)) {
    indexFile = path.join(pkgDir, 'src', 'index.tsx');
  }

  if (!fs.existsSync(indexFile)) continue;

  let content = fs.readFileSync(indexFile, 'utf-8');

  if (content.includes('extends BaseFacilityPlugin')) {
    const dataDir = path.join(pkgDir, 'data');
    if (fs.existsSync(dataDir)) {
      // Find .geojson
      const files = fs.readdirSync(dataDir);
      for (const f of files) {
        if (f.endsWith('.geojson')) {
          fs.renameSync(path.join(dataDir, f), path.join(dataDir, 'data.json'));
          console.log(`[RENAMED] ${dir}/data/${f} -> data.json`);
        }
      }
      
      // Update index.ts
      if (!content.includes('import geojsonData from "../data/data.json";')) {
        // inject import
        content = content.replace(
          /(import .* from "@worldwideview\/wwv-plugin-sdk";\n)/,
          '$1import geojsonData from "../data/data.json";\n'
        );
        // inject class property
        content = content.replace(
          /(id\s*=\s*".*";)/,
          '$1\n    protected geojsonData = geojsonData;'
        );
        
        fs.writeFileSync(indexFile, content, 'utf-8');
        console.log(`[PATCHED] ${dir} src/index.ts`);
        patched++;
      }
    }
  }
}

console.log(`Done patching ${patched} facility plugins.`);
