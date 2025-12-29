// @basictech/nextjs - Next.js integration for Basic SDK
//
// Usage:
// - Server components/middleware: import from "@basictech/nextjs"
// - Client components: import from "@basictech/nextjs/client"
//
// Example:
//   // In a client component (providers.tsx)
//   'use client'
//   import { BasicProvider, useBasic } from "@basictech/nextjs/client"
//
//   // In middleware.ts
//   import { createBasicMiddleware } from "@basictech/nextjs"

// Re-export types from react package (types are safe for SSR)
export type {
    AuthConfig,
    BasicStorage,
    LocalStorageAdapter,
    BasicProviderProps,
    BasicContextType,
    AuthResult,
    DBMode,
    BasicDB,
    Collection,
    RemoteDBConfig,
    AuthError
} from "@basictech/react"

// Middleware exports (server-side safe - no dexie dependency)
export { 
    createBasicMiddleware, 
    withBasicAuth,
    getAuthFromRequest,
    getReturnUrl
} from "./middleware"

export type { BasicMiddlewareConfig } from "./middleware"
