#!/usr/bin/env node
// ─── WWV Static Plugin Scaffolder ──────────────────────────────
// Creates a complete static GeoJSON plugin from an OSM Overpass query.
//
// Usage:
//   node scripts/scaffold-osm-plugin.mjs <config.json>
//
// Config JSON shape:
//   {
//     "name":        "nuclear",          ← kebab-case plugin name
//     "displayName": "Nuclear Facilities",
//     "description": "Global nuclear power plants from OSM",
//     "osmTag":      "generator:source=nuclear",
//     "icon":        "Atom",             ← lucide-react icon name
//     "color":       "#22d3ee",
//     "category":    "Infrastructure",
//     "extraProps":  { "operator": "tags.operator || null" }
//   }

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

// ─── Parse config ───────────────────────────────────────────

const configPath = process.argv[2];
if (!configPath) {
  console.error("Usage: node scripts/scaffold-osm-plugin.mjs <config.json>");
  console.error("\nOr pass inline JSON:");
  console.error('  node scripts/scaffold-osm-plugin.mjs \'{"name":"volcanoes",...}\'');
  process.exit(1);
}

let config;
try {
  if (configPath.startsWith("{")) {
    config = JSON.parse(configPath);
  } else {
    const { readFileSync } = await import("fs");
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to parse config:", err.message);
  process.exit(1);
}

const {
  name,
  displayName,
  description,
  osmTag,
  icon = "MapPin",
  color = "#3b82f6",
  category = "Custom",
  clusterDistance = 50,
  maxEntities = 1000,
} = config;

if (!name || !displayName || !osmTag) {
  console.error("Config must include: name, displayName, osmTag");
  process.exit(1);
}

const ROOT = resolve(import.meta.dirname, "..");
const PKG_DIR = join(ROOT, "packages", `wwv-plugin-${name}`);
const SRC_DIR = join(PKG_DIR, "src");
const DATA_DIR = join(PKG_DIR, "data");

// ─── Step 1: Query Overpass ─────────────────────────────────

console.log(`\n☁️  Querying Overpass for [${osmTag}]...`);

const [tagKey, tagValue] = osmTag.split("=");
const query = `[out:json][timeout:300];(node["${tagKey}"="${tagValue}"];way["${tagKey}"="${tagValue}"];relation["${tagKey}"="${tagValue}"];);out center;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `data=${encodeURIComponent(query)}`,
});

if (!res.ok) {
  console.error(`Overpass API error: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const raw = await res.json();
const elements = raw.elements || [];
console.log(`   Found ${elements.length} elements`);

// ─── Step 2: Convert to GeoJSON ─────────────────────────────

const features = elements
  .map((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) return null;

    const tags = el.tags || {};
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        name: tags.name || tags["name:en"] || "Unknown",
        osm_id: el.id,
      },
    };
  })
  .filter(Boolean);

const geojson = { type: "FeatureCollection", features };

mkdirSync(DATA_DIR, { recursive: true });
const geojsonPath = join(DATA_DIR, `${name}.geojson`);
writeFileSync(geojsonPath, JSON.stringify(geojson));
console.log(`📦 Wrote ${features.length} features → packages/wwv-plugin-${name}/data/${name}.geojson`);

// ─── Step 3: Scaffold package ───────────────────────────────

mkdirSync(SRC_DIR, { recursive: true });

const packageJson = {
  name: `@worldwideview/wwv-plugin-${name}`,
  version: "1.0.0",
  description: `WorldWideView plugin — ${description || displayName}`,
  main: "src/index.ts",
  types: "src/index.ts",
  files: ["src", "data"],
  keywords: [
    "worldwideview", "worldwideview-plugin",
    `wwv-plugin-${name}`, name,
  ],
  repository: {
    type: "git",
    url: "https://github.com/silvertakana/worldwideview.git",
    directory: `packages/wwv-plugin-${name}`,
  },
  homepage: "https://github.com/silvertakana/worldwideview#readme",
  bugs: { url: "https://github.com/silvertakana/worldwideview/issues" },
  license: "ISC",
  author: "WorldWideView",
  peerDependencies: { "@worldwideview/wwv-plugin-sdk": "*" },
  worldwideview: {
    id: name,
    format: "static",
    category: category,
    icon: icon
  }
};

writeFileSync(join(PKG_DIR, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");

// ─── index.ts ───────────────────────────────────────────────

const className = displayName.replace(/[^a-zA-Z0-9]/g, "") + "Plugin";
const indexTs = `import { ${icon} } from "lucide-react";
import type {
    WorldPlugin, GeoEntity, TimeRange, PluginContext,
    LayerConfig, CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

export class ${className} implements WorldPlugin {
    id = "${name}";
    name = "${displayName}";
    description = "${description || displayName}";
    icon = ${icon};
    category = "${category.toLowerCase()}" as const;
    version = "1.0.0";

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }
    async fetch(_tr: TimeRange): Promise<GeoEntity[]> { return []; }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "${color}",
            clusterEnabled: true,
            clusterDistance: ${clusterDistance},
            maxEntities: ${maxEntities},
        };
    }

    renderEntity(_e: GeoEntity): CesiumEntityOptions {
        return { type: "point", color: "${color}", size: 8 };
    }
}
`;

writeFileSync(join(SRC_DIR, "index.ts"), indexTs);

// ─── README.md ──────────────────────────────────────────────

const readme = `# @worldwideview/wwv-plugin-${name}

WorldWideView plugin — **${displayName}**.

## Data Source

- **Source:** OpenStreetMap via [Overpass Turbo](https://overpass-turbo.eu/)
- **Tag:** \`${osmTag}\`
- **Format:** Static GeoJSON (${features.length} features)
- **License:** [ODbL](https://opendatacommons.org/licenses/odbl/) (OpenStreetMap)

## Installation

\`\`\`bash
npm install @worldwideview/wwv-plugin-${name}
\`\`\`

## Peer Dependencies

- \`@worldwideview/wwv-plugin-sdk\`

## License

ISC
`;

writeFileSync(join(PKG_DIR, "README.md"), readme);

console.log(`📁 Scaffolded packages/wwv-plugin-${name}/`);

// ─── Step 4: Print marketplace snippets ─────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log("📋 Add these to the marketplace repo:\n");

console.log("── src/data/pluginManifests.ts ──");
console.log(`  "${name}": {
    id: "${name}",
    name: "${displayName}",
    version: "1.0.0",
    description: "${description || displayName}",
    type: "data-layer",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    category: "${category}",
    icon: "${icon}",
    dataFile: "https://cdn.jsdelivr.net/npm/@worldwideview/wwv-plugin-${name}@1.0.0/data/${name}.geojson",
    rendering: {
      entityType: "point",
      color: "${color}",
      labelField: "name",
      clusterEnabled: true,
      clusterDistance: ${clusterDistance},
      maxEntities: ${maxEntities},
    },
  },`);

console.log("\n── src/data/knownPlugins.ts ──");
console.log(`  {
    id: "${name}",
    npmPackage: "@worldwideview/wwv-plugin-${name}",
    icon: "${icon}",
    category: "${category}",
    format: "static",
    trust: "verified",
    capabilities: ["data:own"],
    longDescription: "${description || displayName}",
    changelog: "v1.0.0 — Initial release.",
  },`);

console.log(`\n${"─".repeat(60)}`);
console.log("\n✅ Next steps:");
console.log("  1. npm install                  (wire workspace symlinks)");
console.log("  2. Paste marketplace snippets   (see above)");
console.log("  3. npm publish --workspace=packages/wwv-plugin-" + name + " --access public");
console.log("  4. git add + commit both repos");
console.log("  5. Configure Trusted Publishing on npm\n");
