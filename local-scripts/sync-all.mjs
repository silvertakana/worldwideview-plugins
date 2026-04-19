import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.resolve(rootDir, 'packages');
const cliBundlePath = path.resolve(packagesDir, 'wwv-cli', 'dist', 'index.mjs');
const engineTarget = path.resolve(rootDir, '..', 'worldwideview'); // C:\dev\worldwideview

if (!fs.existsSync(cliBundlePath)) {
    console.error(`CLI bundle not found at: ${cliBundlePath}`);
    console.error('Please run "pnpm run build" in packages/wwv-cli first.');
    process.exit(1);
}

const isWindows = process.platform === 'win32';

async function main() {
    console.log("===================================");
    console.log("🌎 WorldWideView - Sync All Plugins");
    console.log("===================================\n");

    const packages = fs.readdirSync(packagesDir).filter(dir => 
        dir.startsWith('wwv-plugin-') && 
        fs.existsSync(path.join(packagesDir, dir, 'package.json'))
    );

    console.log(`Found ${packages.length} plugins to sync!`);
    console.log(`Target Engine: ${engineTarget}\n`);

    const processes = [];

    for (const plugin of packages) {
        const pluginDir = path.join(packagesDir, plugin);
        console.log(`[+] Starting link for ${plugin}...`);

        const child = spawn(isWindows ? 'node.exe' : 'node', [cliBundlePath, 'link', engineTarget], {
            cwd: pluginDir,
            stdio: 'pipe',
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        child.stdout.on('data', (data) => {
            const prefix = `\x1b[36m[${plugin}]\x1b[0m `;
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach(line => process.stdout.write(`${prefix}${line}\n`));
        });

        child.stderr.on('data', (data) => {
            const prefix = `\x1b[31m[${plugin}]\x1b[0m `;
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach(line => process.stderr.write(`${prefix}${line}\n`));
        });

        child.on('error', (err) => {
            console.error(`Failed to start subprocess for ${plugin}:`, err);
        });

        processes.push(child);
    }

    // Handle graceful shutdown
    const killAll = () => {
        console.log("\nShutting down all sync processes...");
        processes.forEach(p => p.kill());
        process.exit();
    };

    process.on('SIGINT', killAll);
    process.on('SIGTERM', killAll);
}

main().catch(console.error);
