#!/usr/bin/env node

import { TOOL_NAME, TOOL_VERSION, runVerifier, sanitizeText, writeEvidence } from "../src/index.js";
import { buildErrorEvidence } from "../src/evidence.js";

function usage() {
  return `
${TOOL_NAME} ${TOOL_VERSION}

Usage:
  pg-runtime-verifier run [options]

Options:
  --config <path>       Configuration file (default: pg-runtime-verifier.config.json)
  --output <path>       Evidence JSON (default: artifacts/pg-runtime-verifier.json)
  --skip-migration      Verify current database state without running migration.command
  --version             Print version
  --help                Show this help
`.trim();
}

function parseArgs(argv) {
  const args = [...argv];
  if (args.includes("--help") || args.includes("-h")) return { help: true };
  if (args.includes("--version") || args.includes("-v")) return { version: true };
  const command = args.shift() ?? "run";
  if (command !== "run") throw new Error(`Unsupported command "${command}".`);
  const options = { configPath: "pg-runtime-verifier.config.json", outputPath: "artifacts/pg-runtime-verifier.json", skipMigration: false };
  while (args.length > 0) {
    const arg = args.shift();
    switch (arg) {
      case "--config": {
        const value = args.shift();
        if (!value) throw new Error("--config requires a path.");
        options.configPath = value;
        break;
      }
      case "--output": {
        const value = args.shift();
        if (!value) throw new Error("--output requires a path.");
        options.outputPath = value;
        break;
      }
      case "--skip-migration":
        options.skipMigration = true;
        break;
      default:
        throw new Error(`Unknown option "${arg}".`);
    }
  }
  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
  } else if (options.version) {
    console.log(TOOL_VERSION);
  } else {
    const evidence = await runVerifier({ configPath: options.configPath, skipMigration: options.skipMigration });
    const writtenPath = await writeEvidence(options.outputPath, evidence);
    console.log(`[${TOOL_NAME}] ${evidence.status}: ${evidence.summary.passed}/${evidence.summary.total} checks passed.`);
    console.log(`[${TOOL_NAME}] evidence: ${writtenPath}`);
    process.exitCode = evidence.status === "PASS" ? 0 : 1;
  }
} catch (error) {
  const knownSecrets = Object.values(process.env).filter((value) => typeof value === "string" && /^postgres(?:ql)?:\/\//i.test(value));
  const message = sanitizeText(error instanceof Error ? error.message : String(error), knownSecrets);
  console.error(`[${TOOL_NAME}] ERROR: ${message}`);
  if (options?.outputPath) {
    try {
      const errorEvidence = buildErrorEvidence({
        name: error instanceof Error ? error.name : "Error",
        message,
        code: typeof error?.code === "string" || typeof error?.code === "number" ? error.code : null,
      });
      const writtenPath = await writeEvidence(options.outputPath, errorEvidence);
      console.error(`[${TOOL_NAME}] error evidence: ${writtenPath}`);
    } catch {
      // Best-effort only after a primary execution error.
    }
  }
  process.exitCode = 2;
}
