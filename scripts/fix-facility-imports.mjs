import fs from 'fs';
import path from 'path';

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';
const pkgs = [
    'wwv-plugin-volcanoes',
    'wwv-plugin-spaceports',
    'wwv-plugin-seaports',
    'wwv-plugin-lighthouses',
    'wwv-plugin-embassies',
    'wwv-plugin-airports',
    'wwv-plugin-military-bases',
    'wwv-plugin-nuclear'
];

let fixedCount = 0;

for (const pkg of pkgs) {
    const file = path.join(packagesDir, pkg, 'src', 'index.ts');
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf-8');
    let patched = false;

    // Fix missing import
    if (!content.includes('import geojsonData from "../data/data.json";') && content.includes('geojsonData = geojsonData;')) {
        content = `import geojsonData from "../data/data.json";\n` + content;
        patched = true;
    }

    // Fix export class -> export default class
    if (content.includes('export class ') && !content.includes('export default class ')) {
        content = content.replace(/export class\s+([a-zA-Z0-9_]+)/g, 'export default class $1');
        patched = true;
    }

    // If military-bases or nuclear didn't have geojson properly declared, ensure it
    if (patched) {
        fs.writeFileSync(file, content);
        console.log(`[FIXED] ${pkg}`);
        fixedCount++;
    }
}

console.log(`Fixed ${fixedCount} facility plugins.`);
