import React, { createContext, useContext, useEffect, useState, useRef } from 'react'

import { BasicSync, initDexieExtensions } from './sync'
import { RemoteDB, DBMode, BasicDB } from './core/db'
import { AuthManager } from './core/auth/AuthManager'
import type { Token, User, AuthResult, GetTokenOptions, PdsEndpoints } from './core/auth/AuthManager'

import { log } from './config'
import { version as currentVersion } from '../package.json'
import { createVersionUpdater } from './updater/versionUpdater'
import { getMigrations } from './updater/updateMigrations'
import { BasicStorage, LocalStorageAdapter, STORAGE_KEYS } from './utils/storage'
import { isDevelopment, checkForNewVersion, getSyncStatus } from './utils/network'
import { validateAndCheckSchema } from './utils/schema'

export type { BasicStorage, LocalStorageAdapter } from './utils/storage'
export type { DBMode, BasicDB, Collection } from './core/db'
export type { Token, User, AuthResult, GetTokenOptions, PdsEndpoints }

export type AuthConfig = {
    scopes?: string | string[];
    /** @deprecated Use pds_url instead */
    server_url?: string;
    /** PDS URL for auth and data (default: https://pds.basic.id) */
    pds_url?: string;
    /** Admin server URL for connect reporting (default: https://api.basic.tech) */
    admin_url?: string;
    ws_url?: string;
}

export type BasicProviderProps = {
    children: React.ReactNode;
    /** 
     * @deprecated Project ID is now extracted from schema.project_id. 
     * This prop is kept for backward compatibility but can be omitted.
     */
    project_id?: string;
    /** The Basic schema object containing project_id and table definitions */
    schema?: any;
    debug?: boolean;
    storage?: BasicStorage;
    auth?: AuthConfig;
    /**
     * Database mode - determines which implementation is used
     * - 'sync': Uses Dexie + WebSocket for local-first sync (default)
     * - 'remote': Uses REST API calls directly to server
     */
    dbMode?: DBMode;
}

const DEFAULT_AUTH_CONFIG = {
    scopes: 'profile,email,app:admin',
    pds_url: 'https://pds.basic.id',
    admin_url: 'https://api.basic.tech',
    ws_url: 'wss://pds.basic.id/ws'
} as const


export enum DBStatus {
    LOADING = "LOADING",
    OFFLINE = "OFFLINE",
    CONNECTING = "CONNECTING",
    ONLINE = "ONLINE",
    SYNCING = "SYNCING",
    ERROR = "ERROR",
    /** Sync reported an error but will retry (e.g. expired token). Used for status code 4 from dexie-syncable. */
    ERROR_WILL_RETRY = "ERROR_WILL_RETRY",
    /** Token expired; the SDK is refreshing and will reconnect automatically. */
    ERROR_TOKEN_EXPIRED = "ERROR_TOKEN_EXPIRED"
}

/**
 * Context type for useBasic hook
 */
export type BasicContextType = {
    // Auth state
    isReady: boolean;
    isSignedIn: boolean;
    user: User | null;
    /** The user's DID (Decentralized Identifier), extracted from the access token `sub` claim */
    did: string | null;
    /** Space-separated scope string from the access token */
    scope: string | null;
    /** Check if a specific scope is granted (e.g., hasScope('profile')) */
    hasScope: (scope: string) => boolean;
    /** Returns scopes that were requested but not granted in the current token */
    missingScopes: () => string[];

    // Auth actions (new camelCase naming)
    signIn: () => Promise<void>;
    signInWithHandle: (handle: string) => Promise<void>;
    signOut: () => Promise<void>;
    signInWithCode: (code: string, state?: string) => Promise<AuthResult>;

    // Token management
    getToken: (options?: GetTokenOptions) => Promise<string>;
    getSignInUrl: (redirectUri?: string) => Promise<string>;

    // DB access
    db: BasicDB;
    dbStatus: DBStatus;
    dbMode: DBMode;

    // Legacy aliases (deprecated - will be removed in future version)
    /** @deprecated Use isReady instead */
    isAuthReady: boolean;
    /** @deprecated Use signIn instead */
    signin: () => Promise<void>;
    /** @deprecated Use signOut instead */
    signout: () => Promise<void>;
    /** @deprecated Use signInWithCode instead */
    signinWithCode: (code: string, state?: string) => Promise<AuthResult>;
    /** @deprecated Use getSignInUrl instead */
    getSignInLink: (redirectUri?: string) => Promise<string>;
}

const noDb: BasicDB = {
    collection: () => {
        throw new Error('no basicdb found - initialization failed. double check your schema.')
    }
}

export const BasicContext = createContext<BasicContextType>({
    // Auth state
    isReady: false,
    isSignedIn: false,
    user: null,
    did: null,
    scope: null,
    hasScope: () => false,
    missingScopes: () => [],

    // Auth actions
    signIn: () => Promise.resolve(),
    signInWithHandle: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    signInWithCode: () => Promise.resolve({ success: false }),

    // Token management
    getToken: (_options?: GetTokenOptions) => Promise.reject(new Error('no token')),
    getSignInUrl: () => Promise.resolve(""),

    // DB access
    db: noDb,
    dbStatus: DBStatus.LOADING,
    dbMode: 'sync',

    // Legacy aliases
    isAuthReady: false,
    signin: () => Promise.resolve(),
    signout: () => Promise.resolve(),
    signinWithCode: () => Promise.resolve({ success: false }),
    getSignInLink: () => Promise.resolve("")
});

type ErrorObject = {
    code: string;
    title: string;
    message: string;
}

// Tracks the subset of AuthManager state that React effects depend on.
type AuthSnapshot = {
    isSignedIn: boolean
    hasToken: boolean
    isAuthReady: boolean
    user: User | null
    did: string | null
    tokenScope: string | null
}

function snapshotAuth(mgr: AuthManager): AuthSnapshot {
    return {
        isSignedIn: mgr.isSignedIn,
        hasToken: !!mgr.token,
        isAuthReady: mgr.isAuthReady,
        user: mgr.user,
        did: mgr.did,
        tokenScope: mgr.tokenScope,
    }
}

export function BasicProvider({
    children,
    project_id: project_id_prop,
    schema,
    debug = false,
    storage,
    auth,
    dbMode = 'sync'
}: BasicProviderProps) {
    const project_id = schema?.project_id || project_id_prop

    // Merge auth config with defaults (server_url is deprecated in favor of pds_url)
    if (auth?.server_url && !auth?.pds_url) {
        log('Warning: auth.server_url is deprecated, use auth.pds_url instead')
    }
    const authConfig = {
        scopes: auth?.scopes || DEFAULT_AUTH_CONFIG.scopes,
        pds_url: auth?.pds_url || auth?.server_url || DEFAULT_AUTH_CONFIG.pds_url,
        admin_url: auth?.admin_url || DEFAULT_AUTH_CONFIG.admin_url,
        ws_url: auth?.ws_url || DEFAULT_AUTH_CONFIG.ws_url
    }

    const scopesString = Array.isArray(authConfig.scopes)
        ? authConfig.scopes.join(' ')
        : authConfig.scopes

    const storageRef = useRef<BasicStorage>(storage || new LocalStorageAdapter())
    const storageAdapter = storageRef.current

    // --- AuthManager (stable instance held in a ref) ---
    const [authState, setAuthState] = useState<AuthSnapshot>({
        isSignedIn: false,
        hasToken: false,
        isAuthReady: false,
        user: null,
        did: null,
        tokenScope: null,
    })

    const authRef = useRef<AuthManager>(null!)
    if (!authRef.current) {
        authRef.current = new AuthManager(
            {
                projectId: project_id,
                scopes: scopesString,
                pdsUrl: authConfig.pds_url,
                adminUrl: authConfig.admin_url,
                debug,
            },
            storageAdapter,
            () => setAuthState(snapshotAuth(authRef.current)),
        )
    }

    // --- DB state (stays in React) ---
    const syncRef = useRef<BasicSync | null>(null)
    const remoteDbRef = useRef<RemoteDB | null>(null)
    const [shouldConnect, setShouldConnect] = useState(false)
    const [dbStatus, setDbStatus] = useState<DBStatus>(DBStatus.OFFLINE)
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<ErrorObject | null>(null)

    const isDevMode = () => isDevelopment(debug)

    // --- Mount: version updater + auth init + DB init ---
    useEffect(() => {
        // Version updater (SDK migration, not auth-related)
        const runVersionUpdater = async () => {
            try {
                const versionUpdater = createVersionUpdater(storageAdapter, currentVersion, getMigrations())
                const updateResult = await versionUpdater.checkAndUpdate()

                if (updateResult.updated) {
                    log(`App updated from ${updateResult.fromVersion} to ${updateResult.toVersion}`)
                } else {
                    log(`App version ${updateResult.toVersion} is current`)
                }
            } catch (error) {
                log('Version update failed:', error)
            }
        }

        runVersionUpdater()
        authRef.current.initialize()

        return authRef.current.setupNetworkListeners()
    }, [])

    // --- DB init (separate mount effect) ---
    useEffect(() => {
        async function initSyncDb(options: { shouldConnect: boolean }) {
            if (!syncRef.current) {
                log('Initializing Basic Sync DB')

                await initDexieExtensions()

                syncRef.current = new BasicSync('basicdb', { schema: schema });

                syncRef.current.syncable.on('statusChanged', (status: number) => {
                    const newStatus = getSyncStatus(status) as DBStatus
                    setDbStatus(newStatus)

                    if (newStatus === DBStatus.ERROR_WILL_RETRY) {
                        log('Sync entered ERROR_WILL_RETRY - proactively refreshing token')
                        authRef.current.getToken({ forceRefresh: true }).catch(() => {})
                    }
                })

                if (options.shouldConnect) {
                    setShouldConnect(true)
                } else {
                    log('Sync is disabled')
                }

                setIsReady(true)
            }
        }

        function initRemoteDb() {
            if (!remoteDbRef.current) {
                if (!project_id) {
                    setError({
                        code: 'missing_project_id',
                        title: 'Project ID Required',
                        message: 'Remote mode requires a project_id. Provide it via schema.project_id or the project_id prop.'
                    })
                    setIsReady(true)
                    return
                }

                log('Initializing Basic Remote DB')
                remoteDbRef.current = new RemoteDB({
                    serverUrl: authConfig.pds_url,
                    projectId: project_id,
                    getToken: (opts) => authRef.current.getToken(opts),
                    schema: schema,
                    debug: debug,
                    onAuthError: (error) => {
                        log('RemoteDB auth error:', error)
                        handleSignOut()
                    }
                })
                setDbStatus(DBStatus.ONLINE)
                setIsReady(true)
            }
        }

        async function checkSchema() {
            const result = await validateAndCheckSchema(schema)

            if (!result.isValid) {
                let errorMessage = ''
                if (result.errors) {
                    result.errors.forEach((error: any, index: number) => {
                        errorMessage += `${index + 1}: ${error.message} - at ${error.instancePath}\n`
                    })
                }
                setError({
                    code: 'schema_invalid',
                    title: 'Basic Schema is invalid!',
                    message: errorMessage
                })
                setIsReady(true)
                return null
            }

            if (dbMode === 'remote') {
                initRemoteDb()
            } else {
                if (result.schemaStatus.valid) {
                    await initSyncDb({ shouldConnect: true })
                } else {
                    if (result.schemaStatus.status === 'unpublished') {
                        log('Schema not published yet (version 0) - sync is disabled. Publish your schema to enable sync.')
                    } else {
                        log('Schema is invalid!', result.schemaStatus)
                    }
                    await initSyncDb({ shouldConnect: false })
                }
            }

            checkForNewVersion()
        }

        if (schema) {
            checkSchema()
        } else {
            if (dbMode === 'remote' && project_id) {
                initRemoteDb()
            } else {
                setIsReady(true)
            }
        }
    }, []);

    // --- Connect sync DB when auth is ready ---
    useEffect(() => {
        if (authState.hasToken && syncRef.current && authState.isSignedIn && shouldConnect) {
            log('connecting to db...')

            syncRef.current?.connect({
                getToken: (opts?: GetTokenOptions) => authRef.current.getToken(opts),
                ws_url: authConfig.ws_url
            })
                .catch((e: any) => {
                    log('error connecting to db', e)
                })
        }
    }, [authState.isSignedIn, authState.hasToken, shouldConnect])

    // --- Sign out (auth cleanup + sync teardown) ---
    const handleSignOut = async () => {
        await authRef.current.signOut()
        if (syncRef.current) {
            try {
                await syncRef.current.close()
                await syncRef.current.delete({ disableAutoOpen: false })
                syncRef.current = null
                window?.location?.reload()
            } catch (error) {
                console.error('Error during database cleanup:', error)
            }
        }
    }

    // --- Sign in wrappers (add dev-mode error display) ---
    const handleSignIn = async () => {
        try {
            await authRef.current.signIn()
        } catch (error) {
            if (isDevMode()) {
                setError({
                    code: 'signin_error',
                    title: 'Sign-in Failed',
                    message: (error as Error).message || 'An error occurred during sign-in. Please try again.'
                })
            }
            throw error
        }
    }

    const handleSignInWithHandle = async (handle: string) => {
        try {
            await authRef.current.signInWithHandle(handle)
        } catch (error) {
            if (isDevMode()) {
                setError({
                    code: 'signin_error',
                    title: 'Sign-in Failed',
                    message: (error as Error).message || 'An error occurred during sign-in. Please try again.'
                })
            }
            throw error
        }
    }

    // --- DB accessor ---
    const getCurrentDb = (): BasicDB => {
        if (dbMode === 'remote') {
            return remoteDbRef.current || noDb
        }
        return syncRef.current || noDb
    }

    // --- Context value ---
    const contextValue: BasicContextType = {
        // Auth state
        isReady: authState.isAuthReady,
        isSignedIn: authState.isSignedIn,
        user: authState.user,
        did: authState.did,
        scope: authState.tokenScope,
        hasScope: (scope: string) => authRef.current.hasScope(scope),
        missingScopes: () => authRef.current.missingScopes(),

        // Auth actions
        signIn: handleSignIn,
        signInWithHandle: handleSignInWithHandle,
        signOut: handleSignOut,
        signInWithCode: (code: string, state?: string) => authRef.current.signInWithCode(code, state),

        // Token management
        getToken: (opts?: GetTokenOptions) => authRef.current.getToken(opts),
        getSignInUrl: (redirectUri?: string) => authRef.current.getSignInUrl(redirectUri),

        // DB access
        db: getCurrentDb(),
        dbStatus,
        dbMode,

        // Legacy aliases (deprecated)
        isAuthReady: authState.isAuthReady,
        signin: handleSignIn,
        signout: handleSignOut,
        signinWithCode: (code: string, state?: string) => authRef.current.signInWithCode(code, state),
        getSignInLink: (redirectUri?: string) => authRef.current.getSignInUrl(redirectUri),
    }

    return (
        <BasicContext.Provider value={contextValue}>
            {error && isDevMode() && <ErrorDisplay error={error} />}
            {isReady && children}
        </BasicContext.Provider>
    )
}

function ErrorDisplay({ error }: { error: ErrorObject }) {
    return <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'black',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        padding: '20px',
        maxWidth: '400px',
        margin: '20px auto',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        fontFamily: 'monospace',
    }}>
        <h3 style={{ fontSize: '0.8rem', opacity: 0.8 }}>code: {error.code}</h3>
        <h1 style={{ fontSize: '1.2rem', lineHeight: '1.5' }}>{error.title}</h1>
        <p>{error.message}</p>
    </div>
}


export function useBasic() {
    return useContext(BasicContext);
}
