import { spawn } from "node:child_process";
import pg from "pg";

import { readConfig } from "./config.js";
import { verifyCleanliness, verifyConstraints, verifyPrivileges, verifyTables } from "./checks.js";
import { buildEvidence } from "./evidence.js";

const { Client } = pg;

export class MigrationCommandError extends Error {
  constructor(exitCode) {
    super(`Migration command failed with exit code ${exitCode}.`);
    this.name = "MigrationCommandError";
    this.exitCode = exitCode;
  }
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, env: process.env, shell: true, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) return reject(new MigrationCommandError(`signal:${signal}`));
      if (code !== 0) return reject(new MigrationCommandError(code));
      resolve();
    });
  });
}

async function readDatabaseMetadata(client) {
  const result = await client.query(`
    SELECT current_database() AS name,
           current_user AS "user",
           current_setting('server_version') AS "serverVersion",
           current_setting('server_version_num') AS "serverVersionNum"
  `);
  return {
    name: result.rows[0].name,
    user: result.rows[0].user,
    serverVersion: result.rows[0].serverVersion,
    serverVersionNum: Number(result.rows[0].serverVersionNum),
  };
}

export async function runVerifier({ configPath = "pg-runtime-verifier.config.json", skipMigration = false } = {}) {
  const config = await readConfig(configPath);
  const connectionString = process.env[config.database.urlEnv]?.trim();
  if (!connectionString) throw new Error(`Required database environment variable ${config.database.urlEnv} is not set.`);
  if (!skipMigration && config.migration !== null) await runCommand(config.migration.command, config.configDir);

  const client = new Client({ connectionString, application_name: "pg-runtime-verifier" });
  await client.connect();
  try {
    const database = await readDatabaseMetadata(client);
    const checks = [];
    checks.push(
      ...(await verifyTables(client, config.verify.tables)),
      ...(await verifyConstraints(client, config.verify.constraints)),
      ...(await verifyPrivileges(client, config.verify.privileges)),
      ...(await verifyCleanliness(client, config.verify.cleanliness)),
    );
    return buildEvidence({ database, checks });
  } finally {
    await client.end();
  }
}
