import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getConfig } from '../config.js';

const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;

export function linkCommand(cwd: string, targetDir?: string) {
    let finalTarget = targetDir;
    
    if (!finalTarget) {
        finalTarget = getConfig('wwv-path') || undefined;
    }
    
    if (!finalTarget) {
        console.error(red("❌ No target directory provided and no 'wwv-path' config found."));
        console.error("Please run `wwv config set wwv-path <path>` or provide the path explicitly.");
        process.exit(1);
    }

    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        console.error(red(`❌ Cannot link: No package.json found in ${cwd}`));
        process.exit(1);
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const wwvConfig = pkgJson.worldwideview;

    if (!wwvConfig || !wwvConfig.id) {
        console.error(red(`❌ Cannot link: No valid 'worldwideview.id' configuration found in package.json.`));
        process.exit(1);
    }

    const pluginId = wwvConfig.id;

    const manifest = {
        id: pluginId,
        name: wwvConfig.name || pluginId,
        version: pkgJson.version,
        description: pkgJson.description || "",
        type: wwvConfig.type || "data-layer",
        format: wwvConfig.format || "bundle",
        trust: wwvConfig.trust || "unverified",
        capabilities: wwvConfig.capabilities || ["layer"],
        category: wwvConfig.category || "custom",
        icon: wwvConfig.icon,
        // When linking, it'll be locally sourced
        entry: `/plugins-local/${pluginId}/frontend.mjs`,
    };

    // Construct the destination. targetDir might be the root of the UI server (../worldwideview)
    // or you might pass the absolute path to public/plugins-local directly.
    let wwvAppDir = finalTarget;
    if (!wwvAppDir.includes('plugins-local')) {
        // Assume they passed the UI root directory
        wwvAppDir = path.join(finalTarget, 'public', 'plugins-local');
    }
    
    const finalDestDir = path.join(wwvAppDir, pluginId);

    if (!fs.existsSync(finalDestDir)) {
        fs.mkdirSync(finalDestDir, { recursive: true });
    }

    fs.writeFileSync(path.join(finalDestDir, 'plugin.json'), JSON.stringify(manifest, null, 2));
    console.log(green(`✅ Proxy manifest injected to WWV instance: ${pluginId}`));

    const sourceFile = path.join(cwd, 'dist', 'frontend.mjs');
    const destFile = path.join(finalDestDir, 'frontend.mjs');

    function copyDist() {
        if (fs.existsSync(sourceFile)) {
            try {
                fs.copyFileSync(sourceFile, destFile);
                console.log(`[wwv link] Copied frontend bundle -> WWV public folder`);
            } catch (e) {}
        }
    }

    function copyData() {
        const dataDir = path.join(cwd, 'data');
        const finalDataDir = path.join(finalDestDir, 'data');
        if (fs.existsSync(dataDir)) {
            if (!fs.existsSync(finalDataDir)) fs.mkdirSync(finalDataDir, { recursive: true });
            
            const files = fs.readdirSync(dataDir);
            for (const file of files) {
                try {
                    fs.copyFileSync(path.join(dataDir, file), path.join(finalDataDir, file));
                    console.log(`[wwv link] Copied data/${file} -> WWV public folder`);
                } catch (e) {}
            }
        }
    }

    copyDist();
    copyData();

    console.log(`🚀 Starting local Vite bundler in watch mode...`);
    const buildProc = spawn('npx', ['vite', 'build', '--watch'], {
        cwd: cwd,
        stdio: 'inherit',
        shell: true
    });

    const distDir = path.join(cwd, 'dist');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

    let timeout: any;
    fs.watch(distDir, (eventType, filename) => {
        if (filename === 'frontend.mjs') {
            clearTimeout(timeout);
            timeout = setTimeout(copyDist, 200);
        }
    });

    console.log(`\n=============================================================`);
    console.log(`🔥 LOCAL SYNC ACTIVE: ${pluginId}`);
    console.log(`1. Edit files inside your src/ directory.`);
    console.log(`2. Vite automatically rebuilds.`);
    console.log(`3. The bundle is automatically copied to your WWV Dev Server.`);
    console.log(`4. Just refresh your browser at localhost:3000 to see changes!`);
    console.log(`=============================================================\n`);
}
