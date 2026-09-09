# Basic example

This synthetic example is the shortest way to see `pg-runtime-verifier` run a migration and then verify the resulting PostgreSQL runtime state.

It creates only disposable demo roles and a `public.accounts` table inside the database you point it at. **Do not use the commands below against a database you care about.**

## What this example proves

After `migrate.js` runs, the verifier checks that PostgreSQL actually has:

- the expected table and columns;
- the expected primary-key and unique constraints;
- a valid partial index with the expected predicate;
- the expected relation owner;
- the expected effective `SELECT` / `INSERT` privileges and denied `UPDATE` / `DELETE` privileges;
- no unexpected `idle in transaction` sessions.

A successful run exits `0` and writes sanitized JSON evidence.

## Quick start with Docker

Requirements:

- Node.js 20 or later;
- Git;
- Docker.

From a clean working directory:

```bash
git clone https://github.com/whitemoonriver/pg-runtime-verifier.git
cd pg-runtime-verifier
npm ci
```

Start a disposable PostgreSQL 18 container. The password below is intentionally synthetic and is only for this local demo:

```bash
docker run --name pg-runtime-verifier-demo \
  -e POSTGRES_PASSWORD=demo-only-password \
  -p 55432:5432 \
  -d postgres:18
```

Wait until PostgreSQL is ready:

```bash
docker exec pg-runtime-verifier-demo pg_isready -U postgres
```

When it reports `accepting connections`, set `DATABASE_URL`.

### Bash / zsh

```bash
export DATABASE_URL='postgresql://postgres:demo-only-password@127.0.0.1:55432/postgres'
```

### PowerShell

```powershell
$env:DATABASE_URL = 'postgresql://postgres:demo-only-password@127.0.0.1:55432/postgres'
```

Run the verifier from the repository root:

```bash
node ./bin/pg-runtime-verifier.js run \
  --config ./examples/basic/pg-runtime-verifier.config.json \
  --output ./artifacts/example-verification.json
```

Expected terminal result:

```text
[pg-runtime-verifier] PASS: 15/15 checks passed.
```

The evidence file at `artifacts/example-verification.json` should report `"status": "PASS"` and contain the individual checks. It does not serialize the database connection string.

## See a real verification failure

The repository also contains a synthetic contract that intentionally disagrees with the migrated database. Run it without re-running the migration:

```bash
node ./bin/pg-runtime-verifier.js run \
  --config ./examples/basic/expected-failure.config.json \
  --skip-migration \
  --output ./artifacts/expected-failure.json
```

That command is expected to exit `1` and emit `FAIL` evidence. This is the behavior intended for a release-blocking CI assertion when PostgreSQL does not enforce the configured contract.

## Clean up

Remove the disposable PostgreSQL container when finished:

```bash
docker rm -f pg-runtime-verifier-demo
```

If you set `DATABASE_URL` only for this demo, unset it afterward.

### Bash / zsh

```bash
unset DATABASE_URL
```

### PowerShell

```powershell
Remove-Item Env:DATABASE_URL
```

## Files

- [`migrate.js`](migrate.js) — synthetic migration used by the example.
- [`pg-runtime-verifier.config.json`](pg-runtime-verifier.config.json) — passing runtime contract.
- [`expected-failure.config.json`](expected-failure.config.json) — intentionally failing verification contract.
- [`expected-error.config.json`](expected-error.config.json) — synthetic execution-error fixture used by CI.
