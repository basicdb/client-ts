# Phase 3 Step 2 — Progress Tracker

Progress for **Auth improvements** from [PHASE3_SDK_UPGRADE_PLAN.md](./PHASE3_SDK_UPGRADE_PLAN.md). Issues list: [PHASE3_STEP2_AUTH_ISSUES.md](./PHASE3_STEP2_AUTH_ISSUES.md).

---

## 1. React Strict Mode double code exchange — Done

**Problem:** React 18 Strict Mode double-mounts components in development, causing `initializeAuth()` to run twice. Both invocations see the `?code=` param and try to exchange the same authorization code. Auth codes are single-use, so the second exchange gets a 400 from the server. The error handler then clears all tokens stored by the first successful exchange, leaving the user signed out.

**Fix:** Added `codeExchangeRef` (mirrors existing `refreshPromiseRef` pattern). If a code exchange is already in-flight, the second call reuses the same promise instead of making a duplicate request.

**Files:** `AuthContext.tsx`

---

## 2. Unpublished schema (version 0) — better messaging — Done

**Problem:** When schema is at version 0 (not yet published), `validateAndCheckSchema` returned `{ valid: false }` with no `status` field. `AuthContext` then logged "Schema is invalid!" — misleading, since the schema structure is fine, it's just unpublished.

**Fix:**
- `utils/schema.ts`: Return `status: 'unpublished'` for version-0 schemas.
- `AuthContext.tsx`: Check for `status === 'unpublished'` and log a clear message ("Schema not published yet — sync is disabled. Publish your schema to enable sync.") instead of the generic "Schema is invalid!".

**Remaining:** Surface a proper user-facing error/banner instead of just a console message (tracked in [TASKS.md](./TASKS.md) as `UNPUBLISHED_SCHEMA_UX`).

**Files:** `AuthContext.tsx`, `utils/schema.ts`

---

## 3. Token exchange log cleanup — Done

**Problem:** The debug log for the token exchange request body always included both `refresh_token` and `code` fields, with one set to `undefined`. This made it look like the request payload had extraneous undefined fields.

**Fix:** Only spread the relevant redacted field (`refresh_token` for refresh requests, `code` for auth code exchanges).

**Files:** `AuthContext.tsx`

---

## 4. Sync token expiry fix (DEV-254) — Done

**Problem:** Sync WebSocket was established with a static access token at connect time. When that token expired, dexie-syncable retried with the same stale token, leaving the connection stuck in `ERROR_WILL_RETRY` with no recovery.

**Fix:**
- `BasicSync.connect()` now accepts a `getToken` function instead of a static `access_token` string.
- `syncProtocol.js`: `ws.onopen` calls `await options.getToken()` on every open (including reconnects), so each attempt gets a fresh token.
- Server auth errors (`TOKEN_EXPIRED` / `UNAUTHORIZED` code) use `RECONNECT_DELAY` instead of `Infinity`, enabling reconnect with a fresh token.
- `statusChanged` handler proactively calls `getToken({ forceRefresh: true })` when `ERROR_WILL_RETRY` fires.

**Files:** `sync/index.ts`, `sync/syncProtocol.js`, `AuthContext.tsx`

---

## 5. AuthManager extraction — Done

**Problem:** `AuthContext.tsx` was ~1100 lines mixing React state, OAuth flow, token management, sync lifecycle, and UI readiness into one monolithic component.

**Fix:** Extracted auth logic into `core/auth/AuthManager.ts` — a plain class with a single `onStateChange` callback (no event emitter). AuthContext.tsx now delegates to it and is ~300 lines of React wiring. Key benefits:
- `getToken()` is a stable class method — no closure staleness for RemoteDB or sync.
- Auth state (token, user, isSignedIn, etc.) lives on the class instance.
- The `notify()` callback syncs AuthManager state to React state via `AuthSnapshot`.
- Testable without React.

**Files:** `core/auth/AuthManager.ts` (new), `AuthContext.tsx` (rewritten)

---

## 6. Proactive token refresh for sync — Done

**Problem:** Without proactive refresh, the WebSocket could send expired tokens before the server rejects and triggers a reconnect.

**Fix:**
- `syncProtocol.js`: After `ws.onopen`, decodes JWT `exp` and schedules a refresh 60s before expiry.
- When the timer fires, calls `getToken({ forceRefresh: true })` and sends `{ type: "tokenUpdate", authToken }` on the existing WebSocket.
- Server can update the session's token without dropping the connection (requires PDS support for `type: "tokenUpdate"`; degrades gracefully if not supported).
- Timer is cleaned up on socket close/error/disconnect.
- Added `ERROR_TOKEN_EXPIRED` to `DBStatus` enum for future use.

**Files:** `sync/syncProtocol.js`, `AuthContext.tsx`

---

## 7. Multi-tab coordination — Done

**Problem:** Token refresh in one tab and sync state in another could diverge; no coordination.

**Fix:** Added `BroadcastChannel('basic-auth')` in AuthManager:
- After successful token exchange, broadcasts `{ type: 'token_refreshed', token, did, tokenScope }`.
- After sign-out, broadcasts `{ type: 'signed_out' }`.
- Other tabs receive the message and update their in-memory auth state + trigger React re-render.
- Gracefully degrades (no-op) in environments without `BroadcastChannel`.

**Files:** `core/auth/AuthManager.ts`

---

## 8. Structured onAuthError + 403 handling — Done

**Problem:** `onAuthError` payload lacked context (was it after a retry? was it expired vs forbidden?). 403 errors were not surfaced to the callback.

**Fix:**
- `AuthError` type now includes `errorType: 'expired' | 'forbidden' | 'revoked' | 'network' | 'unknown'` and `afterRetry: boolean`.
- `RemoteCollection` now calls `onAuthError` for both 401 and 403 responses with the enriched payload.

**Files:** `core/db/types.ts`, `core/db/RemoteCollection.ts`

---

## 9. PKCE (RFC 7636) — Done

**Problem:** OAuth flow had no PKCE protection. Auth codes could be intercepted and exchanged by an attacker.

**Fix:**
- `getSignInUrl()` generates a `code_verifier` (32 random bytes, base64url), computes `code_challenge` (SHA-256), stores verifier in storage, and includes `code_challenge` + `code_challenge_method=S256` in the authorization URL.
- `exchangeToken()` includes `code_verifier` in the token exchange request body for auth code grants.
- Verifier is cleaned up from storage after successful exchange.
- Added `CODE_VERIFIER` to `STORAGE_KEYS`.

**Files:** `core/auth/AuthManager.ts`, `utils/storage.ts`

---

## 10. Scopes tracking — Done

**Problem:** No way to compare requested vs granted scopes. 403 errors gave no guidance on which scope was missing.

**Fix:**
- AuthManager tracks `requestedScopes` (from config) alongside `tokenScope` (from JWT).
- `missingScopes()` method returns the difference: scopes requested but not granted.
- Exposed in context via `missingScopes()`.
- `hasScope()` already existed and is preserved.

**Files:** `core/auth/AuthManager.ts`, `AuthContext.tsx`

---

## 11. Post-implementation review fixes — Done

A full review of the auth overhaul surfaced several security, correctness, and cleanup issues. All fixed before publish.

### Security

- **BroadcastChannel no longer leaks `refresh_token`:** `broadcastTokenRefresh()` was sending the full `Token` object (including `refresh_token`) via BroadcastChannel. Fixed to send only `accessToken`, `did`, and `tokenScope`. Receiving tab merges just the access token into its existing token object.
- **`CODE_VERIFIER` cleaned up on sign-out:** Both `signOut()` and `clearStoredAuth()` now remove `CODE_VERIFIER` from storage, preventing stale PKCE verifiers from persisting.
- **`code_verifier` redacted in debug logs:** The token exchange log now includes `code_verifier: '[REDACTED]'` when present, matching the existing redaction of `refresh_token` and `code`.
- **`crypto.subtle` fallback:** `generateCodeChallenge()` detects when `crypto.subtle` is unavailable (non-HTTPS / non-secure context) and falls back to `plain` challenge method, sending `code_challenge_method=plain` instead of `S256`.

### Correctness

- **Consistent scope splitting:** `hasScope()` was using `.split(' ')` while `missingScopes()` used `.split(/[\s,]+/)`. Both now use the same regex with `.filter(Boolean)`.
- **`token.error` type guard:** Added `typeof token.error === 'string'` check before calling `.includes()` in `exchangeToken()`, preventing crashes if the server returns a non-string error.
- **`resetAuthState()` now clears `did` and `tokenScope`:** Previously these fields were left stale during error recovery in `exchangeToken()`.
- **`signInWithCode()` sets `freshSignIn`:** Other tabs now correctly reload on programmatic sign-in, matching the redirect flow behavior.

### Cleanup

- **Removed unused `wsUrl` from `AuthManagerConfig`:** Was defined in the type but never read by AuthManager.
- **Stabilized `storageAdapter` with `useRef`:** Prevents unnecessary recreation on every React render.
- **`signOut()` delegates to `clearStoredAuth()` + `resetAuthState()`:** Removed 5 duplicate storage removal lines. Guarantees both methods stay in sync when new keys are added.
- **Fixed `acceptCallback` undefined in `syncProtocol.js` log:** Removed reference to non-existent singular variable (should have been `acceptCallbacks` plural).

**Files:** `core/auth/AuthManager.ts`, `AuthContext.tsx`, `sync/syncProtocol.js`

---

## 12. Cross-tab sign-out cleanup — Done

**Problem:** When Tab A signed out and broadcast `signed_out`, Tab B cleared in-memory auth state but left the Dexie sync connection open and didn't reload.

**Fix:** Since all tabs share the same localStorage and IndexedDB, Tab A's sign-out already deletes the stored data and Dexie database. Tab B just needs to pick up the clean slate. The `signed_out` BroadcastChannel handler now clears in-memory state, calls `notify()`, and triggers `window.location.reload()`.

**Files:** `core/auth/AuthManager.ts`

---

## 13. Cross-tab sign-in sync — Done

**Problem:** When Tab A signed in, Tab B didn't update. `broadcastTokenRefresh()` sent a `token_refreshed` event, but Tab B's handler checked `event.data.accessToken && this.token` — since `this.token` was `null` (Tab B was signed out), the update was silently skipped.

**Fix:**
- Added `broadcastSignIn()` method that posts `{ type: 'signed_in' }`.
- Added `signed_in` handler in `initCrossTabSync()` that reloads the page. Tab A stores `refresh_token` and `user_info` in localStorage before broadcasting, so Tab B's `initialize()` bootstraps the session on reload.
- Used a `freshSignIn` flag (set only during `?code=` callback in `initialize()`) to distinguish user-initiated sign-in from session restoration. This prevents an infinite reload loop — session restore from a stored refresh token broadcasts `token_refreshed` (no reload), while a genuine OAuth code exchange broadcasts `signed_in` (triggers reload on other tabs).

**Files:** `core/auth/AuthManager.ts`

---

## 14. Token registry for dexie-syncable — Done

**Problem:** Passing `getToken` as a function in `dexie-syncable`'s `connect()` options caused a `DataCloneError` because dexie-syncable serializes options into IndexedDB via structured clone, which cannot handle functions.

**Fix:** Created `sync/tokenRegistry.ts` — a module-level `Map<string, GetTokenFn>` keyed by WebSocket URL. `BasicSync.connect()` registers the `getToken` function in this registry, passing only the `schema` in dexie-syncable options. `syncProtocol.js` resolves the function from the registry on each `ws.onopen`.

**Files:** `sync/tokenRegistry.ts` (new), `sync/index.ts`, `sync/syncProtocol.js`

---

## 15. RemoteDB DELETE Content-Type fix — Done

**Problem:** DELETE requests to the PDS returned `400 Bad Request` with `FST_ERR_CTP_EMPTY_JSON_BODY` because the `request()` method always set `Content-Type: application/json`, even when there was no body. Fastify rejects that combination.

**Fix:** `Content-Type: application/json` is now only included in the headers when a request body is present.

**Files:** `core/db/RemoteCollection.ts`

---

## DPoP (DEV-251) — Deferred

DPoP requires proof-of-possession headers with a per-session keypair. Needs PDS requirements analysis to determine if/when DPoP is required. Deferred to a follow-up.
