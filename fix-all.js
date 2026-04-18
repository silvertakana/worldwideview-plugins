const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const packagesDir = 'c:/dev/worldwideview-plugins/packages';
const pluginsDir = fs.readdirSync(packagesDir).filter(p => p.startsWith('wwv-plugin-'));

for (const plugin of pluginsDir) {
    const srcDir = path.join(packagesDir, plugin, 'src');
    if (!fs.existsSync(srcDir)) continue;
    
    let changed = false;
    walkDir(srcDir, (filePath) => {
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let newContent = content
                .replace(/['"]http:\/\/localhost:5001\/?['"]/g, "'https://dataengine.worldwideview.dev'")
                .replace(/['"]http:\/\/localhost:5000\/?['"]/g, "'https://dataengine.worldwideview.dev'");
            if (content !== newContent) {
                fs.writeFileSync(filePath, newContent);
                console.log(`Updated ${filePath}`);
                changed = true;
            }
        }
    });
    
    if (changed) {
        // Bump version and publish
        const pkgPath = path.join(packagesDir, plugin, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const parts = pkg.version.split('.');
        parts[2] = parseInt(parts[2]) + 1;
        pkg.version = parts.join('.');
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        
        console.log(`Bumping ${plugin} to ${pkg.version}...`);
        
        // Build and publish
        try {
            console.log(`Building ${plugin}...`);
            execSync('pnpm build', { cwd: path.join(packagesDir, plugin), stdio: 'inherit' });
            console.log(`Publishing ${plugin}...`);
            execSync('npm publish --access public', { cwd: path.join(packagesDir, plugin), stdio: 'inherit' });
        } catch (e) {
            console.error(`Failed to publish ${plugin}`, e.message);
        }
    }
}
