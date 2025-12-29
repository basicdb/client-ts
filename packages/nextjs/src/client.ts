'use client'

// @basictech/nextjs/client - Client-side exports for Next.js
// Use this in client components (files with 'use client' directive)

// Re-export everything from @basictech/react for client-side use
export {
  useBasic,
  BasicProvider,
  useQuery,
  RemoteDB,
  RemoteCollection,
  RemoteDBError,
  NotAuthenticatedError,
  STORAGE_KEYS
} from "@basictech/react"

// Re-export types (DBMode is also a type)
export type {
  AuthConfig,
  BasicStorage,
  LocalStorageAdapter,
  BasicProviderProps,
  BasicContextType,
  AuthResult,
  BasicDB,
  Collection,
  RemoteDBConfig,
  AuthError
} from "@basictech/react"

// DBMode is a type-only export
export type { DBMode } from "@basictech/react"
