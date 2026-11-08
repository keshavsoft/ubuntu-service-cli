#!/usr/bin/env node

import { runCli } from "../src/cli.js";

const code = runCli(process.argv.slice(2));
if (typeof code === "number") {
    process.exitCode = code;
}

