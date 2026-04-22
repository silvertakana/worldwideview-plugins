import Fastify from "fastify";
import { readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const server = Fastify({ logger: true });

async function loadPlugins() {
    const pluginsDir = new URL("../plugins", import.meta.url);
    try {
        const dirs = readdirSync(pluginsDir, { withFileTypes: true });
        for (const dir of dirs) {
            if (!dir.isDirectory()) continue;
            try {
                const pluginPath = fileURLToPath(new URL(`../plugins/${dir.name}/backend.mjs`, import.meta.url));
                // Dynamic import requires file:// protocol on Windows
                const plugin = await import(`file://${pluginPath}`);
                if (plugin.default && plugin.default.registerRoutes) {
                    plugin.default.registerRoutes(server);
                    server.log.info(`Successfully loaded plugin: ${dir.name}`);
                }
            } catch (err) {
                server.log.error(`Failed to load plugin ${dir.name}: ${err}`);
            }
        }
    } catch (e) {
        server.log.info("No plugins directory found or empty. Create a /plugins folder to add backend modules.");
    }
}

server.get("/", async () => {
    return { status: "WorldWideView Plugin Host Running", engine: "Fastify" };
});

async function start() {
    await loadPlugins();
    const port = process.env.PORT ? Number(process.env.PORT) : 5001;
    await server.listen({ port, host: "0.0.0.0" });
}

start();
