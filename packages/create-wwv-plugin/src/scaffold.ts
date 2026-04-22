import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function scaffold(name: string, templateType: "frontend" | "fullstack" | "backend-host"): void {
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const dir = resolve(process.cwd(), slug);

    console.log(`\n🌍 Creating WorldWideView plugin: ${slug}\n`);
    mkdirSync(join(dir, "src"), { recursive: true });

    if (templateType === "backend-host") {
        mkdirSync(join(dir, "plugins"), { recursive: true });
        writeFileSync(join(dir, "plugins", ".gitkeep"), "");
        console.log(`  ✓ plugins/`);
    }

    const templateDir = join(__dirname, "..", "templates", templateType);
    const files = readdirSync(templateDir);

    for (const file of files) {
        let content = readFileSync(join(templateDir, file), "utf8");
        content = content.replace(/\{\{SLUG\}\}/g, slug);
        content = content.replace(
            /\{\{NAME\}\}/g,
            slug
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(""),
        );

        // Strip .tpl extension and route files correctly
        const outName = file.replace(/\.tpl$/, "");
        let dest;
        if (outName === "index.ts" || outName === "backend.ts" || outName === "server.ts") {
            dest = join(dir, "src", outName);
        } else {
            dest = join(dir, outName);
        }

        writeFileSync(dest, content);
        console.log(`  ✓ ${dest.replace(dir + "\\", "").replace(dir + "/", "")}`);
    }

    console.log(`\n✅ Done! Next steps:`);
    console.log(`  cd ${slug}`);
    console.log(`  npm install`);
    
    if (templateType === "backend-host") {
        console.log(`  `);
        console.log(`  # Start your plugin host:`);
        console.log(`  npm run dev\n`);
    } else {
        console.log(`  `);
        console.log(`  # 1. Point the CLI to your running WorldWideView instance`);
        console.log(`  npx wwv config set wwv-path C:\\path\\to\\your\\worldwideview`);
        console.log(`  `);
        console.log(`  # 2. Link your plugin into the engine`);
        console.log(`  npm run link`);
        console.log(`  `);
        console.log(`  # 3. Start compiling your code on save`);
        console.log(`  npm run dev\n`);
    }
}
