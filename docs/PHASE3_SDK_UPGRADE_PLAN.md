# Phase 3 Client SDK Upgrade Plan

## Context

**Project (basic-server):** Phase 0–2 complete. PDS is the OAuth provider with DID-based identity; client-ts uses `resolveDid`/`resolveHandle`, `normalizeClientId`, and supports sync (Dexie + WebSocket) and remote (REST) modes. Phase 3 focuses on Sync & Collaboration (sync review, WebSocket/Rampart fixes, conflict resolution, cross-PDS share tokens, interop schemas, batch API). See basic-server [ARCHITECTURE.md](../../basic-server/docs/ARCHITECTURE.md) and [ROADMAP.md](../../basic-server/docs/ROADMAP.md).

**client-ts today:** Turborepo with `@basictech/react`, `@basictech/nextjs`, `@basictech/schema`, and `@repo/sync`. The **sync package is the shared base for sync logic**: it should hold core Dexie/sync protocol so it can be reused by the React package and by other sync SDKs (e.g. React Native, future platforms). Today the React package duplicates some sync logic locally. Auth in `packages/react/src/AuthContext.tsx` (tokens, refresh, storage, DID/scopes). DB: sync via `BasicSync` (Dexie + dexie-syncable) or remote via `RemoteDB`/`RemoteCollection`. Sync connects once with `access_token`; when it expires the WS reports `ERROR_WILL_RETRY` (status 4) and the SDK does not auto-refresh and reconnect (DEV-254). API path for remote is `/account/:project_id/db/:table` (matches PDS).

**Relevant Linear (SDK project):** DEV-188 (upgrade react SDK, in progress), DEV-113 (sync-client), DEV-254 (sync invalid token / auto refresh), DEV-240 (db fallback to API), DEV-208/DEV-214 (profile APIs in SDKs), DEV-251 (PKCE/DPoP), DEV-242 (auth prebuilt components), DEV-239 (createSchema for TS), DEV-145 (sync filtering), DEV-151 (types for DB), DEV-152 (sync-disabled error messages), DEV-157 (double provider messaging).

---

## 1. Initial cleanup

- **Keep sync package as shared sync core:** Do **not** remove `packages/sync`. Use it as the base for sync logic that the React package (and other sync SDKs, e.g. React Native) can reuse. Refactor so core behavior (BasicSync, schema→Dexie conversion, sync protocol, connect/disconnect, status) lives in the sync package; the React package should depend on `@repo/sync` (or `@basictech/sync` if renamed) and wire it to auth/config. Remove the deprecation warning from the sync package and document it as the shared sync layer.
- **TODOs and tech debt:** Address or ticket the TODOs in `packages/sync/src/index.ts` (validate schema, query 2.0) and in `packages/react/src/sync/index.ts` (e.g. "validate schema", "handle versions")—prefer moving shared logic into the sync package. Remove or reduce commented/dead code in both.
- **DBStatus enum and docs:** `packages/react/src/AuthContext.tsx` defines `DBStatus` (LOADING, OFFLINE, CONNECTING, ONLINE, SYNCING, ERROR). `packages/react/src/utils/network.ts` (`getSyncStatus`) maps dexie-syncable codes and returns `ERROR_WILL_RETRY` for 4, but `DBStatus` has `ERROR` not `ERROR_WILL_RETRY`. Align: either add ERROR_WILL_RETRY to the public type or map 4 → ERROR and document; ensure readme/changelog match.
- **Double BasicProvider check (DEV-157):** Add a dev-time check (or optional runtime) that detects multiple `BasicProvider` instances and logs a clear warning or error.
- **Schema validation on init:** Replace or implement the "TODO: validate schema" in the sync package's BasicSync (and any react-specific init) so invalid schema fails fast with a clear error (DEV-113, schema validity). Prefer implementing once in the sync package so all consumers benefit.

---

## 2. Auth improvements

- **Token expiry and sync (DEV-254):** When sync status becomes `ERROR_WILL_RETRY` (status 4), treat as likely expired/invalid token: call `getToken()` (which refreshes if needed), then disconnect and reconnect the WebSocket with the new access token so the connection returns to ONLINE instead of staying in error state. Implement in the `statusChanged` handler in `packages/react/src/AuthContext.tsx` (where `setDbStatus(getSyncStatus(status))` is set) and ensure no tight refresh loops.
- **Proactive token refresh for sync:** Optionally refresh the access token shortly before expiry (e.g. using JWT `exp`) and reconnect the sync WebSocket with the new token so the server never sees an expired token. Complements the ERROR_WILL_RETRY recovery above.
- **Handle token expiry in REST (DEV-188):** Document and/or harden "handle token expiry" for non-sync flows (e.g. ensure `getToken()` is used for all API calls and refresh logic is consistent; already partially done in RemoteCollection 401 retry).
- **Scopes (DEV-188):** Expose or document "missing vs current scopes" (e.g. after login or when an operation fails with 403). `hasScope` and `scope` are already on context; add helpers or docs for common patterns (e.g. "requested scopes" vs "granted scopes").
- **JWKS verification (DEV-188):** If PDS supports JWKS, add optional verification of access tokens via JWKS in the SDK (verify jwks? checkbox in DEV-188). Document that it's optional and when to enable.
- **PKCE/DPoP (DEV-251):** Verify and document PKCE and DPoP usage in the SDK against the PDS; add tests or manual test steps and fix any gaps.

---

## 3. DB improvements

- **Typed schema / DB (DEV-188, DEV-151):** Introduce typed collection access where the schema is known (e.g. `db.collection<MyType>('tableName')` or a `createSchema`/codegen that yields typed `db`). Implement or adopt DEV-239 (createSchema for TS) so table and field types are inferred from the Basic schema.
- **Remote API path and PATCH:** Confirm `packages/react/src/core/db/RemoteCollection.ts` uses PDS paths and method semantics (GET/POST/PATCH/DELETE). PDS uses PATCH for updates; ensure client uses PATCH where the server expects it.
- **Profile API (DEV-208 / DEV-214):** Add SDK methods for account and project profile: get account profile (`GET /account/profile`), update account profile (`PATCH /account/profile`), get/update/delete project profile (`GET/PATCH/DELETE /account/:project_id/profile`). Expose from `useBasic()` or a small `useProfile()` helper, with correct scopes (admin vs app:profile).
- **DB fallback / hook (DEV-240):** Complete "create hook" for remote-only usage (e.g. `useCollection('tableName')` that returns loading, error, data and uses RemoteDB under the hood). Document when to use sync vs remote and schema options.
- **Error messages when sync disabled (DEV-152):** When sync is disabled or schema/version mismatch, return clear, user-facing error messages (e.g. "Sync is disabled" or "Schema version mismatch") instead of generic failures.
- **Bulk methods (DEV-113):** Once PDS has a batch API (DEV-178), add bulk create/update/delete on the SDK (sync and remote). Until then, document the limitation or add a client-side batch helper that issues multiple requests.

---

## 4. Sync improvements

- **Auto-refresh on token expiry (DEV-254):** Implement as in section 2 (on ERROR_WILL_RETRY, refresh token and reconnect WS). Ensure reconnect uses the same schema and options. React (or other SDKs) wires auth; sync package can expose a stable connect/disconnect API that accepts a token getter if needed.
- **Last synced timestamp (DEV-113):** Expose a "last synced at" (or revision) from the sync layer so the UI can show "Last synced: X". Implement in the sync package (e.g. from dexie-syncable or a small metadata table) so all SDKs can reuse it.
- **Tab focus / multi-tab (DEV-113):** On window/tab focus, re-check auth and sync state (e.g. refresh token if near expiry, or reconnect if status is ERROR_WILL_RETRY). This is SDK-specific (React/Next.js); sync package stays agnostic.
- **Conflict resolution (DEV-113, ROADMAP):** Phase 3 conflict handling is largely server-side (last-write-wins, 409). SDK: handle 409 from REST and optionally expose a way to surface "conflict" state for UI (e.g. in RemoteCollection or a wrapper). Sync-client conflict resolution can be a follow-up once server semantics are fixed; shared logic can live in sync package where applicable.
- **Query/filtering (DEV-113, DEV-145):** Improve sync query API in the **sync package**: support filtering (e.g. `getAll(where: ...)` or predicate) and consistent `execute()` semantics. Align with "query 2.0" and "default to []" behavior from DEV-113, so React and other SDKs get the same behavior.
- **Hook wrapper (DEV-113):** Provide a React-specific hook (e.g. `useCollection` or `useQuery`) that combines loading, default empty state, and error for sync tables, using the sync package under the hood.

---

## 5. Misc

- **Next.js SDK (DEV-238, DEV-83):** Resolve observer bug, double-refresh on auth code, and test usage from middleware/route/server components. Keep feature parity with React SDK (dbMode, profile, etc.) as in [CHANGELOG-SESSION.md](../CHANGELOG-SESSION.md).
- **Auth prebuilt components (DEV-242):** Optional prebuilt React components (e.g. SignInButton, SignOutButton, UserCard) that use `useBasic()` and standardize styling slots.
- **npm create basic (DEV-236):** Update create-lofi-app, publish create-basic-app, and support `npm create basic` for scaffolding.
- **Docs and changelog:** Document new profile API, dbStatus values (including ERROR_WILL_RETRY if exposed), sync vs remote, and token refresh behavior. Bump changelog for each shipped group (cleanup, auth, db, sync, misc).
- **Testing:** Add or extend tests for: token refresh path, sync reconnect on ERROR_WILL_RETRY, RemoteCollection 401 retry, profile API, and (if added) double-provider check.

---

## Suggested order of work

1. **Initial cleanup** — low risk, unblocks clearer errors and schema validation.
2. **Auth improvements** — DEV-254 and proactive refresh fix the most visible sync/auth bugs.
3. **Sync improvements** — build on auth (reconnect on ERROR_WILL_RETRY, then last synced, tab focus).
4. **DB improvements** — profile API, types/createSchema, hooks and error messages.
5. **Misc** — Next.js fixes, prebuilt components, npm create basic, docs and tests.

**Dependencies:** Sync auto-refresh (DEV-254) depends on auth (getToken/refresh). Batch SDK methods depend on PDS batch API (DEV-178). Conflict handling in SDK depends on server 409 semantics.
