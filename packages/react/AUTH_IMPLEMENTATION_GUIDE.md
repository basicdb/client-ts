# Authentication Implementation Guide

This guide provides comprehensive REST API specifications and requirements for implementing authentication with Basic PDS Server. 

---

## Table of Contents

1. [PDS Authentication](#pds-authentication)
   - [Account Registration](#account-registration)
   - [Account Login](#account-login)
   - [OAuth Authorization](#oauth-authorization)
   - [Session Management](#session-management)
   - [Password Management](#password-management)
   - [Email Verification](#email-verification)
   - [Username Availability](#username-availability)
   - [DID Resolution](#did-resolution)
2. [OAuth2 Implementation](#oauth2-implementation)
   - [Discovery & Configuration](#discovery--configuration)
   - [Scopes](#scopes) 
   - [Authorization Code Flow](#authorization-code-flow)
   - [Token Management](#token-management)
   - [User Information](#user-information)
3. [Scopes & Authorization](#scopes--authorization)
   - [Scope System](#scope-system)
   - [Available Scopes Reference](#available-scopes-reference)
   - [Action Implications](#action-implications)
   - [Admin Scope Behavior](#admin-scope-behavior)
   - [Authorization Errors](#authorization-errors)
   - [Best Practices](#best-practices)
4. [PKCE Extension](#pkce-extension-optional)
5. [DPoP Extension](#dpop-extension-optional)
6. [Security Requirements](#security-requirements)

---

## PDS Authentication

PDS authentication provides username/password-based authentication with email verification, password reset, and decentralized identifiers (DIDs). This is meant for clients of the PDS server, usually a front-end.

---

### Account Registration

**Endpoint:** `POST /auth/signup`

Create a new user account with username and password.

#### Request

```http
POST /auth/signup HTTP/1.1
Content-Type: application/json

{
  "type": "password",
  "username": "john_doe",
  "password": "securepassword123",
  "email": "john@example.com",
  "name": "John Doe"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Authentication type. Must be `"password"` |
| `username` | string | Yes | Unique username (alphanumeric, underscores) |
| `password` | string | Yes | User password (minimum 3 characters) |
| `email` | string | No | User email address (for verification) |
| `name` | string | No | User's display name |

#### Response

**Success (200):**
```json
{
  "data": {
    "id": "acc_12345",
    "username": "john_doe",
    "email": "john@example.com",
    "name": "John Doe",
    "created_at": "2025-09-29T10:00:00Z"
  }
}
```

**Error (400):**
```json
{
  "error": "Email already verified",
  "message": "This email address is already verified with another account"
}
```

#### Email Verification

If an email is provided during signup, a verification email is automatically sent containing a verification link:
```
https://your-app.com/login?verify_email_token={token}&email={email}
```

The verification token is valid for **24 hours**.

---

### Account Login

**Endpoint:** `POST /auth/login`

Authenticate with username and password to receive access and refresh tokens.

#### Request

```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepassword123"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | User's username or email |
| `password` | string | Yes | User's password |

#### Response

**Success (200):**
```json
{
  "auth": {
    "account_id": "acc_12345",
    "ok": true
  },
  "token": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 60,
    "refresh_token": "3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456..."
  }
}
```

**Error (401):**
```json
{
  "error": "Unauthorized - Invalid credentials"
}
```

#### Token Details

- **Access Token**: JWT signed with RS256, valid for 1 minute
- **Refresh Token**: Cryptographically random opaque token stored in database, valid for 30 days
- **Token Type**: Always `"Bearer"`

The access token payload contains:
```json
{
  "userId": "acc_12345",
  "clientId": "self",
  "scope": "admin",
  "sid": "sess_abc123",
  "iat": 1727606400,
  "exp": 1727606460
}
```

**Token Claims:**
- `userId` - Account ID
- `clientId` - Always `"self"` for login
- `scope` - Always `"admin"` for login (grants full account access)
- `sid` - Session ID
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

**The `admin` scope:**
- Grants access to all account features
- Can view/manage all sessions
- Can access data from all connected apps
- Only available via login (not OAuth apps)

---

### OAuth Authorization

**Endpoint:** `POST /auth/authorize`

After a user logs in with PDS authentication, they can authorize OAuth applications to access their account.

#### Request

```http
POST /auth/authorize HTTP/1.1
Host: auth.example.com
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "client_id": "app_123",
  "redirect_uri": "https://app.example.com/callback",
  "scope": "profile email",
  "state": "xyz123",
  "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  "code_challenge_method": "S256"
}
```

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with `admin` scope (from login) |

**Note:** Only users logged in via `/auth/login` can authorize apps (have admin scope)

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | Application identifier |
| `redirect_uri` | string | Yes | Callback URI |
| `scope` | string | Yes | Requested scopes |
| `state` | string | No | State parameter from initial request |
| `code_challenge` | string | No | PKCE code challenge |
| `code_challenge_method` | string | No | Must be `"S256"` if challenge provided |

#### Response

**Success (200):**
```json
{
  "code": "auth_abc123def456",
  "redirect": "https://app.example.com/callback?code=auth_abc123def456&state=xyz123",
  "connect": {
    "id": "conn_789",
    "account_id": "acc_12345",
    "project_id": "app_123",
    "status": "connected",
    "scope": "profile email"
  },
  "pkce_supported": true
}
```

**Error (401):**
```json
{
  "error": "access_denied",
  "error_description": "User authentication failed"
}
```

#### Authorization Code Properties

- **Format**: Opaque string (e.g., `abc123def456`)
- **Validity**: Single use only
- **Expiration**: Short-lived (typically 10 minutes)
- **Storage**: Includes redirect_uri, scope, PKCE challenge if provided

---

### Session Management

Sessions track authenticated devices and provide security features like device management and refresh token family tracking.

#### Session Creation

Sessions are automatically created during:
1. **PDS Login** (`POST /auth/login`)
2. **OAuth2 Token Exchange** (`POST /auth/token` with authorization code)

Each session includes:
- **Session ID**: Unique identifier
- **Device Instance ID**: Unique device identifier
- **User Agent**: Browser/application information
- **Platform**: Device platform (Web, Mobile, etc.)
- **IP Address**: Connection IP
- **Last Seen**: Timestamp of last activity

#### Session Properties

```json
{
  "id": "sess_abc123",
  "account_connection_id": "conn_789",
  "account_id": "acc_12345",
  "project_id": "app_123",
  "device_instance_id": "device_1727606400_abc",
  "label": "OAuth Client Session",
  "user_agent": "Mozilla/5.0...",
  "platform": "Web",
  "ip_inet": "192.168.1.1",
  "last_seen_at": "2025-09-29T10:30:00Z",
  "created_at": "2025-09-29T10:00:00Z"
}
```

#### Refresh Token Chain

Each session maintains a **refresh token family**:
- All refresh tokens in a session belong to the same family
- Token rotation creates new tokens in the same family
- Reuse detection revokes the entire family
- Session termination revokes all family tokens

---

### Password Management

#### Request Password Reset

**Endpoint:** `POST /auth/forgot-password`

Request a password reset link to be sent via email.

#### Request

```http
POST /auth/forgot-password HTTP/1.1
Content-Type: application/json

{
  "identifier": "john@example.com"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | User's email or username |

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "If an account with that email/username exists, a password reset link has been sent"
}
```

**Note:** For security, the response is always the same whether the account exists or not.

#### Reset Token

The reset link sent via email has the format:
```
https://your-app.com/login?reset_token={token}&email={email}
```

The reset token is valid for **15 minutes**.

---

#### Reset Password with Token

**Endpoint:** `POST /auth/reset-password`

Reset the password using a valid reset token.

#### Request

```http
POST /auth/reset-password HTTP/1.1
Content-Type: application/json

{
  "reset_token": "abc123def456...",
  "password": "newSecurePassword456"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reset_token` | string | Yes | Valid reset token from email |
| `password` | string | Yes | New password (minimum 3 characters) |

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Password has been successfully reset"
}
```

**Error (400):**
```json
{
  "error": "Invalid or expired reset token"
}
```

---

#### Verify Reset Token

**Endpoint:** `POST /auth/verify-reset-token`

Check if a password reset token is valid before showing the reset form.

#### Request

```http
POST /auth/verify-reset-token HTTP/1.1
Content-Type: application/json

{
  "reset_token": "abc123def456..."
}
```

#### Response

```json
{
  "valid": true
}
```

---

### Email Verification

#### Send Verification Email

**Endpoint:** `POST /auth/verify-email`

Request a verification email to be sent.

#### Request

```http
POST /auth/verify-email HTTP/1.1
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a verification link has been sent",
  "verification_link": "https://your-app.com/login?verify_email_token=..."
}
```

**Already Verified (200):**
```json
{
  "success": true
}
```

---

#### Verify Email with Token

**Endpoint:** `POST /auth/verify-email-token`

Complete email verification using the token from the verification link.

#### Request

```http
POST /auth/verify-email-token HTTP/1.1
Content-Type: application/json

{
  "token": "abc123def456..."
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Email has been successfully verified"
}
```

**Error (400):**
```json
{
  "error": "Invalid or expired verification token"
}
```

---

### Username Availability

**Endpoint:** `GET /auth/check-username`

Check if a username is available for registration.

#### Request

```http
GET /auth/check-username?username=john_doe HTTP/1.1
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Username to check |

#### Response

```json
{
  "available": true
}
```

---

### DID Resolution

**Endpoint:** `GET /auth/resolve`

Resolve a decentralized identifier (DID) to its document. Further DID support coming soon.

#### Request

```http
GET /auth/resolve?did=did:pds:base64url_encoded_data HTTP/1.1
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `did` | string | Yes | DID to resolve (format: `did:pds:{base64url}`) |

#### Response

```json
{
  "did": "decoded_did_data"
}
```

#### DID Format

DIDs follow the format: `did:pds:{base64url_encoded_data}`

- Must start with `did:`
- Method must be `pds`
- Body is base64url encoded data

---

## OAuth2 Implementation

OAuth2 endpoints are meant for client applications who want to connect to a user's PDS.
OAuth2 provides secure delegated access using the **Authorization Code Flow** with optional PKCE support. This implementation follows RFC 6749 (OAuth 2.0) and RFC 6750 (Bearer Token).

### Discovery & Configuration

#### OpenID Connect Discovery

**Endpoint:** `GET /.well-known/openid-configuration`

Provides metadata about the OAuth2/OIDC server capabilities.

#### Request

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: auth.example.com
```

#### Response

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/auth/authorize",
  "token_endpoint": "https://auth.example.com/auth/token",
  "userinfo_endpoint": "https://auth.example.com/auth/userinfo",
  "jwks_uri": "https://auth.example.com/auth/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": [
    "openid:read",
    "profile:read",
    "email:read",
    "account:read",
    "account:write",
    "account:update",
    "account:app:read",
    "account:app:write",
    "account:app:delete",
    "account:session:read",
    "account:session:write",
    "account:session:update",
    "account:session:delete",
    "app:db:read",
    "app:db:write",
    "app:db:update",
    "app:db:delete",
    "admin"
  ],
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "client_secret_basic",
    "none"
  ],
  "code_challenge_methods_supported": ["S256"],
  "claims_supported": [
    "sub",
    "iss",
    "aud",
    "exp",
    "iat",
    "email",
    "email_verified",
    "name",
    "given_name",
    "family_name",
    "picture"
  ]
}
```

---

#### JWKS Endpoint

**Endpoint:** `GET /.well-known/jwks.json`

Provides the public keys for JWT verification in JSON Web Key Set (JWKS) format.

#### Request

```http
GET /.well-known/jwks.json HTTP/1.1
Host: auth.example.com
```

#### Response

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "1",
      "n": "xGOr-H7A...",
      "e": "AQAB",
      "alg": "RS256"
    }
  ]
}
```

**Response Headers:**
```
Content-Type: application/json
Cache-Control: public, max-age=3600
Access-Control-Allow-Origin: *
```

---

### Authorization Code Flow

The authorization code flow is a three-step process:
1. Client redirects user to authorization endpoint
2. User authenticates and authorizes the application
3. Client exchanges authorization code for access token

#### Step 1: Authorization Request

**Endpoint:** `GET /auth/authorize`

Initiate the OAuth2 authorization flow.

#### Request

```http
GET /auth/authorize?client_id=app_123&redirect_uri=https://app.example.com/callback&response_type=code&scope=profile%20email&state=xyz123 HTTP/1.1
Host: auth.example.com
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | Application/project identifier |
| `redirect_uri` | string | Yes | URI to redirect after authorization |
| `response_type` | string | Yes | Must be `"code"` |
| `scope` | string | No | Space-separated list of scopes (default: `"profile"`) |
| `state` | string | Yes | CSRF protection token (opaque value) |
| `code_challenge` | string | No | PKCE code challenge (see PKCE section) |
| `code_challenge_method` | string | No | Must be `"S256"` if PKCE is used |

#### Redirect URI Validation

The `redirect_uri` must:
- Be a valid URL format
- Match the registered redirect URI in the project profile (exact match)
- If no redirect URI is registered, fallback rules apply:
  - Localhost URIs (`localhost`, `127.0.0.1`) are allowed
  - URIs matching the project's website hostname are allowed

#### Response

The server redirects the user to the authorization UI:

```http
HTTP/1.1 302 Found
Location: https://basic.id/authorize?client_id=app_123&redirect_uri=https://app.example.com/callback&response_type=code&scope=profile%20email&state=xyz123
```

#### Error Handling

If validation fails, the server responds based on the error:

**Invalid redirect_uri (400):**
```json
{
  "error": "invalid_request",
  "error_description": "Invalid redirect_uri: does not match registered value"
}
```

**For other errors, redirect to client:**
```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?error=invalid_request&error_description=Missing+client_id&state=xyz123
```

---

#### Step 2: Token Exchange

**Endpoint:** `POST /auth/token`

Exchange authorization code for access and refresh tokens.

#### Request

```http
POST /auth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth_abc123def456",
  "redirect_uri": "https://app.example.com/callback",
  "client_id": "app_123",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}
```

#### Request Body Parameters (JSON)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | Yes | Must be `"authorization_code"` |
| `code` | string | Yes | Authorization code from previous step |
| `redirect_uri` | string | Yes* | Must match the authorization request |
| `client_id` | string | No | Application identifier (validated if provided) |
| `code_verifier` | string | No** | PKCE code verifier |

\* Required if `redirect_uri` was used in authorization request  
\** Required if PKCE code challenge was used

#### Response

**Success (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 60,
  "refresh_token": "789abc123def456789abc123def456789abc456def789abc123def456...",
  "scope": "profile email"
}
```

**Error (400):**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid or expired authorization code"
}
```

#### Token Properties

**Access Token (JWT):**
- Algorithm: RS256
- Expiration: 60 seconds (1 minute)
- Claims:
  ```json
  {
    "clientId": "app_123",
    "userId": "acc_12345",
    "scope": "profile email",
    "iat": 1727606400,
    "exp": 1727610000
  }
  ```

**Refresh Token:**
- Format: Opaque cryptographic token
- Storage: Database with hashed value
- Expiration: 30 days
- Properties: Linked to session, supports rotation

---

### Token Management

#### Refresh Access Token

**Endpoint:** `POST /auth/token`

Obtain a new access token using a refresh token.

#### Request

```http
POST /auth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "789abc123def456789abc123def456789abc456def789abc123def456...",
  "client_id": "app_123"
}
```

#### Request Body Parameters (JSON)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | Yes | Must be `"refresh_token"` |
| `refresh_token` | string | Yes | Valid refresh token |
| `client_id` | string | No | Application identifier (validated if provided) |

#### Response

**Success (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 60,
  "refresh_token": "456def789abc123def456789abc123def456abc123def456789abc...",
  "scope": "profile email"
}
```

**Error (400):**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid or expired refresh token"
}
```

#### Refresh Token Rotation

The server implements **automatic refresh token rotation** for security:

1. Each refresh token use generates a new refresh token
2. The old refresh token is marked as "used" but kept in grace period
3. **Grace Period**: 60 seconds window where old token can be reused
   - Prevents issues with network retries
   - Multiple requests return the same new token
4. **Reuse Detection**: If a revoked token is used → entire chain is revoked

#### Validation Checks

Before issuing new tokens, the server validates:
- Refresh token is active and not expired
- Account connection is still active (`status = 'connected'`)
- Client ID matches (if provided)
- Token hasn't been revoked

---

### User Information

**Endpoint:** `GET /auth/userinfo`

Retrieve user information using an access token (OpenID Connect UserInfo endpoint).

#### Request

```http
GET /auth/userinfo HTTP/1.1
Host: auth.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with `profile` or `admin` scope |

#### Response

**Success (200):**
```json
{
  "sub": "acc_12345",
  "id": "acc_12345",
  "name": "John Doe",
  "email": "john@example.com",
  "username": "john_doe"
}
```

**Error (401):**
```json
{
  "error": "invalid_request",
  "error_description": "Invalid or expired access token"
}
```

**Error (403):**
```json
{
  "error": "invalid_scope",
  "error_description": "Requires 'profile:read' permission. No grant found for 'profile:read'..."
}
```

#### Scope Requirements

The access token must have:
- `profile:read` scope - Standard user information access
- OR `admin` scope - Full access (includes all scopes)

---

## Scopes & Authorization

### Scope System

The server uses a hierarchical scope-based authorization system for fine-grained permission control.

**Scope Format:** `resource:child:action`

**Examples:**
- `account:read` or `account` - Read account information (read is default)
- `app:db:write` - Write to app database
- `account:session:delete` - Delete sessions
- `admin` - Super scope (grants everything)

**Default Action:**
- If no action is specified, defaults to `read`
- `profile` = `profile:read`
- `email` = `email:read`
- `account` = `account:read`

**Key Principles:**
- ✅ **Hierarchical:** Resources can have children (`account:app:read`)
- ✅ **Action Implications:** Higher actions grant lower ones
- ✅ **Default Action:** Omitted action defaults to `read`
- ✅ **Validated:** Invalid scopes rejected at creation
- ✅ **Clear Errors:** Detailed permission messages

---

### Available Scopes Reference

#### OpenID Connect Scopes

| Scope | Description |
|-------|-------------|
| `profile:read` | User profile information (name, username) |
| `email:read` | User's email address |
| `openid:read` | OpenID Connect authentication |

#### Account Management

| Scope | Description | Implied Actions |
|-------|-------------|-----------------|
| `account:read` | View account details | - |
| `account:write` | Full write access | read, create, update, delete |
| `account:update` | Update account information | - |
| `account:admin` | Full account control | write + all sub-actions |

#### Connected Apps

| Scope | Description | Implied Actions |
|-------|-------------|-----------------|
| `account:app:read` | List connected applications | - |
| `account:app:write` | Full app management | read, create, update, delete |
| `account:app:update` | Update app connections | - |
| `account:app:delete` | Disconnect applications | - |
| `account:app:admin` | Full app control | write + all sub-actions |

#### Session Management

| Scope | Description | Implied Actions |
|-------|-------------|-----------------|
| `account:session:read` | View active device sessions | - |
| `account:session:write` | Full session management | read, create, update, delete |
| `account:session:update` | Update session metadata | - |
| `account:session:delete` | Revoke sessions | - |
| `account:session:admin` | Full session control | write + all sub-actions |

#### App Database

| Scope | Description | Implied Actions |
|-------|-------------|-----------------|
| `app:db:read` | Query database tables | - |
| `app:db:write` | Full database access | read, create, update, delete |
| `app:db:create` | Create new records | - |
| `app:db:update` | Update existing records | - |
| `app:db:delete` | Delete records | - |
| `app:db:admin` | Full database control | write + all sub-actions |

#### App Profiles

| Scope | Description | Implied Actions |
|-------|-------------|-----------------|
| `app:profile:read` | View user profiles in app | - |
| `app:profile:write` | Full profile access | read, create, update, delete |
| `app:profile:update` | Update user profiles | - |
| `app:profile:delete` | Delete user profiles | - |
| `app:profile:admin` | Full profile control | write + all sub-actions |

---

### Action Implications

**Automatic Permission Grants:**

```
admin → write → read, create, update, delete
```

**How It Works:**
When you have a higher-level action, you automatically get all lower-level actions.

**Example 1: Database Write**
```
Granted: app:db:write
Automatically includes:
  ✅ app:db:read
  ✅ app:db:create
  ✅ app:db:update
  ✅ app:db:delete
```

**Example 2: Admin Scope**
```
Granted: admin
Automatically includes:
  ✅ Every scope in the system
  ✅ Bypasses all restrictions
```

**Best Practice:** Request the highest action you need, not every individual permission.

---

### Admin Scope Behavior

**The `admin` scope is special:**

**Availability:**
- ✅ Only via `/auth/login` (client_id='self')
- ❌ OAuth apps cannot request it

**Permissions:**
- ✅ Grants ALL scopes
- ✅ Bypasses ownership checks
- ✅ Access to all apps' data
- ✅ Full account administration

**Use Cases:**
- User managing their own account
- Viewing data across all connected apps
- Account administration and debugging

**Security:**
```http
Third-party app requests admin:
GET /auth/authorize?scope=admin&client_id=my-app
→ ERROR: "Admin scopes can only be granted to the self client"
```

---

### Authorization Errors

#### 1. Insufficient Scope (403)

**Cause:** Missing required scope

**Response:**
```json
{
  "error": "insufficient_permissions",
  "message": "Requires 'app:db:write' permission",
  "required": "app:db:write",
  "reason": "No grant found for 'app:db:write'. Available: profile:read"
}
```

**Solution:** Request additional scopes via incremental authorization

---

#### 2. Resource Ownership (403)

**Cause:** Accessing another app's data

**Response:**
```json
{
  "error": "forbidden",
  "message": "Cannot access data for a different application",
  "type": "ownership",
  "hint": "Your access token is scoped to a different application."
}
```

**Solution:** Use correct project_id or get admin scope

---

#### 3. Invalid Scope (400)

**Cause:** Requesting non-existent scope

**Response:**
```json
{
  "error": "invalid_scope",
  "error_description": "Invalid scopes: unknown:scope"
}
```

**Solution:** Use valid scopes from reference

---

### Best Practices

**1. Request Minimum Scopes**
```javascript
// ✅ Good
scope: 'profile:read app:db:write'

// ❌ Bad (redundant)
scope: 'profile:read app:db:read app:db:write app:db:create app:db:update'
```

**2. Handle Errors Gracefully**
```javascript
if (response.status === 403) {
  const error = await response.json();
  if (error.required) {
    // Guide user to re-authorize with needed scope
    requestAdditionalScope(error.required);
  }
}
```

**3. Use Incremental Authorization**
```javascript
// Start with basic scopes
initialScopes: 'profile:read'

// Request more later when needed
additionalScopes: 'app:db:write'
// Result: User has both scopes
```

**4. Test with Real Scopes**
- Don't use admin in development
- Test with actual OAuth scopes
- Validate error handling

---

### Scope Format Rules

**Valid Formats:**
- Full format: `resource:action` (e.g., `profile:read`)
- Shorthand: `resource` (e.g., `profile` - defaults to `read`)
- Hierarchical: `resource:child:action` (e.g., `account:app:read`)

**Examples:**
```
✅ Valid:
- profile (defaults to profile:read)
- email (defaults to email:read)  
- account:read
- app:db:write
- account:session:delete

❌ Invalid:
- account.read (wrong separator)
- app/db (wrong separator)
- app::read (consecutive colons)
```

**OAuth Standard Compatibility:**
- OpenID Connect scopes: `profile`, `email`, `openid` (read action implied)
- Custom scopes: Use full format or shorthand for read

---

## PKCE Extension (Optional)

**Proof Key for Code Exchange (PKCE)** enhances security for public clients that cannot securely store client secrets. This follows RFC 7636.

### PKCE Flow Overview

1. Client generates code verifier (random string)
2. Client creates code challenge (SHA256 hash of verifier)
3. Authorization request includes code challenge
4. Token request includes code verifier
5. Server validates: `SHA256(code_verifier) === code_challenge`

### Implementation Steps

#### Step 1: Generate Code Verifier

Create a cryptographically random string:

```javascript
// Generate 32-byte random string
const verifier = base64url(randomBytes(32))
// Example: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
```

**Requirements:**
- Length: 43-128 characters
- Character set: `[A-Z]`, `[a-z]`, `[0-9]`, `-`, `.`, `_`, `~`
- Encoding: Base64url without padding

---

#### Step 2: Generate Code Challenge

Create SHA256 hash of the code verifier:

```javascript
const challenge = base64url(sha256(verifier))
// Example: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
```

**Algorithm:** `S256` (SHA256) - Only supported method

---

#### Step 3: Authorization Request with PKCE

```http
GET /auth/authorize?client_id=app_123&redirect_uri=https://app.example.com/callback&response_type=code&state=xyz123&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256 HTTP/1.1
```

**Additional Parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `code_challenge` | Base64url string | SHA256 hash of verifier |
| `code_challenge_method` | `"S256"` | Always use SHA256 |

---

#### Step 4: Token Exchange with PKCE

```http
POST /auth/token HTTP/1.1
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth_abc123",
  "redirect_uri": "https://app.example.com/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}
```

**Additional Parameter:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `code_verifier` | Original random string | Used to verify challenge |

---

### PKCE Validation

The server validates PKCE as follows:

1. **If code challenge was provided in authorization:**
   - `code_verifier` is **required** in token request
   - Server computes: `SHA256(code_verifier)`
   - Must match stored `code_challenge`
   - Mismatch → `400 invalid_grant`

2. **If no code challenge in authorization:**
   - PKCE is optional
   - `code_verifier` is ignored if provided

### Error Responses

**Missing code_verifier:**
```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameter: code_verifier (PKCE validation required)"
}
```

**Invalid code_verifier:**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid code_verifier - PKCE validation failed"
}
```

**Unsupported challenge method:**
```json
{
  "error": "invalid_request",
  "error_description": "Invalid code_challenge_method. Only S256 is supported"
}
```

---

## DPoP Extension (Optional)

**Demonstrating Proof-of-Possession (DPoP)** binds tokens to specific clients using public key cryptography. This follows [RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449).

### DPoP Overview

DPoP prevents token theft by binding tokens to a client's private key:
1. Client generates key pair
2. Client creates DPoP proof (signed JWT)
3. Server binds token to key thumbprint
4. All requests require valid DPoP proof

### DPoP Proof Format

A DPoP proof is a JWT with specific claims:

```json
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  }
}
```

**Payload:**
```json
{
  "jti": "unique-request-id",
  "htm": "POST",
  "htu": "https://auth.example.com/auth/token",
  "iat": 1727606400,
  "ath": "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo"
}
```

### DPoP Claims

| Claim | Required | Description |
|-------|----------|-------------|
| `typ` | Yes | Must be `"dpop+jwt"` |
| `alg` | Yes | Signing algorithm (ES256, RS256) |
| `jwk` | Yes | Public key in JWK format |
| `jti` | Yes | Unique identifier (prevents replay) |
| `htm` | Yes | HTTP method (uppercase) |
| `htu` | Yes | HTTP URI (without query/fragment) |
| `iat` | Yes | Issued at timestamp |
| `ath` | No | Hash of access token (for resource requests) |

### Implementation Steps

#### Step 1: Generate Key Pair

```javascript
// Generate ES256 key pair
const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
)

// Export public key as JWK
const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey)
```

---

#### Step 2: Create DPoP Proof

```javascript
// Create proof header
const header = {
  typ: "dpop+jwt",
  alg: "ES256",
  jwk: publicJwk
}

// Create proof payload
const payload = {
  jti: crypto.randomUUID(),
  htm: "POST",
  htu: "https://auth.example.com/auth/token",
  iat: Math.floor(Date.now() / 1000)
}

// Sign JWT
const dpopProof = await signJWT(header, payload, privateKey)
```

---

#### Step 3: Token Request with DPoP

```http
POST /auth/token HTTP/1.1
Host: auth.example.com
Content-Type: application/json
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6Ik...

{
  "grant_type": "authorization_code",
  "code": "auth_abc123",
  "redirect_uri": "https://app.example.com/callback"
}
```

**Headers:**
```
Content-Type: application/json
DPoP: {dpop_proof_jwt}
```

---

#### Step 4: DPoP-Bound Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9...",
  "token_type": "DPoP",
  "expires_in": 60,
  "refresh_token": "xyz789abc123def456789abc123def456789def456abc123def789abc...",
  "scope": "profile email"
}
```

**Key Differences:**
- `token_type` is `"DPoP"` (not `"Bearer"`)
- Access token contains `cnf` claim with key thumbprint:
  ```json
  {
    "cnf": {
      "jkt": "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I"
    }
  }
  ```

---

#### Step 5: Resource Request with DPoP

```http
GET /account/profile HTTP/1.1
Host: api.example.com
Authorization: DPoP eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9...
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6Ik...
```

**DPoP Proof includes `ath` claim:**
```json
{
  "jti": "unique-request-id-2",
  "htm": "GET",
  "htu": "https://api.example.com/account/profile",
  "iat": 1727606500,
  "ath": "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo"
}
```

`ath` = Base64url(SHA256(access_token))

---

### DPoP Validation

The server validates DPoP proofs:

1. **Signature Validation:**
   - Verify JWT signature using `jwk` in header
   - Algorithm must match `alg` claim

2. **Claim Validation:**
   - `typ` must be `"dpop+jwt"`
   - `htm` must match HTTP method
   - `htu` must match request URI (scheme + authority + path)
   - `iat` must be recent (within acceptable skew)

3. **Token Binding:**
   - Compute `jkt` = Base64url(SHA256(JWK))
   - Must match `cnf.jkt` in access token

4. **Replay Protection:**
   - `jti` must be unique
   - Store recent `jti` values (cache)

### Error Responses

**Invalid DPoP Proof:**
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: DPoP error="invalid_dpop_proof"
```

**Missing DPoP Proof:**
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: DPoP error="invalid_token", error_description="DPoP proof required"
```

---

## Security Requirements

### Token Security

#### Access Token
- **Format:** JWT with RS256 signature
- **Lifetime:** 1 minute (60 seconds)
- **Transmission:** HTTPS only, in Authorization header

#### Token Validation with JWKS

To verify access tokens, clients should use the public keys provided by the JWKS endpoint.

**Step 1: Fetch JWKS**

```javascript
// Fetch and cache the JWKS
async function getJWKS() {
  const response = await fetch('https://auth.example.com/auth/.well-known/jwks.json');
  const jwks = await response.json();
  return jwks;
}
```

**Step 2: Verify JWT Signature**

Using the `jose` library (recommended):

```javascript
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Create JWKS instance (cache this)
const JWKS = createRemoteJWKSet(
  new URL('https://auth.example.com/auth/.well-known/jwks.json')
);

// Verify token
async function verifyAccessToken(token) {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',  // Optional: validate issuer
    });
    
    // Token is valid
    return {
      valid: true,
      userId: payload.userId,
      clientId: payload.clientId,
      scope: payload.scope,
      exp: payload.exp
    };
  } catch (error) {
    // Token is invalid or expired
    return {
      valid: false,
      error: error.message
    };
  }
}
```

**Step 3: Validate Claims**

```javascript
async function validateToken(token) {
  // Verify signature and decode
  const result = await verifyAccessToken(token);
  
  if (!result.valid) {
    throw new Error('Invalid token: ' + result.error);
  }
  
  // Additional claim validation
  const now = Math.floor(Date.now() / 1000);
  
  // Check expiration
  if (result.exp < now) {
    throw new Error('Token expired');
  }
  
  // Check scope (recommended approach)
  const tokenScopes = result.scope.split(',').map(s => s.trim());
  
  // Check for required scope or admin (which grants everything)
  const hasRequiredScope = tokenScopes.includes('profile:read') || tokenScopes.includes('admin');
  
  if (!hasRequiredScope) {
    throw new Error('Insufficient scope: requires profile:read');
  }
  
  return result;
}
```

**Best Practices:**

1. **Cache JWKS**: Cache the JWKS response for at least 1 hour (check `Cache-Control` header)
2. **Key Rotation**: Support multiple keys in JWKS for seamless rotation
3. **Algorithm Validation**: Always specify `algorithms: ['RS256']` to prevent algorithm confusion attacks
4. **Clock Skew**: Allow 60-second clock skew for `exp` and `iat` validation
5. **Error Handling**: Distinguish between expired, invalid signature, and malformed tokens

**Manual Verification (without library):**

```javascript
import crypto from 'crypto';

async function manualVerifyToken(token) {
  // Split JWT into parts
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  
  // Decode header and payload
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  
  // Fetch JWKS and find matching key
  const jwks = await getJWKS();
  const key = jwks.keys.find(k => k.kid === header.kid);
  
  if (!key) {
    throw new Error('Key not found in JWKS');
  }
  
  // Convert JWK to PEM format (requires jwk-to-pem library)
  const publicKey = jwkToPem(key);
  
  // Verify signature
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(`${headerB64}.${payloadB64}`);
  
  const signature = Buffer.from(signatureB64, 'base64url');
  const isValid = verify.verify(publicKey, signature);
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }
  
  // Validate claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }
  
  return payload;
}
```

**Token Validation Response:**

```javascript
// Valid token
{
  "valid": true,
  "userId": "acc_12345",
  "clientId": "app_123",
  "scope": "profile email",
  "exp": 1727606460
}

// Invalid token
{
  "valid": false,
  "error": "signature verification failed"
}
```

#### Refresh Token
- **Format:** Cryptographically random string (256-bit)
- **Storage:** Database with SHA256 hash
- **Lifetime:** 30 days
- **Rotation:** Automatic on each use
- **Grace Period:** 60 seconds for network retries
- **Reuse Detection:** Entire chain revoked on reuse

---

### CSRF Protection

**State Parameter:**
- Required in authorization flow
- Minimum 128-bit entropy
- Single-use (bound to session)
- Verified on callback

**Implementation:**
```javascript
// Generate state
const state = base64url(randomBytes(32))
// Store in session/cookie
session.oauthState = state
// Include in authorization URL
const authUrl = `...&state=${state}`
// Verify on callback
if (callbackState !== session.oauthState) {
  throw new Error('Invalid state')
}
```

---

### Redirect URI Security

**Validation Rules:**
1. **Exact Match:** Must match registered URI
2. **No Wildcards:** Wildcards not supported
3. **HTTPS Only:** In production (HTTP allowed for localhost)
4. **No Fragments:** Fragment identifiers not allowed
5. **Validation Timing:** Before showing authorization UI

**Error Handling:**
- Invalid redirect_uri → Do not redirect (return 400)
- Other errors → Redirect with error parameter

---

### Password Requirements

**Minimum Requirements:**
- Length: 3 characters (update this for production)
- Storage: Hashed with bcrypt (cost factor 10)
- Transmission: HTTPS only
- Reset tokens: 15-minute expiration
- Verification tokens: 24-hour expiration

---


### Error Handling

**Error Response Format (OAuth2):**
```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameter: client_id",
  "error_uri": "https://docs.example.com/errors/invalid_request"
}
```

**Standard Error Codes:**
- `invalid_request` - Malformed request
- `invalid_client` - Invalid client credentials
- `invalid_grant` - Invalid/expired code or token
- `unauthorized_client` - Client not authorized
- `unsupported_grant_type` - Grant type not supported
- `invalid_scope` - Requested scope invalid
- `access_denied` - User denied authorization
- `server_error` - Internal server error

**Error Response Rules:**
- Never leak sensitive information
- Log detailed errors server-side
- Return generic errors to client
- Include `state` parameter in redirects

---

## Complete Flow Examples

### Example 1: Simple Web App Login

**Step 1 - User clicks "Login":**
```javascript
const authUrl = new URL('https://auth.example.com/auth/authorize')
authUrl.searchParams.set('client_id', 'webapp_123')
authUrl.searchParams.set('redirect_uri', 'https://myapp.com/callback')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', 'profile email')
authUrl.searchParams.set('state', generateState())

window.location.href = authUrl.toString()
```

**Step 2 - User authenticates and authorizes**

**Step 3 - Callback receives code:**
```javascript
// https://myapp.com/callback?code=auth_abc123&state=xyz789

// Validate state
if (params.state !== session.state) throw new Error('Invalid state')

// Exchange code for tokens
const response = await fetch('https://auth.example.com/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: 'https://myapp.com/callback'
  })
})

const tokens = await response.json()
// Store tokens securely
session.accessToken = tokens.access_token
session.refreshToken = tokens.refresh_token
```

**Step 4 - Use access token:**
```javascript
const userInfo = await fetch('https://auth.example.com/auth/userinfo', {
  headers: {
    'Authorization': `Bearer ${session.accessToken}`
  }
})
```

---

### Example 2: Mobile App with PKCE

**Step 1 - Generate PKCE values:**
```javascript
// Generate code verifier
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))

// Generate code challenge
const encoder = new TextEncoder()
const data = encoder.encode(verifier)
const hash = await crypto.subtle.digest('SHA-256', data)
const challenge = base64url(new Uint8Array(hash))

// Store verifier for later
storage.set('pkce_verifier', verifier)
```

**Step 2 - Authorization request:**
```javascript
const authUrl = new URL('https://auth.example.com/auth/authorize')
authUrl.searchParams.set('client_id', 'mobile_app_456')
authUrl.searchParams.set('redirect_uri', 'myapp://callback')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', 'profile email')
authUrl.searchParams.set('state', generateState())
authUrl.searchParams.set('code_challenge', challenge)
authUrl.searchParams.set('code_challenge_method', 'S256')

// Open browser
openBrowser(authUrl.toString())
```

**Step 3 - Token exchange with verifier:**
```javascript
// Deep link: myapp://callback?code=auth_abc123&state=xyz789

const response = await fetch('https://auth.example.com/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: 'myapp://callback',
    code_verifier: storage.get('pkce_verifier')
  })
})

const tokens = await response.json()
```

---

### Example 3: Token Refresh

**Automatic token refresh:**
```javascript
async function getValidAccessToken() {
  // Check if current token is expired
  const decodedToken = jwt.decode(session.accessToken)
  const expiresAt = decodedToken.exp * 1000
  const now = Date.now()
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt - now < 5 * 60 * 1000) {
    const response = await fetch('https://auth.example.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken
      })
    })
    
    if (!response.ok) {
      // Refresh token is invalid, need to re-authenticate
      redirectToLogin()
      return null
    }
    
    const tokens = await response.json()
    session.accessToken = tokens.access_token
    session.refreshToken = tokens.refresh_token
  }
  
  return session.accessToken
}

// Use in API calls
async function apiRequest(url) {
  const token = await getValidAccessToken()
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}
```

---

## Additional Resources

### RFCs and Standards

- [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) - OAuth 2.0 Authorization Framework
- [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) - OAuth 2.0 Bearer Token Usage
- [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) - Proof Key for Code Exchange (PKCE)
- [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662) - Token Introspection
- [RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449) - OAuth 2.0 Demonstrating Proof-of-Possession (DPoP)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)

### Security Best Practices

- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)

---

## Support

For implementation questions or issues:
- Review the Swagger documentation at `/docs`
- OpenAPI available at /docs/json

---

---

**Last Updated:** October 1, 2025  
**Version:** 2.0.0 - With Scope-Based Authorization  
