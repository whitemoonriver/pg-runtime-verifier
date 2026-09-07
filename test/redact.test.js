import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeText } from "../src/redact.js";

test("sanitizeText redacts PostgreSQL URI passwords", () => {
  const value = "connection failed: postgresql://alice:super-secret@db.example.test:5432/app";
  const sanitized = sanitizeText(value);
  assert.equal(sanitized.includes("super-secret"), false);
  assert.match(sanitized, /\[REDACTED\]/);
});

test("sanitizeText redacts exact known secrets", () => {
  const secret = "postgres://alice:secret@localhost/db";
  const sanitized = sanitizeText(`failed ${secret}`, [secret]);
  assert.equal(sanitized.includes(secret), false);
  assert.equal(sanitized, "failed [REDACTED]");
});

test("sanitizeText redacts password assignments", () => {
  assert.equal(sanitizeText("password=my-secret"), "password=[REDACTED]");
});
