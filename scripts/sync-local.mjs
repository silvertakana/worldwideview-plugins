import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginName = process.argv[2];
if (!pluginName) {
  console.error("❌ Please provide a plugin directory name.");
  console.error("Usage: pnpm run sync wwv-plugin-camera");
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'packages', pluginName);

if (!fs.existsSync(pkgPath)) {
  console.error(`❌ Plugin directory '${pluginName}' not found in packages/`);
  process.exit(1);
}

const pkgJsonPath = path.join(pkgPath, 'package.json');
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

const wwvConfig = pkgJson.worldwideview;
if (!wwvConfig || !wwvConfig.id) {
  console.error("❌ No valid 'worldwideview' configuration found in package.json");
  process.exit(1);
}

// Assemble the manifest required by WorldWideView natively
const manifest = {
    ...wwvConfig,
    name: wwvConfig.id, 
    version: pkgJson.version,
    trust: "unverified",
    entry: `/plugins/${wwvConfig.id}/frontend.mjs`,
};

if (!manifest.capabilities || manifest.capabilities.length === 0) {
    manifest.capabilities = ["layer"];
}

// Target directory in the local WorldWideView engine
const wwvAppDir = path.join(rootDir, '..', 'worldwideview', 'public', 'plugins', wwvConfig.id);

if (!fs.existsSync(wwvAppDir)) {
  fs.mkdirSync(wwvAppDir, { recursive: true });
}

// 1. Write the proxy manifest
fs.writeFileSync(path.join(wwvAppDir, 'plugin.json'), JSON.stringify(manifest, null, 2));
console.log(`✅ Proxy manifest injected to WWV: ${wwvConfig.id}`);

const sourceFile = path.join(pkgPath, 'dist', 'frontend.mjs');
const destFile = path.join(wwvAppDir, 'frontend.mjs');

function copyDist() {
    if (fs.existsSync(sourceFile)) {
        try {
            fs.copyFileSync(sourceFile, destFile);
            console.log(`[Sync] Copied frontend.mjs -> WWV public folder`);
        } catch (e) {
            // Ignore EBUSY if Vite is actively writing
        }
    }
}

// 2. Start Vite in watch mode
console.log(`🚀 Starting Vite in watch mode for ${pluginName}...`);
const buildProc = spawn('npx', ['vite', 'build', '--watch'], { 
    cwd: pkgPath, 
    stdio: 'inherit',
    shell: true 
});

// 3. Watch the local dist folder and proxy it over to WWV automatically
const distDir = path.join(pkgPath, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

let timeout;
fs.watch(distDir, (eventType, filename) => {
    if (filename === 'frontend.mjs') {
        clearTimeout(timeout);
        // Add a slight delay to allow Vite to finish flushing the file to disk
        timeout = setTimeout(copyDist, 200); 
    }
});

console.log(`\n=============================================================`);
console.log(`🔥 LOCAL SYNC ACTIVE: ${pluginName}`);
console.log(`1. Edit files inside packages/${pluginName}/src/`);
console.log(`2. Vite will automatically rebuild on save.`);
console.log(`3. The bundle is automatically copied to your WWV Dev Server.`);
console.log(`4. Just refresh your browser at localhost:3000 to see changes!`);
console.log(`=============================================================\n`);
