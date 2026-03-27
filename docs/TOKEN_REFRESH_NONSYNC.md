# Token expiry and refresh — non-sync (REST / RemoteDB)

Notes for DEV-188. Status: **all code changes complete** (v0.8.0-beta). Only documentation remains.

---

## Current implementation

### 1. `getToken()` (AuthManager)

- **No token in memory:** Tries to recover using refresh token from storage; if that fails or no refresh token, throws.
- **Token in memory:** Decodes JWT and checks `exp` with a **5 second buffer**. If expired (or `forceRefresh: true`), refreshes via `exchangeToken(refresh_token, true)` with mutex, returns new access token. On refresh failure (except network errors), throws.
- **Mutex:** `refreshPromise` ensures only one refresh in flight; other callers wait on the same promise.
- **Network:** On offline/network errors during refresh, returns the expired token so the app can keep trying until back online.

### 2. RemoteCollection (REST)

- Every request calls `getToken()` to get the `Authorization: Bearer <token>`.
- On **401 Unauthorized**, calls `getToken({ forceRefresh: true })` then retries once.
- On **403 Forbidden**, calls `onAuthError` with `errorType: 'forbidden'`.
- After a failed retry: calls `onAuthError` (with `afterRetry: true`), then throws `RemoteDBError`.
- `Content-Type: application/json` is only set when a request body is present (fixes Fastify `FST_ERR_CTP_EMPTY_JSON_BODY` on DELETE).

### 3. Other callers of `getToken()`

- Sync protocol uses `getToken()` on every `ws.onopen` (including reconnects) for a fresh token.
- Proactive refresh fires 60s before JWT expiry and sends `tokenUpdate` on the open WebSocket.
- Any code using `getToken()` from context gets the same behavior.

---

## Completed improvements

### 1. Force refresh on 401 — Done

`getToken({ forceRefresh: true })` added. RemoteCollection calls it on 401 before retrying. `GetTokenOptions` exported.

### 2. onAuthError enrichment — Done

`AuthError` now includes `errorType: 'expired' | 'forbidden' | 'revoked' | 'network' | 'unknown'` and `afterRetry: boolean`. Called for both 401 and 403 responses.

### 3. No changes needed (confirmed)

- Mutex and "wait for in-flight refresh" behavior are solid.
- Recovery from storage when token is missing works correctly.
- Network-offline handling (return expired token or throw with "will be retried when online") is reasonable.

---

## Remaining

- **AUTH_DOCS:** Document token handling in readme/docs (5s buffer, force-refresh on 401, mutex, guidance on using `getToken()` from context for custom calls). Tracked in [TASKS.md](./TASKS.md).
