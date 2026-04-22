import { spawn } from 'child_process';
import path from 'path';

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
}
