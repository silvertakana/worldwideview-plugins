#!/usr/bin/env node

// src/scaffold.ts
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
var __dirname = dirname(fileURLToPath(import.meta.url));
function scaffold(name, templateType) {
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const dir = resolve(process.cwd(), slug);
  console.log(`
\u{1F30D} Creating WorldWideView plugin: ${slug}
`);
  mkdirSync(join(dir, "src"), { recursive: true });
  if (templateType === "backend-host") {
    mkdirSync(join(dir, "plugins"), { recursive: true });
    writeFileSync(join(dir, "plugins", ".gitkeep"), "");
    console.log(`  \u2713 plugins/`);
  }
  const templateDir = join(__dirname, "..", "templates", templateType);
  const files = readdirSync(templateDir);
  for (const file of files) {
    let content = readFileSync(join(templateDir, file), "utf8");
    content = content.replace(/\{\{SLUG\}\}/g, slug);
    content = content.replace(
      /\{\{NAME\}\}/g,
      slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("")
    );
    const outName = file.replace(/\.tpl$/, "");
    let dest;
    if (outName === "index.ts" || outName === "backend.ts" || outName === "server.ts") {
      dest = join(dir, "src", outName);
    } else {
      dest = join(dir, outName);
    }
    writeFileSync(dest, content);
    console.log(`  \u2713 ${dest.replace(dir + "\\", "").replace(dir + "/", "")}`);
  }
  console.log(`
\u2705 Done! Next steps:`);
  console.log(`  cd ${slug}`);
  console.log(`  npm install`);
  if (templateType === "backend-host") {
    console.log(`  `);
    console.log(`  # Start your plugin host:`);
    console.log(`  npm run dev
`);
  } else {
    console.log(`  `);
    console.log(`  # 1. Point the CLI to your running WorldWideView instance`);
    console.log(`  npx wwv config set wwv-path C:\\path\\to\\your\\worldwideview`);
    console.log(`  `);
    console.log(`  # 2. Link your plugin into the engine`);
    console.log(`  npm run link`);
    console.log(`  `);
    console.log(`  # 3. Start compiling your code on save`);
    console.log(`  npm run dev
`);
  }
}

// src/index.ts
import * as readline from "node:readline/promises";
async function main() {
  let name = process.argv[2];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!name) {
    name = await rl.question("Plugin name (e.g. my-custom-aviation): ");
  }
  if (!name) {
    console.error("Usage: npx @worldwideview/create-plugin <plugin-name>");
    process.exit(1);
  }
  console.log("\nWhat type of plugin do you want to create?");
  console.log("1. Frontend-Only (Connects to existing REST APIs or your private backend)");
  console.log("2. Full-Stack (Includes a Fastify backend seeder for the Data Engine)");
  console.log("3. Shared Backend Host (A BYOB Docker container for Coolify/Railway to host your compiled backends)");
  let type = await rl.question("\nEnter choice (1, 2, or 3): ");
  rl.close();
  let templateType = "frontend";
  if (type.trim() === "2") templateType = "fullstack";
  if (type.trim() === "3") templateType = "backend-host";
  scaffold(name, templateType);
}
main().catch(console.error);
