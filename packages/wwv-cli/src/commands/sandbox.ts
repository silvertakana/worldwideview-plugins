import { spawn } from 'child_process';
import path from 'path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
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
}
