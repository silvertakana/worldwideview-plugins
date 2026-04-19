import fs from 'fs';
import path from 'path';

// ANSI sequences
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const yellow = (t: string) => `\x1b[33m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;

const VALID_TYPES = ["data-layer", "extension"];
const VALID_TRUSTS = ["built-in", "verified", "unverified"];
const VALID_FORMATS = ["bundle", "declarative", "static"];

export function validateCommand(cwd: string) {
    console.log(bold(`\n🔎 Validating WWV plugin in: ${cwd}`));

    const pkgPath = path.join(cwd, 'package.json');
    const pluginJsonPath = path.join(cwd, 'plugin.json');

    let manifestPath = "";
    let isSource = false;

    if (fs.existsSync(pkgPath)) {
        manifestPath = pkgPath;
        isSource = true;
    } else if (fs.existsSync(pluginJsonPath)) {
        manifestPath = pluginJsonPath;
        isSource = false;
    } else {
        console.error(red(`❌ FAILED: Cannot find package.json or plugin.json in current directory.`));
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        let json = JSON.parse(content);
        
        let manifest = json;

        if (isSource) {
            if (!json.worldwideview) {
                console.error(red(`❌ FAILED: Found package.json but it is missing the "worldwideview" object.`));
                process.exit(1);
            }
            manifest = { ...json.worldwideview };
            
            // Extract from basic npm properties if WWV blocks are missing them
            if (!manifest.id) manifest.id = json.name ? json.name.split('/').pop()?.replace('wwv-plugin-', '') : null;
            if (!manifest.name) manifest.name = json.name;
            if (!manifest.version) manifest.version = json.version;
            if (!manifest.description) manifest.description = json.description;
            
            if (!manifest.entry && (json.main || json.module)) {
                manifest.entry = json.main || json.module;
            }
        }

        const errors = validateTarget(manifest, cwd, isSource);
        const pluginLabel = manifest.id || "UnknownPlugin";

        if (errors.length > 0) {
            console.log(`\n${red('❌ VALIDATION FAILED')}: [${pluginLabel}]`);
            errors.forEach(e => console.log(`   - ${yellow(e)}`));
            process.exit(1);
        } else {
            console.log(`\n${green('✅ VALIDATION PASSED')}: [${pluginLabel}] follows all WorldWideView structure rules.`);
        }
    } catch (err: any) {
        console.error(red(`❌ ERROR: Failed to parse manifest - ${err.message}`));
        process.exit(1);
    }
}

function validateTarget(manifest: any, dir: string, isSource: boolean): string[] {
    const errors: string[] = [];

    if (!manifest.id || typeof manifest.id !== 'string') errors.push("Missing or invalid required field: 'id'");
    if (!manifest.name) errors.push("Missing required field: 'name'");
    if (!manifest.version) errors.push("Missing required field: 'version'");
    
    if (manifest.type && !VALID_TYPES.includes(manifest.type)) {
         errors.push(`Invalid type: '${manifest.type}'. Must be one of: ${VALID_TYPES.join(', ')}`);
    } else if (!manifest.type) {
         errors.push("Missing required field: 'type'");
    }

    if (manifest.format && !VALID_FORMATS.includes(manifest.format)) {
         errors.push(`Invalid format: '${manifest.format}'. Must be one of: ${VALID_FORMATS.join(', ')}`);
    }

    if (manifest.trust && !VALID_TRUSTS.includes(manifest.trust)) {
         errors.push(`Invalid trust: '${manifest.trust}'. Must be one of: ${VALID_TRUSTS.join(', ')}`);
    }

    if (!manifest.capabilities || !Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
        errors.push("Missing or empty required array: 'capabilities'");
    }

    if (manifest.entry) {
        if (!manifest.entry.startsWith("http")) { 
            let diskPath;
            if (manifest.entry.startsWith("/plugins/")) {
                errors.push(`Entry using absolute /plugins/ server route is only supported contextually on the backend engine. Please use relative paths (e.g. dist/frontend.mjs) or fully qualified URLs in local setups.`);
            } else {
                diskPath = path.join(dir, manifest.entry);
                if (!fs.existsSync(diskPath)) {
                    if (isSource && diskPath.includes('dist')) {
                        errors.push(`Build entry not found on disk (build pending?): ${manifest.entry} (Checked: ${diskPath})`);
                    } else {
                        errors.push(`Entry file missing on disk: ${manifest.entry} (Checked: ${diskPath})`);
                    }
                }
            }
        }
    } else {
        errors.push("Missing required field: 'entry' or 'main' / 'module'");
    }

    if (manifest.dataFile) {
        let dfPath = path.join(dir, manifest.dataFile);
        if (!fs.existsSync(dfPath)) {
            errors.push(`Data file missing on disk: ${manifest.dataFile} (Checked: ${dfPath})`);
        }
    }
    
    return errors;
}
