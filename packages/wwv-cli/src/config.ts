import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.wwvrc');

export function setConfig(key: string, value: string) {
    let config: any = {};
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        } catch (e) {
            console.warn(`⚠️ Warning: Could not parse existing config at ${CONFIG_PATH}`);
        }
    }
    config[key] = value;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Saved config: ${key} = ${value}`);
}

export function getConfig(key: string): string | null {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        return config[key] || null;
    } catch (e) {
        console.warn(`⚠️ Warning: Could not parse config at ${CONFIG_PATH}`);
        return null;
    }
}
