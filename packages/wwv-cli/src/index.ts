#!/usr/bin/env node

import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { linkCommand } from "./commands/link.js";

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
  .argument('<target-dir>', 'The target WorldWideView public folder (e.g. ../worldwideview/public/plugins-local)')
  .action((targetDir) => {
    linkCommand(process.cwd(), targetDir);
  });

program.parse(process.argv);
