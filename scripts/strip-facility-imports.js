const fs = require('fs');
const path = require('path');

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

let stripCount = 0;

for (const pkg of pkgs) {
    const file = path.join(packagesDir, pkg, 'src', 'index.ts');
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf-8');
    let patched = false;

    // Strip geojsonData import
    if (content.includes('import geojsonData')) {
        content = content.replace(/import\s+geojsonData\s+from\s+['"].*data\.json['"];?\n?/, '');
        patched = true;
    }

    // Strip protected geojsonData = geojsonData;
    if (content.includes('protected geojsonData = geojsonData;')) {
        content = content.replace(/[ \t]*protected\s+geojsonData\s*=\s*geojsonData;\n?/, '');
        patched = true;
    }

    // If airports, wipe out the old fetch override, we let base class handle it!
    if (pkg === 'wwv-plugin-airports' && content.includes('async fetch')) {
        content = content.replace(/[ \t]*async fetch[^{]*\{[\s\S]*\}\n?/, '');
        patched = true;
    }

    if (patched) {
        fs.writeFileSync(file, content);
        console.log(`[STRIPPED] ${pkg}`);
        stripCount++;
    }
}

console.log(`Stripped imports from ${stripCount} facility plugins.`);
