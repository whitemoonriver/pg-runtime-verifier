# pg-runtime-verifier

[![CI](https://github.com/whitemoonriver/pg-runtime-verifier/actions/workflows/ci.yml/badge.svg)](https://github.com/whitemoonriver/pg-runtime-verifier/actions/workflows/ci.yml)

**Prove what PostgreSQL actually enforces after your migrations.**

`pg-runtime-verifier` is a small, CI-friendly verification tool for PostgreSQL. It runs your existing migration command, connects to the migrated database, and checks runtime invariants such as catalog shape, constraints, effective table privileges, and transaction cleanliness.

It is intentionally **not another migration framework**. Keep using Drizzle, Flyway, Prisma, plain SQL, or whatever already owns your schema changes. This project focuses on the next question:

> After the migration finished, what does PostgreSQL actually enforce?

## Why

Migration success alone does not prove that the resulting database matches the intended contract. A production-safe workflow often needs evidence that:

- required relations and columns really exist;
- constraints exist with the expected kind;
- an application role really has (or does not have) a privilege;
- no unexpected `idle in transaction` sessions remain after verification;
- CI can retain a small, sanitized machine-readable evidence file.

`pg-runtime-verifier` turns those assertions into an executable contract.

## Status

**Early development / v0.1 foundation.** The public API may still change. The initial scope is deliberately narrow:

1. run an existing migration command;
2. verify tables and columns;
3. verify named constraints;
4. verify effective table privileges with PostgreSQL's `has_table_privilege` semantics;
5. verify an `idle in transaction` ceiling;
6. emit sanitized JSON evidence.

Fault injection, concurrency probes, planner assertions, richer privilege probes, and additional catalog object types are planned after the foundation is stable.

## PostgreSQL compatibility

The v0.1 foundation is CI-tested against PostgreSQL **16, 17, and 18** and fails closed outside that tested range.

The `MAINTAIN` table privilege is version-sensitive: PostgreSQL 17 introduced it. A contract that requests `MAINTAIN` against PostgreSQL 16 is rejected as an execution error before privilege verification begins. Other supported table privileges use the common PostgreSQL 16-18 surface.

## Quick start

Requires Node.js 20+ and PostgreSQL 16, 17, or 18. Use a database that is safe for the migration command you provide.

```bash
npm install
cp examples/basic/pg-runtime-verifier.config.json pg-runtime-verifier.config.json
export DATABASE_URL='postgres://...'
node ./bin/pg-runtime-verifier.js run
```

The configuration stores only the **name of the environment variable** containing the connection string, never the connection string itself:

```json
{
  "database": {
    "urlEnv": "DATABASE_URL"
  },
  "migration": {
    "command": "npm run db:migrate"
  },
  "verify": {
    "tables": [
      {
        "name": "public.accounts",
        "exists": true,
        "columns": [
          { "name": "id", "type": "uuid", "nullable": false }
        ]
      }
    ],
    "constraints": [
      {
        "table": "public.accounts",
        "name": "accounts_pkey",
        "type": "PRIMARY KEY",
        "exists": true
      }
    ],
    "privileges": [
      {
        "role": "app_user",
        "object": "public.accounts",
        "privilege": "SELECT",
        "allowed": true
      },
      {
        "role": "app_user",
        "object": "public.accounts",
        "privilege": "DELETE",
        "allowed": false
      }
    ],
    "cleanliness": {
      "maxIdleInTransaction": 0
    }
  }
}
```

Run it:

```bash
node ./bin/pg-runtime-verifier.js run \
  --config pg-runtime-verifier.config.json \
  --output artifacts/verification.json
```

A successful evidence file has this shape:

```json
{
  "schemaVersion": 1,
  "tool": "pg-runtime-verifier",
  "status": "PASS",
  "database": {
    "name": "example_db",
    "user": "postgres",
    "serverVersion": "17.x"
  },
  "checks": [
    {
      "kind": "table",
      "target": "public.accounts",
      "status": "PASS"
    }
  ]
}
```

Connection strings and passwords are not written to evidence output.

## Exit codes

- `0` — all configured assertions passed;
- `1` — one or more verification assertions failed;
- `2` — configuration, migration, connection, compatibility, or verifier execution failed.

## Design principles

- **Runtime over inference.** Ask PostgreSQL what exists and what a role can do.
- **Migration-framework agnostic.** The verifier does not own schema changes.
- **Fail closed.** Configuration, compatibility, and execution errors do not become successful evidence.
- **Secret-minimal evidence.** Never serialize the configured database URL.
- **Small contracts first.** Add checks only when their semantics can be stated precisely and tested.

## Security and safety

Run migrations only against a database you explicitly intend to modify. The verifier itself performs read-oriented catalog and privilege checks, but the configured migration command may be destructive.

Please do not put credentials directly in configuration files or issue reports. Use environment variables and redact sensitive diagnostics. See [SECURITY.md](SECURITY.md).

## Contributing

Bug reports, portability feedback, and narrowly scoped verification ideas are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
