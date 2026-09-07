import { readFile } from "node:fs/promises";
import path from "node:path";

import { CONSTRAINT_TYPES, TABLE_PRIVILEGES } from "./constants.js";

export class ConfigurationError extends Error {
  constructor(message, options = undefined) {
    super(message, options);
    this.name = "ConfigurationError";
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function requireObject(value, label) {
  if (!isPlainObject(value)) throw new ConfigurationError(`${label} must be an object.`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new ConfigurationError(`${label} must be a non-empty string.`);
  return value.trim();
}

function assertOnlyKeys(object, allowedKeys, label) {
  for (const key of Object.keys(object)) {
    if (!allowedKeys.has(key)) throw new ConfigurationError(`${label} contains unsupported key "${key}".`);
  }
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new ConfigurationError(`${label} must be true or false.`);
  return value;
}

function optionalArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ConfigurationError(`${label} must be an array.`);
  return value;
}

function validateIdentifier(value, label) {
  const identifier = requireString(value, label);
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new ConfigurationError(`${label} must be an unquoted PostgreSQL identifier in v0.1.`);
  }
  return identifier;
}

export function parseQualifiedName(value, label = "object name") {
  const qualified = requireString(value, label);
  const parts = qualified.split(".");
  if (parts.length !== 2) throw new ConfigurationError(`${label} must use the form schema.object in v0.1.`);
  return {
    schema: validateIdentifier(parts[0], `${label} schema`),
    name: validateIdentifier(parts[1], `${label} object`),
    qualified,
  };
}

function validateColumn(value, index, tableName) {
  const label = `verify.tables[${tableName}].columns[${index}]`;
  const column = requireObject(value, label);
  assertOnlyKeys(column, new Set(["name", "type", "nullable"]), label);
  return {
    name: validateIdentifier(column.name, `${label}.name`),
    type: requireString(column.type, `${label}.type`).toLowerCase(),
    nullable: requireBoolean(column.nullable, `${label}.nullable`),
  };
}

function validateTable(value, index) {
  const label = `verify.tables[${index}]`;
  const table = requireObject(value, label);
  assertOnlyKeys(table, new Set(["name", "exists", "columns"]), label);
  const name = parseQualifiedName(table.name, `${label}.name`);
  const exists = requireBoolean(table.exists, `${label}.exists`);
  const columns = optionalArray(table.columns, `${label}.columns`).map((column, columnIndex) => validateColumn(column, columnIndex, name.qualified));
  if (!exists && columns.length > 0) throw new ConfigurationError(`${label}.columns cannot be asserted when the table is expected not to exist.`);
  return { name, exists, columns };
}

function validateConstraint(value, index) {
  const label = `verify.constraints[${index}]`;
  const constraint = requireObject(value, label);
  assertOnlyKeys(constraint, new Set(["table", "name", "type", "exists"]), label);
  const type = requireString(constraint.type, `${label}.type`).toUpperCase();
  if (!CONSTRAINT_TYPES.has(type)) throw new ConfigurationError(`${label}.type must be one of: ${[...CONSTRAINT_TYPES.keys()].join(", ")}.`);
  return {
    table: parseQualifiedName(constraint.table, `${label}.table`),
    name: validateIdentifier(constraint.name, `${label}.name`),
    type,
    exists: requireBoolean(constraint.exists, `${label}.exists`),
  };
}

function validatePrivilege(value, index) {
  const label = `verify.privileges[${index}]`;
  const privilege = requireObject(value, label);
  assertOnlyKeys(privilege, new Set(["role", "object", "privilege", "allowed"]), label);
  const privilegeName = requireString(privilege.privilege, `${label}.privilege`).toUpperCase();
  if (!TABLE_PRIVILEGES.has(privilegeName)) throw new ConfigurationError(`${label}.privilege must be one of: ${[...TABLE_PRIVILEGES].join(", ")}.`);
  return {
    role: validateIdentifier(privilege.role, `${label}.role`),
    object: parseQualifiedName(privilege.object, `${label}.object`),
    privilege: privilegeName,
    allowed: requireBoolean(privilege.allowed, `${label}.allowed`),
  };
}

function validateCleanliness(value) {
  if (value === undefined) return null;
  const label = "verify.cleanliness";
  const cleanliness = requireObject(value, label);
  assertOnlyKeys(cleanliness, new Set(["maxIdleInTransaction"]), label);
  if (!Number.isInteger(cleanliness.maxIdleInTransaction) || cleanliness.maxIdleInTransaction < 0) {
    throw new ConfigurationError(`${label}.maxIdleInTransaction must be a non-negative integer.`);
  }
  return { maxIdleInTransaction: cleanliness.maxIdleInTransaction };
}

function validateConfig(raw, configPath) {
  const config = requireObject(raw, "config");
  assertOnlyKeys(config, new Set(["database", "migration", "verify"]), "config");
  const database = requireObject(config.database, "database");
  assertOnlyKeys(database, new Set(["urlEnv"]), "database");
  const urlEnv = requireString(database.urlEnv, "database.urlEnv");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(urlEnv)) throw new ConfigurationError("database.urlEnv must be a valid environment variable name.");

  let migration = null;
  if (config.migration !== undefined) {
    const migrationObject = requireObject(config.migration, "migration");
    assertOnlyKeys(migrationObject, new Set(["command"]), "migration");
    migration = { command: requireString(migrationObject.command, "migration.command") };
  }

  const verify = requireObject(config.verify, "verify");
  assertOnlyKeys(verify, new Set(["tables", "constraints", "privileges", "cleanliness"]), "verify");
  const normalized = {
    configPath,
    configDir: path.dirname(configPath),
    database: { urlEnv },
    migration,
    verify: {
      tables: optionalArray(verify.tables, "verify.tables").map(validateTable),
      constraints: optionalArray(verify.constraints, "verify.constraints").map(validateConstraint),
      privileges: optionalArray(verify.privileges, "verify.privileges").map(validatePrivilege),
      cleanliness: validateCleanliness(verify.cleanliness),
    },
  };

  const checkCount = normalized.verify.tables.length + normalized.verify.constraints.length + normalized.verify.privileges.length + (normalized.verify.cleanliness === null ? 0 : 1);
  if (checkCount === 0) throw new ConfigurationError("verify must contain at least one assertion.");
  return normalized;
}

export async function readConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  let text;
  try {
    text = await readFile(absolutePath, "utf8");
  } catch (error) {
    throw new ConfigurationError(`Unable to read configuration file: ${absolutePath}`, { cause: error });
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ConfigurationError(`Configuration file is not valid JSON: ${absolutePath}`, { cause: error });
  }
  return validateConfig(raw, absolutePath);
}
