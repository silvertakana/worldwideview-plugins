#!/usr/bin/env node

import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { linkCommand } from "./commands/link.js";
import { sandboxCommand } from "./commands/sandbox.js";
import { deployBackendCommand } from "./commands/deploy-backend.js";
import { setConfig } from "./config.js";

const program = new Command();

program
  .name("wwv")
  .description("CLI to build, sync, and validate WorldWideView plugins")
  .version("1.0.0");

program
  .command("validate")
  .description("Statically validate the local plugin.json or package.json manifest for WWV compatibility")
  .action(() => {
    validateCommand(process.cwd());
  });

program
  .command("link")
  .description("Watch and auto-sync the local Vite plugin bundle into a WorldWideView dev server")
  .argument('[target-dir]', 'The target WorldWideView public folder (e.g. ../worldwideview/public/plugins-local)')
  .action((targetDir) => {
    linkCommand(process.cwd(), targetDir);
  });

program
  .command("sandbox")
  .description("Boot a local Mini-Engine and Mini-Globe for rapid plugin testing")
  .action(() => {
    sandboxCommand(process.cwd());
  });

program
  .command("deploy-backend")
  .description("Deploy the compiled backend.mjs to a Plugin Host")
  .argument('<host-path>', 'Path to the shared backend host (e.g. ../my-plugin-host)')
  .action((hostPath) => {
    deployBackendCommand(process.cwd(), hostPath);
  });

program
  .command("config")
  .description("Manage global WWV CLI configuration")
  .argument('<action>', 'Action to perform (e.g. "set")')
  .argument('<key>', 'Configuration key (e.g. "wwv-path")')
  .argument('<value>', 'Configuration value')
  .action((action, key, value) => {
    if (action === 'set') {
        setConfig(key, value);
    } else {
        console.error('Unknown action. Use "set".');
    }
  });

program.parse(process.argv);
