# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

## [0.1.0]

### Added

- Initial runtime verification contract for PostgreSQL tables, columns, named constraints, effective table privileges, and `idle in transaction` cleanliness.
- Sanitized JSON evidence output.
- Migration-command adapter and synthetic integration example.
- Linux and Windows unit-test CI.
- PostgreSQL 16, 17, and 18 integration CI with an explicit fail-closed compatibility range.
- Version gating for the PostgreSQL 17+ `MAINTAIN` table privilege.
- CI assertions for all three public outcomes: `PASS`/exit `0`, `FAIL`/exit `1`, and sanitized `ERROR`/exit `2`.
- Committed npm lockfile and `npm ci`-based installs for reproducible dependency resolution in CI and clean checkouts.
- Catalog-backed verification for named index existence, uniqueness, primary-key status, validity, partial predicates, and relation ownership.
- Release packaging metadata and CI smoke coverage for the packed npm tarball and installed CLI.
- Consumer installation and packaged CLI invocation coverage for `npm install`, `npx`, and `npm exec`.
