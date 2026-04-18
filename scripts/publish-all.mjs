import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.join(__dirname, '..', 'packages');

const dirs = fs.readdirSync(packagesDir);

for (const dir of dirs) {
  const pkgDir = path.join(packagesDir, dir);
  const stat = fs.statSync(pkgDir);
  if (!stat.isDirectory()) continue;

  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;

  try {
    console.log(`\n===========================================`);
    console.log(`Bumping and publishing ${dir}...`);
    console.log(`===========================================`);
    
    // Bump patch version
    execSync('npm version patch', { cwd: pkgDir, stdio: 'inherit' });
    
    // If it has a build script, run it
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (pkgJson.scripts && pkgJson.scripts.build) {
      console.log(`Building ${dir}...`);
      execSync('pnpm build', { cwd: pkgDir, stdio: 'inherit' });
    }
    
    // Publish
    execSync('npm publish --access public', { cwd: pkgDir, stdio: 'inherit' });
    
    console.log(`✅ Fully published ${dir}!`);
  } catch (e) {
    console.error(`❌ Failed on ${dir}:`, e.message);
  }
}
