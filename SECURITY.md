# Security Policy

`pg-runtime-verifier` runs user-supplied migration commands and connects to PostgreSQL, so configuration and target selection deserve the same care as any database deployment tool.

## Supported versions

The project is pre-1.0. Security fixes are applied to the latest released minor version.

## Reporting a vulnerability

Please do not publish credentials, private connection strings, or exploitable details in a public issue.

If GitHub private vulnerability reporting is available for this repository, use the repository's **Security** tab. Otherwise, contact the maintainer through the GitHub profile and disclose only enough information to establish a private reporting channel.

## Secret handling

The verifier expects database URLs through environment variables, does not serialize the configured connection string into evidence, redacts PostgreSQL URI passwords and common password assignments from surfaced error text, and does not intentionally log environment variables.

The configured migration command is an external process and controls its own stdout/stderr. If that command prints secrets, `pg-runtime-verifier` cannot retroactively remove them from the terminal or CI log.

## Target safety

Treat the configured migration command as potentially destructive. Test new contracts against an explicitly disposable database before using them in CI or shared environments.
