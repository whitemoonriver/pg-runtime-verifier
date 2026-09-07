# Reproducible installation policy

`pg-runtime-verifier` commits its npm lockfile and uses `npm ci` in CI.

The intent is simple:

- dependency resolution is reviewed as source-controlled input;
- CI installs exactly the committed dependency graph;
- pull requests that change dependencies must also update `package-lock.json`;
- release validation should begin from a clean install rather than a developer workstation's existing `node_modules` tree.

The project currently supports Node.js 20 and 22 in CI. Dependency updates should keep both runtimes green before merge.
