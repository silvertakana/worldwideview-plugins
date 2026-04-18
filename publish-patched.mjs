import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packagesDir = 'C:\\dev\\worldwideview-plugins\\packages';

const packagesToRepublish = [
  'wwv-plugin-civil-unrest',
  'wwv-plugin-conflict-events',
  'wwv-plugin-cyber-attacks',
  'wwv-plugin-gps-jamming',
  'wwv-plugin-international-sanctions',
  'wwv-plugin-osm-search',
  'wwv-plugin-surveillance-satellites',
  'wwv-plugin-undersea-cables'
];

for (const pkg of packagesToRepublish) {
  const dir = path.join(packagesDir, pkg);
  console.log(`\n========================================`);
  console.log(`Processing ${pkg}...`);
  try {
    console.log("Bumping version...");
    execSync('npm version patch', { cwd: dir, stdio: 'inherit' });
    
    console.log("Building (if applicable)...");
    try {
      execSync('pnpm build', { cwd: dir, stdio: 'inherit' });
    } catch {
      console.log("No build step needed or build failed, continuing to publish...");
    }

    console.log("Publishing...");
    execSync('npm publish --access public', { cwd: dir, stdio: 'inherit' });
    
    console.log(`✅ Success for ${pkg}`);
  } catch (err) {
    console.error(`❌ Failed on ${pkg}:`, err.message);
  }
}
