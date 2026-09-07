# Contributing

Thanks for considering a contribution to `pg-runtime-verifier`.

The project is intentionally narrow: each verification feature should have precise PostgreSQL semantics, deterministic tests, and secret-safe evidence output.

## Development setup

Requirements:

- Node.js 20+
- npm
- PostgreSQL 16, 17, or 18 only when running the integration example

Install dependencies and run unit tests:

```bash
npm ci
npm test
```

To run the integration example against a disposable local PostgreSQL database:

```bash
export DATABASE_URL='postgres://...'
npm run verify:example
```

The example migration creates a synthetic `public.accounts` table and a `NOLOGIN` role named `app_user`. Do not point the example at a database you care about.

## Pull requests

Please keep pull requests focused. A useful verification feature normally includes:

1. a precise contract change;
2. implementation;
3. unit or integration coverage;
4. documentation;
5. no credentials, production data, or environment-specific paths in fixtures or evidence.

For behavioral changes, explain the PostgreSQL semantics being asserted rather than only the implementation technique.

## Issues

Good bug reports include PostgreSQL version, Node.js version and operating system, the smallest synthetic configuration that reproduces the problem, sanitized output, and expected versus actual behavior.

Never paste database passwords or full connection strings into an issue.
