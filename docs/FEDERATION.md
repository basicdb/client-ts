# Federation Architecture & SDK Roadmap

## Overview

Basic is moving toward a federated architecture where apps and users are not tied to a single centralized server. This document describes how the **Client SDK**, **PDS (Personal Data Store)**, and **Admin Server** interact today and how that will evolve.

---

## Architecture: Three Components

### PDS (Personal Data Store)

The PDS is the user's home server. It owns auth, data, and sync for that user.

- **Repo:** `basic-server`
- **Default deployment:** `pds.basic.id`
- **Endpoints the SDK uses:**
  - `POST /auth/authorize` -- start OAuth flow (redirects to consent screen)
  - `POST /auth/token` -- exchange authorization code or refresh token
  - `GET /auth/userinfo` -- fetch user profile
  - `GET|POST|PUT|DELETE /account/{project_id}/db/{table}[/{item}]` -- data CRUD
  - `WSS /ws` -- real-time sync

The PDS identifies apps by their **client metadata URL** (e.g. `https://api.basic.tech/projects/{uuid}/client-metadata.json`). During OAuth, the PDS fetches this document to learn the app's name, redirect URIs, schema, and branding. It caches this metadata in `account_connection.meta` so it doesn't need the admin-server on every request.

### Admin Server

The admin server is an optional hosting service for app metadata and schemas.

- **Repo:** `admin-server`
- **Default deployment:** `api.basic.tech`
- **Endpoints relevant to the SDK:**
  - `GET /projects/{uuid}/client-metadata.json` -- public client metadata document
  - `GET /project/{uuid}/schema` -- published schema for an app

The admin server is **not required** for a PDS to function. Any app can host its own client metadata document at any URL. The admin server is a convenience for developers who register apps through `basic.tech`.

### Client SDK (`client-ts`)

The TypeScript SDK (`@basictech/react`, `@basictech/nextjs`) runs in the browser. It handles OAuth sign-in, local-first data with Dexie, REST API fallback, and WebSocket sync.

- **Repo:** `client-ts`
- **Packages:** `@basictech/react` (core), `@basictech/nextjs` (middleware + re-exports)

---

## How They Interact

```mermaid
flowchart TB
    subgraph browser [Browser]
        SDK["Client SDK"]
    end

    subgraph pds [PDS]
        Auth["/auth/*"]
        Data["/account/*/db/*"]
        WS["/ws"]
    end

    subgraph admin ["Admin Server (optional)"]
        Metadata["/projects/{uuid}/client-metadata.json"]
        Schema["/project/{uuid}/schema"]
    end

    SDK -->|"OAuth + tokens"| Auth
    SDK -->|"CRUD (REST)"| Data
    SDK -->|"real-time sync"| WS
    SDK -.->|"schema validation (dev-time)"| Schema

    Auth -.->|"fetch app metadata during auth"| Metadata
```

| SDK action | Destination | What is sent | Notes |
|---|---|---|---|
| OAuth authorize | PDS `/auth/authorize` | `client_id` as metadata URL | PDS fetches the metadata doc, caches it, redirects to consent |
| Token exchange | PDS `/auth/token` | `client_id` as metadata URL | PDS validates against stored connection |
| User info | PDS `/auth/userinfo` | Bearer token | Token-based, no project ID needed |
| REST CRUD | PDS `/account/{uuid}/db/...` | UUID in path, Bearer token | PDS maps UUID to internal `connection_id` |
| WebSocket sync | PDS `/ws` | Bearer token | PDS resolves `connection_id` from token |
| Schema check | Admin `/project/{uuid}/schema` | UUID in path | Dev-time validation only, uses configurable `server_url` |

---

## Key Concepts

### Client ID = Metadata URL

A `client_id` is a URL pointing to a JSON metadata document, following the OAuth 2.0 client metadata pattern:

```
https://api.basic.tech/projects/dbebc0b6-9735-4bd1-a77f-72a52aabf970/client-metadata.json
```

The document contains:

```json
{
  "client_id": "https://api.basic.tech/projects/{uuid}/client-metadata.json",
  "client_name": "My App",
  "client_uri": "https://myapp.com",
  "logo_uri": "https://myapp.com/logo.png",
  "redirect_uris": ["https://myapp.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "profile email app:db:read app:db:write"
}
```

Any developer can host this document themselves. The admin server provides hosting as a convenience.

### Backward Compatibility: `normalizeClientId`

Both the PDS and the SDK include a `normalizeClientId` bridge function that converts bare UUIDs to metadata URLs:

```
dbebc0b6-9735-4bd1-a77f-72a52aabf970
  -> https://api.basic.tech/projects/dbebc0b6-9735-4bd1-a77f-72a52aabf970/client-metadata.json
```

This is a **deprecated bridge** for backward compatibility during the migration period. It will be removed once all apps use URL-based client IDs natively.

### Connection ID

Inside the PDS, each user-app relationship is tracked by a `connection_id` (UUID foreign key to `account_connection.id`). This is an internal identifier -- the SDK never sees or sends it. The PDS resolves it from the `client_id` in the token.

---

## Current Minimal SDK Changes (Phase 2 Step 3)

These are the immediate changes being made to align the SDK with the server-side federation work.

### 1. Add `normalizeClientId` utility

New file: `packages/react/src/utils/normalizeClientId.ts`

Converts bare UUIDs to metadata URLs before sending to the PDS. Marked as deprecated -- will be removed when all apps use URL-based client IDs.

### 2. Normalize `client_id` in OAuth flows

In `AuthContext.tsx`, the `getSignInLink()` and `fetchToken()` functions send `normalizeClientId(project_id)` instead of the raw `project_id`. This sends the metadata URL format to the PDS, reducing server-side normalization overhead.

### 3. Fix hardcoded URL in schema validation

`schema.ts` has a hardcoded `https://api.basic.tech/project/{id}/schema` that ignores the configurable `server_url`. This is changed to use `authConfig.server_url` passed from `AuthContext`.

### 4. Clean up dead code

Remove the unused `SERVER_URL` export from `config.ts` (never imported by `AuthContext`, which uses its own `DEFAULT_AUTH_CONFIG`).

---

## Future SDK Roadmap

These are larger changes deferred until the minimal changes above are stable.

### DID-Based PDS Discovery

Replace hardcoded PDS URLs with automatic discovery:

```mermaid
flowchart LR
    Handle["alice.basic.id"] -->|"resolve handle"| DID["did:web:pds.basic.id:did:abc"]
    DID -->|"fetch DID document"| Doc["DID Document"]
    Doc -->|"read #basic_pds service"| PDS["https://pds.basic.id"]
    PDS -->|".well-known/openid-configuration"| OIDC["OAuth endpoints"]
    OIDC -->|"authorization_endpoint"| OAuth["Start OAuth flow"]
```

- `resolveHandle(handle)` -- HTTP call to resolve a user handle to a DID
- `resolveDid(did)` -- fetch the DID document
- `discoverPds(didDoc)` -- extract PDS endpoint from the `#basic_pds` service entry
- `discoverOAuth(pdsUrl)` -- fetch `.well-known/openid-configuration` for OAuth endpoints

This removes the need for `server_url` and `ws_url` config entirely -- the SDK discovers everything from the user's handle.

### Multi-PDS Connection Support

Currently the SDK connects to a single PDS. In a federated world, different users may be on different PDS instances. The SDK will need to:

- Resolve each user's PDS independently
- Maintain separate OAuth sessions per PDS
- Route data operations to the correct PDS based on the authenticated user

### Self-Hosted Client Metadata

The SDK currently assumes metadata URLs follow the `api.basic.tech/projects/{uuid}/...` pattern. Future versions should:

- Accept any URL as `client_id` directly (no UUID-to-URL conversion)
- Remove the `normalizeClientId` bridge entirely
- Let developers pass their own metadata URL in the schema or config

### Schema Validation from PDS

Currently schema validation fetches from the admin server (`/project/{uuid}/schema`). The PDS already stores the schema locally in `account_connection.meta`. A future PDS endpoint could serve the schema directly, removing the admin-server dependency for schema validation entirely.

### Remove Hardcoded Default URLs

Once PDS discovery is in place, the hardcoded defaults can be removed:

| Current default | Purpose | Replacement |
|---|---|---|
| `https://api.basic.tech` | `server_url` for OAuth + REST | Discovered from DID document |
| `wss://pds.basic.id/ws` | WebSocket sync | Discovered from DID document |
| `https://api.basic.tech/projects/{uuid}/...` | `normalizeClientId` base URL | Developer provides full URL as `client_id` |

### Metadata Document Signing

As a trust mechanism, client metadata documents could be cryptographically signed. The PDS would verify the signature before trusting the metadata. This is complementary to domain verification (requiring `redirect_uris` to match the `client_id` domain).

---

## Configuration Reference

### Current SDK config

```tsx
<BasicProvider
  schema={mySchema}          // schema.project_id used as client_id
  project_id="uuid"          // fallback if schema has no project_id
  auth={{
    server_url: 'https://api.basic.tech',   // PDS URL for OAuth + REST
    ws_url: 'wss://pds.basic.id/ws',        // PDS URL for WebSocket
    scopes: 'profile,email,app:admin'
  }}
/>
```

### After minimal changes

Same config interface -- no breaking changes. The `project_id` / `schema.project_id` can now be either a bare UUID (normalized automatically) or a full metadata URL.

### Future config (with PDS discovery)

```tsx
<BasicProvider
  schema={mySchema}
  client_id="https://myserver.com/client-metadata.json"  // full URL
  auth={{
    // server_url and ws_url are auto-discovered from the user's DID
    scopes: 'profile,email,app:db:read,app:db:write'
  }}
/>
```
