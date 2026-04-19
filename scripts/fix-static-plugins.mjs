import { writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const plugins = [
    { name: "airports", tag: "aeroway=aerodrome" },
    { name: "embassies", tag: "office=diplomatic" },
    { name: "lighthouses", tag: "man_made=lighthouse" },
    { name: "military-bases", tag: "military=base" },
    { name: "nuclear", tag: "generator:source=nuclear" },
    { name: "seaports", tag: "industrial=port" },
    { name: "spaceports", tag: "aeroway=spaceport" },
    { name: "volcanoes", tag: "natural=volcano" },
];

const ROOT = resolve(import.meta.dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const p of plugins) {
    console.log(`Querying ${p.name}...`);
    const [tagKey, tagValue] = p.tag.split("=");
    let query = `[out:json][timeout:300];(node["${tagKey}"="${tagValue}"];way["${tagKey}"="${tagValue}"];relation["${tagKey}"="${tagValue}"];);out center;`;
    
    // For embassies it can be amenity=embassy or office=diplomatic
    if (p.name === "embassies") {
        query = `[out:json][timeout:300];(node["office"="diplomatic"];way["office"="diplomatic"];relation["office"="diplomatic"];node["amenity"="embassy"];way["amenity"="embassy"];relation["amenity"="embassy"];);out center;`;
    }

    try {
        const { execSync } = await import("child_process");
        const url = `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const output = execSync(`curl -s -H "User-Agent: Mozilla/5.0" "${url}"`, { encoding: 'utf-8' });
        
        const raw = JSON.parse(output);
        const elements = raw.elements || [];
        
        const features = elements.map((el) => {
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            if (lat == null || lon == null) return null;
            return {
                type: "Feature",
                geometry: { type: "Point", coordinates: [lon, lat] },
                properties: { name: el.tags?.name || el.tags?.["name:en"] || "Unknown" },
                id: el.id
            };
        }).filter(Boolean);

        const geojson = { type: "FeatureCollection", features };
        
        const packageDir = join(ROOT, "packages", `wwv-plugin-${p.name}`);
        const dataDir = join(packageDir, "data");
        mkdirSync(dataDir, { recursive: true });
        writeFileSync(join(dataDir, `data.json`), JSON.stringify(geojson));
        console.log(`Saved ${features.length} to ${p.name}`);
        
    } catch(e) {
        console.error("Failed for " + p.name, e.message);
    }
    await sleep(2000);
}
