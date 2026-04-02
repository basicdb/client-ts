import { createContext, useContext } from 'react'
import type { BasicDB } from './core/db'
import type {
    User,
    AuthResult,
    GetTokenOptions,
    AuthStatus,
} from './core/auth/AuthManager'
import type { DBMode } from './core/db'

export enum DBStatus {
    LOADING = 'LOADING',
    OFFLINE = 'OFFLINE',
    CONNECTING = 'CONNECTING',
    ONLINE = 'ONLINE',
    SYNCING = 'SYNCING',
    ERROR = 'ERROR',
    /** Sync-layer error with automatic retry (maps from dexie-syncable status 4). */
    ERROR_WILL_RETRY = 'ERROR_WILL_RETRY',
    /**
     * Auth-driven status: set by the provider when `authStatus` transitions to
     * `reauth_required`, causing sync to disconnect. Unlike the other statuses
     * this is NOT mapped from a dexie-syncable status code — it is set
     * programmatically by `BasicProvider` to signal that the token is
     * definitively invalid and the user must re-authenticate before sync can
     * resume.
     */
    ERROR_TOKEN_EXPIRED = 'ERROR_TOKEN_EXPIRED',
}

/** Snapshot of local schema vs server (for dev toolbar and debugging). */
export type BasicSchemaDevInfo = {
    projectId: string | null
    localVersion: number | undefined
    status: string
    valid: boolean
    lastCheckedAt: number
    error?: string
}

/**
 * Context type for useBasic hook
 */
export type BasicContextType = {
    isReady: boolean
    isSignedIn: boolean
    authStatus: AuthStatus
    authErrorCode: string | null
    user: User | null
    did: string | null
    scope: string | null
    hasScope: (scope: string) => boolean
    missingScopes: () => string[]

    signIn: () => Promise<void>
    signInWithHandle: (handle: string) => Promise<void>
    signOut: () => Promise<void>
    signInWithCode: (code: string, state?: string) => Promise<AuthResult>

    getToken: (options?: GetTokenOptions) => Promise<string>
    getSignInUrl: (redirectUri?: string) => Promise<string>

    db: BasicDB
    dbStatus: DBStatus
    dbMode: DBMode

    /** Local schema vs server status; null if no schema on the provider. */
    devInfo: BasicSchemaDevInfo | null
    /** Re-run remote schema check (dev toolbar). */
    refreshSchemaStatus: () => Promise<void>

    isAuthReady: boolean
    signin: () => Promise<void>
    signout: () => Promise<void>
    signinWithCode: (code: string, state?: string) => Promise<AuthResult>
    getSignInLink: (redirectUri?: string) => Promise<string>
}

const noDb: BasicDB = {
    collection: () => {
        throw new Error('no basicdb found - initialization failed. double check your schema.')
    },
}

export const BasicContext = createContext<BasicContextType>({
    isReady: false,
    isSignedIn: false,
    authStatus: 'bootstrapping',
    authErrorCode: null,
    user: null,
    did: null,
    scope: null,
    hasScope: () => false,
    missingScopes: () => [],

    signIn: () => Promise.resolve(),
    signInWithHandle: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    signInWithCode: () => Promise.resolve({ success: false }),

    getToken: (_options?: GetTokenOptions) => Promise.reject(new Error('no token')),
    getSignInUrl: () => Promise.resolve(''),

    db: noDb,
    dbStatus: DBStatus.LOADING,
    dbMode: 'sync',

    devInfo: null,
    refreshSchemaStatus: async () => {},

    isAuthReady: false,
    signin: () => Promise.resolve(),
    signout: () => Promise.resolve(),
    signinWithCode: () => Promise.resolve({ success: false }),
    getSignInLink: () => Promise.resolve(''),
})

export function useBasic() {
    return useContext(BasicContext)
}

export { noDb }
