import fs from 'fs';
import path from 'path';
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

  const pkgJsonRaw = fs.readFileSync(pkgJsonPath, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(pkgJsonRaw);
  } catch (e) {
    console.error(`Invalid package.json in ${dir}`);
    continue;
  }

  const name = pkg.name || dir;
  const description = pkg.description || `WorldWideView plugin covering ${dir.replace('wwv-plugin-', '').replace(/-/g, ' ')} features.`;
  const wwvObj = pkg.worldwideview || {};
  const category = wwvObj.category || 'Miscellaneous';
  const format = wwvObj.format || 'bundle';

  const readmeContent = `# ${name}

${description}

## Usage
This package is part of the WorldWideView plugin ecosystem. It provides the following capabilities:
- **ID:** \`${wwvObj.id || dir.replace('wwv-plugin-', '')}\`
- **Category:** ${category}
- **Format:** ${format}

## Installation
Typically installed via the WorldWideView Marketplace or discovered automatically.
If installing manually in a Next.js setup:
\`\`\`bash
npm install ${name}
\`\`\`

## Architecture
This plugin adheres to the WorldWideView standard plugin structure. As a \`${format}\` plugin, it connects to the core Event Bus and renders map capabilities.

---
*Built for WorldWideView.*
`;

  fs.writeFileSync(path.join(pkgDir, 'README.md'), readmeContent);
  console.log(`Wrote README for ${dir}`);
}
