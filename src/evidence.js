import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { EVIDENCE_SCHEMA_VERSION, TOOL_NAME, TOOL_VERSION } from "./constants.js";

export function buildEvidence({ database, checks }) {
  const status = checks.every((item) => item.status === "PASS") ? "PASS" : "FAIL";
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    tool: TOOL_NAME,
    toolVersion: TOOL_VERSION,
    generatedAt: new Date().toISOString(),
    status,
    database,
    summary: {
      total: checks.length,
      passed: checks.filter((item) => item.status === "PASS").length,
      failed: checks.filter((item) => item.status === "FAIL").length,
    },
    checks,
  };
}

export function buildErrorEvidence(error) {
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    tool: TOOL_NAME,
    toolVersion: TOOL_VERSION,
    generatedAt: new Date().toISOString(),
    status: "ERROR",
    error,
  };
}

export async function writeEvidence(outputPath, evidence) {
  const absolutePath = path.resolve(outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return absolutePath;
}
