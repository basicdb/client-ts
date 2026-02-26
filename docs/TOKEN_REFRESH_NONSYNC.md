# Token expiry and refresh — non-sync (REST / RemoteDB)

Notes for DEV-188: handle token expiry in non-sync flows. Current state and suggested improvements.

---

## Current implementation

### 1. `getToken()` (AuthContext)

- **No token in memory:** Tries to recover using refresh token from storage; if that fails or no refresh token, throws (e.g. “Authentication expired. Please sign in again.” or “no token found”).
- **Token in memory:** Decodes JWT and checks `exp` with a **5 second buffer** (`decoded.exp < (Date.now()/1000) + 5`). If expired, refreshes via `fetchToken(refresh_token, true)` (with mutex to avoid concurrent refreshes), then returns the new access token. On refresh failure (except “network offline”), throws. If not expired, returns current `access_token`.
- **Mutex:** `refreshPromiseRef` ensures only one refresh in flight; other callers wait on the same promise.
- **Network:** On “offline”/“Network” errors during refresh, `getToken()` sometimes returns the expired token so the app can keep trying (e.g. until back online).

### 2. RemoteCollection (REST)

- Every request calls `getToken()` once to get the `Authorization: Bearer <token>`.
- On **401 Unauthorized**, retries the **same request once** (`isRetry = true`). The retry path calls `getToken()` again and sends the new token.
- After the single retry, if still not OK: calls `onAuthError` (if provided), then throws `RemoteDBError`.
- **Gap:** On 401, the retry uses whatever `getToken()` returns. `getToken()` only refreshes when the **client-side** `exp` check says the token is expired (with 5s buffer). If the server returns 401 for other reasons (revoked token, server clock skew, or token already invalid on server but not yet “expired” by our buffer), the retry still gets the same token from `getToken()` and will 401 again. So we don’t actually “force” a refresh on 401; we only get a new token if the client already decided to refresh.

### 3. Other callers of `getToken()`

- Sync connect in AuthContext uses `getToken()` before opening the WebSocket (proactive).
- Any other code that uses `getToken()` (e.g. custom API calls) gets the same behavior: proactive refresh when client-side exp says so, no forced refresh on server rejection.

---

## Suggestions

### 1. Force refresh on 401 — Implemented

**Problem:** 401 can mean “token expired or invalid on server” even when our client-side `exp` buffer hasn’t triggered. Retrying with the same token is useless.

**Option A — `getToken(options?: { forceRefresh?: boolean })`**  
- Add an optional parameter to `getToken()`. When `forceRefresh: true`, skip the “return current token if not expired” path and run refresh (or wait for in-flight refresh), then return.  
- RemoteCollection: on 401 before retry, call `getToken({ forceRefresh: true })` (or equivalent), then retry the request with that token.  
- Keeps a single entry point for “get a valid access token”; backward compatible if the param is optional.

**Option B — Separate `refreshAccessToken()`**  
- Expose a method that always performs a refresh and returns the new access token (or throws).  
- RemoteCollection on 401 would call `refreshAccessToken()` then retry.  
- Slightly more explicit, but two ways to get a token (proactive vs reactive).

**Done:** `getToken(options?: { forceRefresh?: boolean })` added. When `forceRefresh: true`, the client skips the “return current token if not expired” path and runs refresh. RemoteCollection on 401 calls `getToken({ forceRefresh: true })` before retrying so the retry uses a newly refreshed token. `GetTokenOptions` is exported from the package.

### 2. Document behavior

- In readme or docs: “Remote mode uses `getToken()` for every request; on 401 we retry once. Ensure your app uses the same `getToken()` from context for any custom API calls so refresh and mutex behavior are consistent.”
- Document the 5s buffer and that refresh is triggered by client-side `exp` plus optional force-refresh on 401.

### 3. Optional: onAuthError payload

- Today `onAuthError` receives `{ status, message, response }`. Optionally include a hint when the failure was after a retry (e.g. `afterRetry: true`) so the app can show “Session expired” vs “Invalid request” if needed. Minor improvement.

### 4. No change needed

- Mutex and “wait for in-flight refresh” behavior are good.  
- Recovery from storage when token is missing is good.  
- Network-offline handling (return expired token or throw with “will be retried when online”) is reasonable.

---

## Summary

- **Current:** Non-sync uses `getToken()` for each request; 401 triggers one retry, but retry uses the same token unless the client-side exp check already triggered a refresh.  
- **Main fix:** Add a way to force refresh (e.g. `getToken({ forceRefresh: true })`) and have RemoteCollection call it on 401 before retrying.  
- **Then:** Document token handling and optional `onAuthError` improvement.
