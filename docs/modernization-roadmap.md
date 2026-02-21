# Modernization Backlog

This document tracks staged modernization work that is intentionally deferred from the current cleanup pass.

## 1) ESLint Stack Convergence

Goal: standardize on one ESLint major and one `typescript-eslint` generation across all workspaces.

Current state:
- Mixed ESLint majors (`8.x` and `9.x`) across packages/apps.
- Mixed TypeScript ESLint generations (`@typescript-eslint/*` and `typescript-eslint` meta package) in different workspaces.

Planned follow-up:
- Choose one stack (recommended: ESLint 9 + `typescript-eslint` 8 flat config).
- Migrate internal shared config in `packages/eslint-config` to the same stack.
- Remove duplicate lint dependencies after migration.

## 2) Node Engine Alignment

Goal: align repo engine requirements with the active runtime/tooling.

Current state:
- Root `package.json` declares `node >=18`.
- Active Next.js app/tooling is aligned to newer Node versions.

Planned follow-up:
- Set a clear minimum Node version at root (and optionally enforce in CI).
- Ensure docs and local tooling use the same minimum version.

## 3) Schema Version Alignment Across Workspaces

Goal: avoid split runtime between local workspace schema package and older registry versions.

Current state:
- Workspace includes `@basictech/schema@0.7.0-beta.0`.
- Some packages/apps resolve `@basictech/schema@0.6.0`.

Planned follow-up:
- Decide release target (`stable` vs `beta`) for the next iteration.
- Align `@basictech/react` and demo apps to the chosen schema version.
- Re-run integration tests after alignment.
