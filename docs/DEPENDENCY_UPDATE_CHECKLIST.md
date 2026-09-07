# Dependency update checklist

When changing runtime dependencies:

1. update `package.json`;
2. regenerate `package-lock.json` with a current supported Node/npm toolchain;
3. review the lockfile diff for unexpected packages, registry changes, scripts, or integrity changes;
4. run the unit matrix on Windows and Linux;
5. run the disposable PostgreSQL integration job;
6. merge only after the clean-install CI path passes.

Do not hand-edit integrity hashes in the lockfile.
