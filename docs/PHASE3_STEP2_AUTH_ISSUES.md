# Phase 3 Step 2 — Auth improvements (issues only)

This document lists **problems and improvement areas** for Step 2 of [PHASE3_SDK_UPGRADE_PLAN.md](./PHASE3_SDK_UPGRADE_PLAN.md) (Auth improvements). It does **not** propose solutions.

Related: [PHASE3_STEP1_PROGRESS.md](./PHASE3_STEP1_PROGRESS.md), [TOKEN_REFRESH_NONSYNC.md](./TOKEN_REFRESH_NONSYNC.md), [TASKS.md](./TASKS.md).

---

## 1. Sync (Dexie / WebSocket) and token expiry

- **Stale token on long-lived sync:** The sync connection is established with an access token obtained at connect time. When that token expires or is rejected by the server, dexie-syncable can surface status **4** (`ERROR_WILL_RETRY`). Today the SDK updates `dbStatus` but does **not** tie that state to token refresh or a deliberate disconnect/reconnect of the WebSocket with a new token. Apps can remain in a retrying or degraded state without a clear recovery path driven by auth.

- **No first-class “token expired” signal for sync:** `ERROR_WILL_RETRY` covers multiple failure modes, not only expired tokens. Distinguishing “credentials need refresh” from other transient errors is left to convention and documentation, not to a dedicated status or error code in the public API.

- **Connect timing vs token rotation:** Sync connect is driven by auth/session flags rather than by a continuous model of access-token lifetime. There is no coordinated story (in the public API) for “token was rotated; sync must use the new token” beyond whatever implicit behavior exists today.

- **Risk of refresh storms:** Any future logic that reacts to sync errors or status changes by refreshing tokens must avoid tight loops (repeated refresh + reconnect when the failure is not token-related, server misconfiguration, or rate limits).

---

## 2. Proactive token handling for sync

- **Server may see expired tokens:** Without refreshing and reconnecting **before** `exp`, the WebSocket path can send or rely on an access token that is already expired relative to JWT `exp` or server policy.

- **Gap between REST and sync behavior:** Non-sync paths have a more explicit story around `getToken()` and retries; sync does not yet mirror that level of alignment with token lifecycle.

---

## 3. REST / RemoteDB token lifecycle

- **Consistency across call sites:** Not every code path that talks to the PDS may use the same token acquisition and refresh semantics. Any divergence creates “works in RemoteCollection but not in custom fetch” behavior.

- **401 semantics vs client-side `exp`:** Server `401` can mean “invalid or revoked on our side” even when the client’s JWT `exp` has not fired yet. The degree to which all REST callers benefit from the same reactive handling varies by entry point.

- **Documentation lag:** End-user and integrator docs may not fully describe buffers, mutex behavior, offline edge cases, and when a fresh token is guaranteed vs best-effort.

- **Auth error callbacks:** Failures after retry may not give callers enough structured context (e.g. whether a second attempt already ran) to build precise UX (“session expired” vs “forbidden” vs “network”).

---

## 4. Scopes and authorization (DEV-188)

- **Requested vs granted:** OAuth flows request scopes; tokens carry granted scopes. The gap between what the app asked for and what the user/server granted is not surfaced as a first-class, documented pattern for app authors.

- **403 handling:** Operations that fail with **403** due to missing scope are not clearly tied to guidance (“you need scope X”) in the SDK surface or docs.

- **`hasScope` alone:** Having `hasScope` on context helps checks but does not by itself document workflows after login, re-consent, or partial scope grants.

---

## 5. Token verification and OAuth hardening

- **JWKS / local verification (DEV-188):** Access tokens are used as bearer credentials without an optional, documented path to validate them against PDS JWKS in the client when product/security requirements ask for it.

- **PKCE and DPoP (DEV-251):** Alignment of the SDK’s OAuth implementation with PDS expectations for PKCE and DPoP is not fully captured in repo artifacts (verification checklist, automated tests, or explicit gap list). Unknown or undocumented mismatches are a compliance and interop risk.

---

## 6. Cross-cutting and product risks

- **Multi-tab / focus:** Token refresh in one tab and sync state in another can diverge; there is no documented or enforced model for how auth and sync should behave across tabs.

- **Offline and partial failure:** Behavior when refresh fails, network is flaky, or cached user info is used is easy to misunderstand without clear, centralized documentation of invariants.

- **Testing and regression safety:** Token refresh paths, sync status transitions, and REST retries are sensitive to timing and race conditions; lack of targeted tests increases the risk of regressions when auth code changes.

---

## Linear / ticket references (from plan)

- **DEV-254** — Sync invalid token / auto refresh  
- **DEV-188** — React SDK upgrade (token expiry, scopes, JWKS)  
- **DEV-251** — PKCE / DPoP  

Use these for tracking; this doc stays issue-focused only.
