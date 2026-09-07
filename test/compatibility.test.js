import assert from "node:assert/strict";
import test from "node:test";

import {
  PostgresCompatibilityError,
  assertPostgresCompatibility,
  postgresMajorFromVersionNum,
} from "../src/compatibility.js";

function config(privileges = []) {
  return { verify: { privileges } };
}

test("postgresMajorFromVersionNum parses supported majors", () => {
  assert.equal(postgresMajorFromVersionNum(160015), 16);
  assert.equal(postgresMajorFromVersionNum(170011), 17);
  assert.equal(postgresMajorFromVersionNum(180006), 18);
});

test("assertPostgresCompatibility accepts PostgreSQL 16 through 18", () => {
  for (const serverVersionNum of [160015, 170011, 180006]) {
    assert.doesNotThrow(() => assertPostgresCompatibility({ serverVersionNum }, config()));
  }
});

test("assertPostgresCompatibility fails closed outside the tested range", () => {
  assert.throws(() => assertPostgresCompatibility({ serverVersionNum: 150019 }, config()), PostgresCompatibilityError);
  assert.throws(() => assertPostgresCompatibility({ serverVersionNum: 190000 }, config()), PostgresCompatibilityError);
});

test("MAINTAIN is rejected on PostgreSQL 16", () => {
  assert.throws(
    () => assertPostgresCompatibility(
      { serverVersionNum: 160015 },
      config([{ privilege: "MAINTAIN" }]),
    ),
    /requires PostgreSQL 17 or newer/,
  );
});

test("MAINTAIN is accepted on PostgreSQL 17 and 18", () => {
  for (const serverVersionNum of [170011, 180006]) {
    assert.doesNotThrow(() => assertPostgresCompatibility(
      { serverVersionNum },
      config([{ privilege: "MAINTAIN" }]),
    ));
  }
});
