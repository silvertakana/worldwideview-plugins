import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packagesToRepublish = [
  'wwv-lib-facilities',
  'wwv-plugin-airports',
  'wwv-plugin-embassies',
  'wwv-plugin-lighthouses',
  'wwv-plugin-seaports',
  'wwv-plugin-spaceports',
  'wwv-plugin-volcanoes',
  'wwv-plugin-nuclear'
];

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';

for (const pkg of packagesToRepublish) {
  const dir = path.join(packagesDir, pkg);
  
  if (!fs.existsSync(dir)) continue;

  try {
    console.log(`\nBuilding and publishing ${pkg}...`);
    execSync('npm version patch', { cwd: dir, stdio: 'inherit' });
    execSync('pnpm build', { cwd: dir, stdio: 'inherit' });
    execSync('npm publish --access public', { cwd: dir, stdio: 'inherit' });
    console.log(`✅ Fully built and published ${pkg}!`);
  } catch (e) {
    console.error(`❌ Failed on ${pkg}:`, e.message);
  }
}
