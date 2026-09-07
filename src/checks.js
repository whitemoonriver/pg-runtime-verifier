import { CONSTRAINT_CODES, CONSTRAINT_TYPES } from "./constants.js";

function check(kind, target, expected, actual, pass, detail = undefined) {
  const result = { kind, target, expected, actual, status: pass ? "PASS" : "FAIL" };
  if (detail !== undefined) result.detail = detail;
  return result;
}

export async function verifyTables(client, tableContracts) {
  const checks = [];
  for (const contract of tableContracts) {
    const relationResult = await client.query("SELECT to_regclass($1)::text AS relation", [contract.name.qualified]);
    const actualExists = relationResult.rows[0].relation !== null;
    checks.push(check("table", contract.name.qualified, { exists: contract.exists }, { exists: actualExists }, actualExists === contract.exists));
    if (!contract.exists || !actualExists || contract.columns.length === 0) continue;

    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [contract.name.schema, contract.name.name]);
    const actualColumns = new Map(columnsResult.rows.map((row) => [row.column_name, { type: String(row.data_type).toLowerCase(), nullable: row.is_nullable === "YES" }]));
    for (const expectedColumn of contract.columns) {
      const actual = actualColumns.get(expectedColumn.name) ?? null;
      checks.push(check(
        "column",
        `${contract.name.qualified}.${expectedColumn.name}`,
        { exists: true, type: expectedColumn.type, nullable: expectedColumn.nullable },
        actual === null ? { exists: false } : { exists: true, type: actual.type, nullable: actual.nullable },
        actual !== null && actual.type === expectedColumn.type && actual.nullable === expectedColumn.nullable,
      ));
    }
  }
  return checks;
}

export async function verifyConstraints(client, contracts) {
  const checks = [];
  for (const contract of contracts) {
    const result = await client.query(`
      SELECT c.contype
      FROM pg_catalog.pg_constraint AS c
      JOIN pg_catalog.pg_class AS t ON t.oid = c.conrelid
      JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
      WHERE n.nspname = $1 AND t.relname = $2 AND c.conname = $3
    `, [contract.table.schema, contract.table.name, contract.name]);
    const actualExists = result.rowCount === 1;
    const actualType = actualExists ? (CONSTRAINT_CODES.get(result.rows[0].contype) ?? "UNKNOWN") : null;
    const pass = contract.exists ? actualExists && actualType === contract.type : !actualExists;
    checks.push(check(
      "constraint",
      `${contract.table.qualified}.${contract.name}`,
      { exists: contract.exists, type: contract.type },
      { exists: actualExists, type: actualType },
      pass,
      contract.exists ? { postgresTypeCode: CONSTRAINT_TYPES.get(contract.type) } : undefined,
    ));
  }
  return checks;
}

export async function verifyIndexes(client, contracts) {
  const checks = [];
  for (const contract of contracts) {
    const result = await client.query(`
      SELECT i.indisunique AS "unique",
             i.indisprimary AS "primary",
             i.indisvalid AS "valid",
             pg_catalog.pg_get_expr(i.indpred, i.indrelid, false) AS predicate
      FROM pg_catalog.pg_index AS i
      JOIN pg_catalog.pg_class AS idx ON idx.oid = i.indexrelid
      JOIN pg_catalog.pg_class AS tbl ON tbl.oid = i.indrelid
      JOIN pg_catalog.pg_namespace AS n ON n.oid = tbl.relnamespace
      WHERE n.nspname = $1
        AND tbl.relname = $2
        AND idx.relname = $3
        AND idx.relnamespace = n.oid
    `, [contract.table.schema, contract.table.name, contract.name]);
    const actualExists = result.rowCount === 1;
    if (!contract.exists) {
      checks.push(check(
        "index",
        `${contract.table.schema}.${contract.name}`,
        { exists: false },
        actualExists ? {
          exists: true,
          unique: result.rows[0].unique === true,
          primary: result.rows[0].primary === true,
          valid: result.rows[0].valid === true,
          predicate: result.rows[0].predicate ?? null,
        } : { exists: false },
        !actualExists,
        { table: contract.table.qualified },
      ));
      continue;
    }

    const expected = {
      exists: true,
      unique: contract.unique,
      primary: contract.primary,
      valid: contract.valid,
      predicate: contract.predicate,
    };
    const actual = actualExists ? {
      exists: true,
      unique: result.rows[0].unique === true,
      primary: result.rows[0].primary === true,
      valid: result.rows[0].valid === true,
      predicate: result.rows[0].predicate ?? null,
    } : { exists: false };
    const pass = actualExists
      && actual.unique === expected.unique
      && actual.primary === expected.primary
      && actual.valid === expected.valid
      && actual.predicate === expected.predicate;
    checks.push(check(
      "index",
      `${contract.table.schema}.${contract.name}`,
      expected,
      actual,
      pass,
      { table: contract.table.qualified },
    ));
  }
  return checks;
}

export async function verifyOwnership(client, contracts) {
  const checks = [];
  for (const contract of contracts) {
    const result = await client.query(`
      SELECT r.rolname AS owner
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      JOIN pg_catalog.pg_roles AS r ON r.oid = c.relowner
      WHERE n.nspname = $1 AND c.relname = $2
    `, [contract.object.schema, contract.object.name]);
    const actualExists = result.rowCount === 1;
    const actualOwner = actualExists ? result.rows[0].owner : null;
    checks.push(check(
      "relation_owner",
      contract.object.qualified,
      { exists: true, owner: contract.owner },
      { exists: actualExists, owner: actualOwner },
      actualExists && actualOwner === contract.owner,
    ));
  }
  return checks;
}

export async function verifyPrivileges(client, contracts) {
  const checks = [];
  for (const contract of contracts) {
    const roleResult = await client.query("SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1) AS exists", [contract.role]);
    const roleExists = roleResult.rows[0].exists === true;
    const relationResult = await client.query("SELECT to_regclass($1)::text AS relation", [contract.object.qualified]);
    const objectExists = relationResult.rows[0].relation !== null;
    let actualAllowed = null;
    if (roleExists && objectExists) {
      const privilegeResult = await client.query("SELECT has_table_privilege($1, $2, $3) AS allowed", [contract.role, contract.object.qualified, contract.privilege]);
      actualAllowed = privilegeResult.rows[0].allowed === true;
    }
    checks.push(check(
      "table_privilege",
      `${contract.role}:${contract.object.qualified}:${contract.privilege}`,
      { roleExists: true, objectExists: true, allowed: contract.allowed },
      { roleExists, objectExists, allowed: actualAllowed },
      roleExists && objectExists && actualAllowed === contract.allowed,
    ));
  }
  return checks;
}

export async function verifyCleanliness(client, contract) {
  if (contract === null) return [];
  const result = await client.query(`
    SELECT count(*)::integer AS count
    FROM pg_catalog.pg_stat_activity
    WHERE datname = current_database()
      AND state = 'idle in transaction'
      AND pid <> pg_backend_pid()
  `);
  const count = Number(result.rows[0].count);
  const max = contract.maxIdleInTransaction;
  return [check("transaction_cleanliness", "current_database", { idleInTransactionAtMost: max }, { idleInTransaction: count }, count <= max)];
}
