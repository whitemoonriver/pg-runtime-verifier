export const TOOL_NAME = "pg-runtime-verifier";
export const TOOL_VERSION = "0.1.0";
export const EVIDENCE_SCHEMA_VERSION = 1;

export const CONSTRAINT_TYPES = new Map([
  ["PRIMARY KEY", "p"],
  ["UNIQUE", "u"],
  ["FOREIGN KEY", "f"],
  ["CHECK", "c"],
  ["EXCLUSION", "x"],
]);

export const CONSTRAINT_CODES = new Map(
  [...CONSTRAINT_TYPES.entries()].map(([name, code]) => [code, name]),
);

export const TABLE_PRIVILEGES = new Set([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
  "MAINTAIN",
]);
