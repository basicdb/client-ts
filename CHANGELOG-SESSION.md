# Session Changelog - Next.js SSR Fix & Feature Parity

**Date**: December 28, 2025

## Summary

This session focused on fixing SSR compatibility issues with the Next.js package and achieving feature parity between the React and Next.js SDKs.

---

## Issues Fixed

### 1. SSR Error: `self is not defined`

**Problem**: `dexie-observable` uses the browser global `self`, which doesn't exist in Node.js/SSR environments. This caused Next.js apps to crash with:

```
ReferenceError: self is not defined
    at module evaluation (dexie-observable/src/Dexie.Observable.js:36:14)
```

**Solution**: Changed from top-level imports to dynamic imports in `packages/react/src/sync/index.ts`:

```typescript
// Before (crashes on SSR):
import 'dexie-syncable';
import 'dexie-observable';
syncProtocol()

// After (SSR-safe):
export async function initDexieExtensions(): Promise<void> {
  if (typeof window === 'undefined') return;
  await import('dexie-syncable');
  await import('dexie-observable');
  const { syncProtocol } = await import('./syncProtocol');
  syncProtocol();
}
```

**Files Changed**:
- `packages/react/src/sync/index.ts` - Added `initDexieExtensions()` async function
- `packages/react/src/AuthContext.tsx` - Call `initDexieExtensions()` before creating `BasicSync`

---

### 2. Remote DB Errors When Signed Out

**Problem**: When using remote mode without being signed in, the SDK threw errors:

```
foo.getAll() error: Error: no token found
```

**Solution**: Graceful degradation for unauthenticated requests:

| Operation | Behavior When Not Authenticated |
|-----------|--------------------------------|
| `getAll()` | Returns `[]` |
| `get(id)` | Returns `null` |
| `filter()` | Returns `[]` |
| `add()` | Throws `NotAuthenticatedError` |
| `put()` | Throws `NotAuthenticatedError` |
| `update()` | Throws `NotAuthenticatedError` |
| `delete()` | Throws `NotAuthenticatedError` |

**Files Changed**:
- `packages/react/src/core/db/RemoteCollection.ts` - Added `NotAuthenticatedError` class and graceful handling

---

## Features Added

### 1. Next.js Example App - Feature Parity

Updated `apps/nextjs` to match `apps/react-vite`:

- ✅ Same `basic.config.ts` (project_id, foo table schema)
- ✅ Database mode toggle (Sync/Remote)
- ✅ Full testing UI (add, update, delete, query)
- ✅ Auth status display
- ✅ Local storage viewer
- ✅ Access token decoder

**Files Changed**:
- `apps/nextjs/basic.config.ts` - Aligned with react-vite config
- `apps/nextjs/src/app/components.tsx` - Full testing dashboard
- `apps/nextjs/src/app/providers.tsx` - Client-side BasicProvider with dbMode from URL
- `apps/nextjs/src/app/globals.css` - Dark theme styling

### 2. Client Subpath Export

Added `@basictech/nextjs/client` subpath export for cleaner imports (works in production builds):

```typescript
// Production usage:
import { useBasic, BasicProvider } from "@basictech/nextjs/client"
```

**Files Changed**:
- `packages/nextjs/src/client.ts` - New client-only exports
- `packages/nextjs/package.json` - Added exports field
- `packages/nextjs/tsup.config.ts` - Multi-entry build

---

## Package Updates

### Dexie Libraries

| Package | Old Version | New Version |
|---------|------------|-------------|
| `dexie` | 4.0.8 | 4.2.1 |
| `dexie-react-hooks` | 1.1.7 | 4.2.0 |

### Next.js Peer Dependency

Updated to support Next.js 14, 15, and 16:

```json
"next": "^14.0.0 || ^15.0.0 || ^16.0.0"
```

---

## New Exports

### From `@basictech/react`

```typescript
export { NotAuthenticatedError } from "./core/db"
```

### From `@basictech/nextjs`

Server-safe exports:
```typescript
export { createBasicMiddleware, withBasicAuth, getAuthFromRequest, getReturnUrl }
export type { BasicMiddlewareConfig }
```

Client exports (via `/client` subpath or `@basictech/react`):
```typescript
export { useBasic, BasicProvider, useQuery, RemoteDB, RemoteCollection, RemoteDBError, NotAuthenticatedError, STORAGE_KEYS }
```

---

## Usage Pattern for Next.js

### Installation

```bash
npm install @basictech/nextjs
# @basictech/react is installed automatically as a dependency
```

### Import Pattern

```typescript
// middleware.ts (server)
import { createBasicMiddleware } from "@basictech/nextjs"

// providers.tsx (client component)
'use client'
import { BasicProvider } from "@basictech/react"

// components.tsx (client component)
'use client'
import { useBasic, useQuery } from "@basictech/react"
```

### Provider Setup

```tsx
// app/providers.tsx
'use client'
import { BasicProvider } from "@basictech/react"
import { schema } from "../basic.config"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BasicProvider schema={schema} debug>
      {children}
    </BasicProvider>
  )
}

// app/layout.tsx
import { Providers } from "./providers"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

---

## Known Limitations

1. **Subpath Exports in Dev Mode**: The `@basictech/nextjs/client` subpath doesn't work with Turbopack in development due to monorepo resolution issues. Use `@basictech/react` directly in dev.

2. **Sync/Remote ID Generation**: Sync mode generates IDs client-side (uuidv7), while remote mode expects server-generated IDs. This may cause issues if switching modes with existing data.

---

## Files Modified (Summary)

### Packages

| File | Changes |
|------|---------|
| `packages/react/src/sync/index.ts` | Dynamic dexie imports |
| `packages/react/src/AuthContext.tsx` | Async dexie init |
| `packages/react/src/core/db/RemoteCollection.ts` | Graceful auth handling |
| `packages/react/src/core/db/index.ts` | Export NotAuthenticatedError |
| `packages/react/src/index.ts` | Export NotAuthenticatedError |
| `packages/react/package.json` | Updated dexie versions |
| `packages/nextjs/src/index.ts` | Server-safe exports |
| `packages/nextjs/src/client.ts` | Client exports (new) |
| `packages/nextjs/package.json` | Exports field, peer deps |
| `packages/nextjs/tsup.config.ts` | Multi-entry build |

### Example Apps

| File | Changes |
|------|---------|
| `apps/nextjs/basic.config.ts` | Aligned with react-vite |
| `apps/nextjs/src/app/components.tsx` | Full testing UI |
| `apps/nextjs/src/app/providers.tsx` | dbMode from URL |
| `apps/nextjs/src/app/globals.css` | Dark theme |
| `apps/nextjs/package.json` | Removed explicit @basictech/react dep |

---

## Documentation Updates

All package READMEs were rewritten to be comprehensive, simple, and well-organized:

### `packages/react/README.md`
- Quick start guide with schema, provider, and hook examples
- Complete API reference for `BasicProvider`, `useBasic`, `useQuery`
- Database methods table with examples
- TypeScript generics documentation
- Advanced usage: OAuth, remote mode, error handling

### `packages/nextjs/readme.md`
- Quick start with Next.js App Router
- **Important:** Import pattern explanation (client vs server)
- Middleware setup and configuration
- Database modes (sync vs remote)
- Full example with file structure
- Troubleshooting section (SSR errors, hydration)

### `README.md` (monorepo root)
- Package overview table
- Quick start for both React and Next.js
- Development setup instructions
- Project structure

---

## Next Steps (Suggested)

1. **Testing** - End-to-end testing of sync and remote modes
2. **Middleware** - Verify middleware functionality works correctly
3. **ID Generation** - Address sync/remote ID inconsistency
4. **Release** - Version bump and publish
