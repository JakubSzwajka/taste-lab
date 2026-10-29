#!/usr/bin/env node
// Entry point. Node runs the TypeScript sources directly (type stripping, Node >= 23.6).
import { run } from "../cli/main.ts";

process.exitCode = await run(process.argv.slice(2));
