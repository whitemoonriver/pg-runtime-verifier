import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ConfigurationError, parseQualifiedName, readConfig } from "../src/config.js";

async function writeConfig(value) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pg-runtime-verifier-"));
  const configPath = path.join(directory, "config.json");
  await writeFile(configPath, JSON.stringify(value), "utf8");
  return configPath;
}

test("parseQualifiedName accepts an unquoted schema and object", () => {
  assert.deepEqual(parseQualifiedName("public.accounts"), { schema: "public", name: "accounts", qualified: "public.accounts" });
});

test("parseQualifiedName rejects ambiguous names", () => {
  assert.throws(() => parseQualifiedName("accounts"), ConfigurationError);
});

test("readConfig accepts the minimal supported contract", async () => {
  const configPath = await writeConfig({ database: { urlEnv: "DATABASE_URL" }, verify: { tables: [{ name: "public.accounts", exists: true, columns: [] }] } });
  const config = await readConfig(configPath);
  assert.equal(config.database.urlEnv, "DATABASE_URL");
  assert.equal(config.verify.tables.length, 1);
  assert.equal(config.verify.tables[0].name.qualified, "public.accounts");
});

test("readConfig rejects a literal database URL key", async () => {
  const configPath = await writeConfig({ database: { urlEnv: "DATABASE_URL", url: "postgres://user:secret@example.invalid/db" }, verify: { tables: [{ name: "public.accounts", exists: true }] } });
  await assert.rejects(readConfig(configPath), /unsupported key "url"/);
});

test("readConfig rejects an empty verification contract", async () => {
  const configPath = await writeConfig({ database: { urlEnv: "DATABASE_URL" }, verify: {} });
  await assert.rejects(readConfig(configPath), /at least one assertion/);
});
