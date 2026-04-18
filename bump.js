const { execSync } = require('child_process');
const fs = require('fs');
const targetDirs = [
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-wildfire',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-satellite',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-military-aviation',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-maritime',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-iranwarlive',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-aviation'
];

targetDirs.forEach(dir => {
    console.log(`\n--- Processing ${dir} ---`);
    const pkgPath = `${dir}/package.json`;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Increment patch
    const parts = pkg.version.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    pkg.version = parts.join('.');
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Bumped version to ${pkg.version}`);
    
    execSync('pnpm build', { cwd: dir, stdio: 'inherit' });
    execSync('npm publish --access public', { cwd: dir, stdio: 'inherit' });
});

