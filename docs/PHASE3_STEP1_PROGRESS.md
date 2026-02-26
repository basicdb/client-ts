# Phase 3 Step 1 — Progress Tracker

Progress for **Initial cleanup** from [PHASE3_SDK_UPGRADE_PLAN.md](./PHASE3_SDK_UPGRADE_PLAN.md): cleanup, tech debt, and simplification (before the larger sync refactor).

---

## 1. DBStatus and getSyncStatus alignment — Done

**Problem:** `getSyncStatus(4)` returns `"ERROR_WILL_RETRY"` but `DBStatus` had no such value, so the cast was invalid and we couldn’t handle “will retry” in code or UI.

**Update:** Added `ERROR_WILL_RETRY` to `DBStatus`, exported the enum from the package, and documented all values (including `ERROR_WILL_RETRY`) in the readme.

---

## 2. Double BasicProvider check (DEV-157) — Resolved (skipped)

Not implemented. Multiple providers are uncommon; keeping the SDK simpler. Documented in readme to use a single BasicProvider. Can add a dev-time check later if needed.

---

## 3. TODOs and tech debt — Done (React sync only)

**Scope:** Cleaned up `packages/react/src/sync` only; `packages/sync` ignored (will be rewritten).

**Updates:**
- **index.ts:** Removed TODO comments (validate schema, handle versions), dead/commented code (statusChanged snippet, typo `this.verssion`), and commented debug in `debugeroo()`. Removed redundant delay comment in `updateSyncNodes`.
- **syncProtocol.js:** Removed commented-out console.logs (ws options, ws.onclose).

Schema validation and version handling remain the responsibility of AuthContext (validateAndCheckSchema before init); no new TODOs added—these can be revisited in the shared sync refactor.

---

## 3b. Second pass — React package cleanup — Done

**Scope:** Full pass over `packages/react/src` (excluding sync, already done).

**Updates:**
- **utils/schema.ts:** Removed stray `console.log('latestSchema', latestSchema)`.
- **updater/versionUpdater.ts:** Migration logs now use `log()` from config (behind `basic_debug`); reduced verbose per-migration console.logs to a single `log()` line.
- **updater/updateMigrations.ts:** Test migration uses `log()` instead of `console.log`.
- **AuthContext.tsx:** Fixed typo "typ check" → "type check" in comment and log message.

**Left as-is (intentional):** Deprecated props/aliases (kept for backward compat). `console.warn` in schema.ts for schema version errors (user-facing). `console.error` for real failures (sync init, migration failure, cleanup). RemoteCollection already uses a private `log()` gated by `config.debug`.

---

## 4. Schema validation on init (sync package)

*Deferred until sync refactor.*

---

## 5. Sync package as shared core (bigger refactor)

*Deferred; after cleanup and tech debt.*

---

## Notes for later (sync)

- **ERROR_TOKEN_EXPIRED:** When implementing sync token expiry (DEV-254), add a separate `DBStatus` (or error code) for token-expired, e.g. `ERROR_TOKEN_EXPIRED`, so the UI and reconnect logic can distinguish “token expired, refresh and reconnect” from other sync errors. Implement when working on sync.

---

## Step 2 prep: Token expiry / refresh (non-sync)

See [TOKEN_REFRESH_NONSYNC.md](./TOKEN_REFRESH_NONSYNC.md) for current implementation and suggestions.
