import { spawn } from 'child_process';
import path from 'path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import fs from 'fs';

const miniGlobeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WWV Mini-Globe Sandbox</title>
    <script src="https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Cesium.js"></script>
    <link href="https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
    <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        #cesiumContainer { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="cesiumContainer"></div>
    <script>
        window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/';
        const viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: await Cesium.createWorldTerrainAsync()
        });
        
        // Stub WWV global state
        window.wwvDataBus = {
            on: (event, cb) => console.log('Subscribed to', event),
            emit: (event, data) => console.log('Emitted', event, data)
        };
        window.wwvViewer = viewer;
    </script>
    <!-- Load the plugin frontend -->
    <script type="module" src="/dist/frontend.mjs"></script>
</body>
</html>
`;

export async function sandboxCommand(cwd: string) {
    console.log("🚀 Starting WorldWideView Sandbox...");
    
    console.log("📦 Starting Vite Compiler...");
    const viteProcess = spawn('npx', ['vite', 'build', '--watch'], {
        cwd: cwd,
        stdio: 'inherit',
        shell: true
    });
    
    process.on('SIGINT', () => {
        viteProcess.kill();
        process.exit();
    });

    const frontendServer = Fastify();
    
    frontendServer.register(fastifyStatic, {
        root: path.join(cwd, 'dist'),
        prefix: '/dist/',
    });

    frontendServer.get('/', async (request, reply) => {
        reply.type('text/html').send(miniGlobeHtml);
    });

    await frontendServer.listen({ port: 3000 });
    console.log("🌍 Mini-Globe running at http://localhost:3000");

    let backendServer: any = null;

    async function startBackend() {
        if (backendServer) {
            await backendServer.close();
        }

        backendServer = Fastify();
        await backendServer.register(cors);

        const backendFile = path.join(cwd, 'dist', 'backend.mjs');
        if (fs.existsSync(backendFile)) {
            try {
                // Cache bust
                const backendModule = await import(`file://${backendFile}?t=${Date.now()}`);
                if (backendModule.default && backendModule.default.registerRoutes) {
                    backendModule.default.registerRoutes(backendServer);
                }
            } catch (err) {
                console.error("❌ Failed to load backend.mjs:", err);
            }
        }

        await backendServer.listen({ port: 5001 });
        console.log("⚙️  Mini-Engine running at http://localhost:5001");
    }

    // Initial start (give Vite a second to compile)
    setTimeout(startBackend, 2000);

    // Watch for backend rebuilds
    const distDir = path.join(cwd, 'dist');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    
    let debounce: any;
    fs.watch(distDir, (eventType, filename) => {
        if (filename === 'backend.mjs') {
            clearTimeout(debounce);
            debounce = setTimeout(startBackend, 500);
        }
    });
}
