# PostgreSQL compatibility

The current v0.1 implementation is integration-tested against PostgreSQL 17. Version-specific behavior is treated explicitly rather than assumed.

## Current contract

- The core catalog, constraint, table-privilege, and transaction-cleanliness checks are intended to remain portable across supported PostgreSQL releases where the underlying PostgreSQL function or catalog semantics are stable.
- CI currently proves behavior on PostgreSQL 17 only. Other versions are not yet claimed as tested.
- `MAINTAIN` is a PostgreSQL 17+ table privilege. A verifier must not silently treat it as portable to PostgreSQL 16 or earlier.

Before the project claims support for another PostgreSQL major version, the integration matrix must exercise that major version and version-specific checks must either be supported or fail with an explicit compatibility error.

References should follow the PostgreSQL versioned documentation and release notes rather than infer behavior from a newer server.
