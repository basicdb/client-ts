import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { jwtDecode } from 'jwt-decode'

import { BasicSync, initDexieExtensions } from './sync'
import { RemoteDB, DBMode, BasicDB } from './core/db'

import { log } from './config'
import { version as currentVersion } from '../package.json'
import { createVersionUpdater } from './updater/versionUpdater'
import { getMigrations } from './updater/updateMigrations'
import { BasicStorage, LocalStorageAdapter, STORAGE_KEYS } from './utils/storage'
import { isDevelopment, checkForNewVersion, cleanOAuthParamsFromUrl, getSyncStatus } from './utils/network'
import { validateAndCheckSchema } from './utils/schema'
import { normalizeClientId } from './utils/normalizeClientId'
import { resolveHandle } from './utils/resolveDid'

export type { BasicStorage, LocalStorageAdapter } from './utils/storage'
export type { DBMode, BasicDB, Collection } from './core/db'

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


enum DBStatus {
    LOADING = "LOADING",
    OFFLINE = "OFFLINE",
    CONNECTING = "CONNECTING",
    ONLINE = "ONLINE",
    SYNCING = "SYNCING",
    ERROR = "ERROR"
}

type User = {
    sub?: string,
    name?: string,
    email?: string,
    picture?: string,
}
type Token = {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
}

/**
 * Auth result type for signInWithCode
 */
export type AuthResult = {
    success: boolean;
    error?: string;
    code?: string;
}

type PdsEndpoints = {
    pds_url: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
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

    // Auth actions (new camelCase naming)
    signIn: () => Promise<void>;
    signInWithHandle: (handle: string) => Promise<void>;
    signOut: () => Promise<void>;
    signInWithCode: (code: string, state?: string) => Promise<AuthResult>;

    // Token management
    getToken: () => Promise<string>;
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

    // Auth actions
    signIn: () => Promise.resolve(),
    signInWithHandle: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    signInWithCode: () => Promise.resolve({ success: false }),

    // Token management
    getToken: () => Promise.reject(new Error('no token')),
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

export function BasicProvider({
    children,
    project_id: project_id_prop,
    schema,
    debug = false,
    storage,
    auth,
    dbMode = 'sync'
}: BasicProviderProps) {
    // Extract project_id from schema, fall back to prop for backward compatibility
    const project_id = schema?.project_id || project_id_prop
    
    const [isAuthReady, setIsAuthReady] = useState(false)
    const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
    const [token, setToken] = useState<Token | null>(null)
    const [user, setUser] = useState<User>({})
    const [did, setDid] = useState<string | null>(null)
    const [tokenScope, setTokenScope] = useState<string | null>(null)
    const [shouldConnect, setShouldConnect] = useState<boolean>(false)
    const [isReady, setIsReady] = useState<boolean>(false)

    const [dbStatus, setDbStatus] = useState<DBStatus>(DBStatus.OFFLINE)
    const [error, setError] = useState<ErrorObject | null>(null)
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
    const [pendingRefresh, setPendingRefresh] = useState<boolean>(false)

    const syncRef = useRef<BasicSync | null>(null);
    const remoteDbRef = useRef<RemoteDB | null>(null);
    const storageAdapter = storage || new LocalStorageAdapter();
    
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
    const adminHostname = (() => {
        try { return new URL(authConfig.admin_url).hostname }
        catch { return 'api.basic.tech' }
    })()

    // Normalize scopes to space-separated string
    const scopesString = Array.isArray(authConfig.scopes) 
        ? authConfig.scopes.join(' ') 
        : authConfig.scopes;

    // Token refresh mutex to prevent concurrent refreshes
    const refreshPromiseRef = useRef<Promise<Token | null> | null>(null);

    const isDevMode = () => isDevelopment(debug)

    const cleanOAuthParams = () => cleanOAuthParamsFromUrl()

    function defaultPdsEndpoints(): PdsEndpoints {
        return {
            pds_url: authConfig.pds_url,
            authorization_endpoint: `${authConfig.pds_url}/auth/authorize`,
            token_endpoint: `${authConfig.pds_url}/auth/token`,
            userinfo_endpoint: `${authConfig.pds_url}/auth/userinfo`
        }
    }

    async function getActivePdsEndpoints(): Promise<PdsEndpoints> {
        const stored = await storageAdapter.get(STORAGE_KEYS.PDS_ENDPOINTS)
        if (stored) {
            try { return JSON.parse(stored) as PdsEndpoints } catch { /* fall through */ }
        }
        return defaultPdsEndpoints()
    }

    async function reportConnection(accessToken: string) {
        if (!project_id || !authConfig.admin_url) return
        const lastReport = await storageAdapter.get(STORAGE_KEYS.LAST_CONNECT_REPORT)
        if (lastReport) {
            const elapsed = Date.now() - parseInt(lastReport, 10)
            if (elapsed < 24 * 60 * 60 * 1000) return
        }
        try {
            await fetch(`${authConfig.admin_url}/project/${project_id}/user/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: accessToken })
            })
            await storageAdapter.set(STORAGE_KEYS.LAST_CONNECT_REPORT, Date.now().toString())
            log('Reported connection to admin server')
        } catch (err) {
            log('Failed to report connection (non-blocking):', err)
        }
    }

    useEffect(() => {
        const handleOnline = async () => {
            log('Network came back online')
            setIsOnline(true)
            if (pendingRefresh) {
                log('Retrying pending token refresh')
                setPendingRefresh(false)
                if (token) {
                    const refreshToken = token.refresh_token || await storageAdapter.get(STORAGE_KEYS.REFRESH_TOKEN)
                    if (refreshToken) {
                        fetchToken(refreshToken, true).catch(error => {
                            log('Retry refresh failed:', error)
                        })
                    }
                }
            }
        }

        const handleOffline = () => {
            log('Network went offline')
            setIsOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [pendingRefresh, token])

    useEffect(() => {
        async function initSyncDb(options: { shouldConnect: boolean }) {
            if (!syncRef.current) {
                log('Initializing Basic Sync DB')
                
                // Initialize Dexie extensions before creating BasicSync
                await initDexieExtensions()
                
                syncRef.current = new BasicSync('basicdb', { schema: schema });

                syncRef.current.syncable.on('statusChanged', (status: number) => {
                    setDbStatus(getSyncStatus(status) as DBStatus)
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
                    getToken: getToken,
                    schema: schema,
                    debug: debug,
                    onAuthError: (error) => {
                        log('RemoteDB auth error:', error)
                        // Sign out user when authentication fails after retry
                        signout()
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
                    result.errors.forEach((error, index) => {
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

            // Initialize the appropriate DB based on mode
            if (dbMode === 'remote') {
                initRemoteDb()
            } else {
                // Sync mode
                if (result.schemaStatus.valid) {
                    await initSyncDb({ shouldConnect: true })
                } else {
                    log('Schema is invalid!', result.schemaStatus)
                    await initSyncDb({ shouldConnect: false })
                }
            }

            checkForNewVersion()
        }

        if (schema) {
            checkSchema()
        } else {
            // No schema - still initialize remote DB if in remote mode
            if (dbMode === 'remote' && project_id) {
                initRemoteDb()
            } else {
                setIsReady(true)
            }
        }
    }, []);

    useEffect(() => {
        async function connectToDb() {
            if (token && syncRef.current && isSignedIn && shouldConnect) {
                const tok = await getToken()
                if (!tok) {
                    log('no token found')
                    return
                }

                log('connecting to db...')

                syncRef.current?.connect({ 
                    access_token: tok,
                    ws_url: authConfig.ws_url 
                })
                    .catch((e) => {
                        log('error connecting to db', e)
                    })
            }
        }
        connectToDb()

    }, [isSignedIn, shouldConnect])

    useEffect(() => {
        const initializeAuth = async () => {
            await storageAdapter.set(STORAGE_KEYS.DEBUG, debug ? 'true' : 'false')

            // Check if PDS URL has changed - if so, clear tokens
            const storedServerUrl = await storageAdapter.get(STORAGE_KEYS.SERVER_URL)
            if (storedServerUrl && storedServerUrl !== authConfig.pds_url) {
                log('PDS URL changed, clearing stored tokens')
                await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
                await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
                await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
                await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
                await storageAdapter.remove(STORAGE_KEYS.PDS_ENDPOINTS)
            }
            await storageAdapter.set(STORAGE_KEYS.SERVER_URL, authConfig.pds_url)

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

            try {
                const params = new URLSearchParams(window.location.search)
                if (params.has('code')) {
                    const code = params.get('code')
                    if (!code) return

                    const state = await storageAdapter.get(STORAGE_KEYS.AUTH_STATE)
                    const urlState = params.get('state')
                    if (!state || state !== urlState) {
                        log('error: auth state does not match')
                        setIsAuthReady(true)

                        await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
                        cleanOAuthParams()
                        return
                    }

                    await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
                    cleanOAuthParams()

                    fetchToken(code, false).catch((error) => {
                        log('Error fetching token:', error)
                    })
                } else {
                    const refreshToken = await storageAdapter.get(STORAGE_KEYS.REFRESH_TOKEN)
                    if (refreshToken) {
                        log('Found refresh token in storage, attempting to refresh access token')
                        fetchToken(refreshToken, true).catch((error) => {
                            log('Error fetching refresh token:', error)
                        })
                    } else {
                        const cachedUserInfo = await storageAdapter.get(STORAGE_KEYS.USER_INFO)
                        if (cachedUserInfo) {
                            try {
                                const userData = JSON.parse(cachedUserInfo)
                                setUser(userData)
                                setIsSignedIn(true)
                                log('Loaded cached user info for offline mode')
                            } catch (error) {
                                log('Error parsing cached user info:', error)
                            }
                        }
                        setIsAuthReady(true)
                    }
                }

            } catch (e) {
                log('error getting token', e)
            }
        }

        initializeAuth()
    }, [])

    useEffect(() => {
        async function fetchUser(acc_token: string) {
            log('fetching user')
            try {
                const endpoints = await getActivePdsEndpoints()
                const response = await fetch(endpoints.userinfo_endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${acc_token}`
                    }
                })

                if (!response.ok) {
                    throw new Error(`Failed to fetch user info: ${response.status}`)
                }

                const user = await response.json()

                if (user.error) {
                    log('error fetching user', user.error)
                    throw new Error(`User info error: ${user.error}`)
                }

                if (token?.refresh_token) {
                    await storageAdapter.set(STORAGE_KEYS.REFRESH_TOKEN, token.refresh_token)
                }

                await storageAdapter.set(STORAGE_KEYS.USER_INFO, JSON.stringify(user))
                log('Cached user info in storage')

                setUser(user)
                setIsSignedIn(true)
                setIsAuthReady(true)
            } catch (error) {
                log('Failed to fetch user info:', error)
                // Don't clear tokens here - may be temporary network issue
                setIsAuthReady(true)
            }
        }

        async function checkToken() {
            if (!token) {
                log('error: no user token found')

                setIsAuthReady(true)
                return
            }

            const decoded = jwtDecode<{ sub?: string; scope?: string; typ?: string; exp?: number }>(token?.access_token)

            // Extract DID and scope from token claims
            if (decoded.sub) {
                setDid(decoded.sub)
            }
            if (decoded.scope) {
                setTokenScope(decoded.scope)
            }

            // Add 5 second buffer to prevent edge cases
            const expirationBuffer = 5
            const isExpired = decoded.exp && decoded.exp < (Date.now() / 1000) + expirationBuffer

            if (isExpired) {
                log('token is expired - refreshing ...')
                const refreshToken = token?.refresh_token
                if (!refreshToken) {
                    log('Error: No refresh token available for expired token')
                    setIsAuthReady(true)
                    return
                }
                try {
                    const newToken = await fetchToken(refreshToken, true)
                    fetchUser(newToken?.access_token || '')
                } catch (error) {
                    log('Failed to refresh token in checkToken:', error)

                    if ((error as Error).message.includes('offline') || (error as Error).message.includes('Network')) {
                        log('Network issue - continuing with expired token until online')
                        fetchUser(token?.access_token || '')
                    } else {
                        setIsAuthReady(true)
                    }
                }
            } else {
                fetchUser(token?.access_token || '')
            }
        }

        if (token) {
            checkToken()
        }
    }, [token])

    const getSignInLink = async (redirectUri?: string, endpoints?: PdsEndpoints) => {
        try {
            log('getting sign in link...')

            if (!project_id) {
                throw new Error('Project ID is required to generate sign-in link')
            }

            const pdsEndpoints = endpoints || defaultPdsEndpoints()
            // Persist endpoints so the callback can exchange the code at the right PDS
            await storageAdapter.set(STORAGE_KEYS.PDS_ENDPOINTS, JSON.stringify(pdsEndpoints))

            const randomState = Math.random().toString(36).substring(6);
            await storageAdapter.set(STORAGE_KEYS.AUTH_STATE, randomState)

            const redirectUrl = redirectUri || window.location.href

            if (!redirectUrl || (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://'))) {
                throw new Error('Invalid redirect URI provided')
            }

            // Store redirect_uri for token exchange
            await storageAdapter.set(STORAGE_KEYS.REDIRECT_URI, redirectUrl)
            log('Stored redirect_uri for token exchange:', redirectUrl)

            let baseUrl = pdsEndpoints.authorization_endpoint
            baseUrl += `?client_id=${encodeURIComponent(normalizeClientId(project_id, adminHostname))}`
            baseUrl += `&redirect_uri=${encodeURIComponent(redirectUrl)}`
            baseUrl += `&response_type=code`
            baseUrl += `&scope=${encodeURIComponent(scopesString)}`
            baseUrl += `&state=${randomState}`

            log('Generated sign-in link successfully with scopes:', scopesString)
            return baseUrl;

        } catch (error) {
            log('Error generating sign-in link:', error)
            throw error
        }
    }

    const signin = async () => {
        try {
            log('signing in...')

            if (!project_id) {
                log('Error: project_id is required for sign-in')
                throw new Error('Project ID is required for authentication')
            }

            const signInLink = await getSignInLink()
            log('Generated sign-in link:', signInLink)

            // Validate URL format (supports https://, http://, and custom URI schemes)
            try {
                new URL(signInLink)
            } catch {
                log('Error: Invalid sign-in link generated')
                throw new Error('Failed to generate valid sign-in URL')
            }

            window.location.href = signInLink

        } catch (error) {
            log('Error during sign-in:', error)

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

    const signInWithHandle = async (handle: string) => {
        try {
            log('signing in with handle:', handle)

            if (!project_id) {
                throw new Error('Project ID is required for authentication')
            }

            const resolved = await resolveHandle(handle)
            log('Resolved handle to PDS:', resolved.pdsUrl)

            const endpoints: PdsEndpoints = {
                pds_url: resolved.pdsUrl,
                authorization_endpoint: resolved.authorization_endpoint,
                token_endpoint: resolved.token_endpoint,
                userinfo_endpoint: resolved.userinfo_endpoint
            }

            const signInLink = await getSignInLink(undefined, endpoints)
            log('Generated federated sign-in link:', signInLink)

            try {
                new URL(signInLink)
            } catch {
                throw new Error('Failed to generate valid sign-in URL')
            }

            window.location.href = signInLink

        } catch (error) {
            log('Error during signInWithHandle:', error)

            if (isDevMode()) {
                setError({
                    code: 'signin_error',
                    title: 'Federated Sign-in Failed',
                    message: (error as Error).message || 'Could not resolve handle or sign in.'
                })
            }

            throw error
        }
    }

    const signinWithCode = async (code: string, state?: string): Promise<{ success: boolean, error?: string }> => {
        try {
            log('signinWithCode called with code:', code)

            if (!code || typeof code !== 'string') {
                return { success: false, error: 'Invalid authorization code' }
            }

            if (state) {
                const storedState = await storageAdapter.get(STORAGE_KEYS.AUTH_STATE)
                if (storedState && storedState !== state) {
                    log('State parameter mismatch:', { provided: state, stored: storedState })
                    return { success: false, error: 'State parameter mismatch' }
                }
            }

            await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
            cleanOAuthParams()

            const token = await fetchToken(code, false)

            if (token) {
                log('signinWithCode successful')
                return { success: true }
            } else {
                return { success: false, error: 'Failed to exchange code for token' }
            }
        } catch (error) {
            log('signinWithCode error:', error)
            return {
                success: false,
                error: (error as Error).message || 'Authentication failed'
            }
        }
    }

    const signout = async () => {
        log('signing out!')
        setUser({})
        setIsSignedIn(false)
        setToken(null)
        setDid(null)
        setTokenScope(null)

        await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
        await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
        await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
        await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
        await storageAdapter.remove(STORAGE_KEYS.SERVER_URL)
        await storageAdapter.remove(STORAGE_KEYS.PDS_ENDPOINTS)
        await storageAdapter.remove(STORAGE_KEYS.LAST_CONNECT_REPORT)
        if (syncRef.current) {
            (async () => {
                try {
                    await syncRef.current?.close()
                    await syncRef.current?.delete({ disableAutoOpen: false })
                    syncRef.current = null
                    window?.location?.reload()
                } catch (error) {
                    console.error('Error during database cleanup:', error)
                }
            })()
        }
    }

    const getToken = async (): Promise<string> => {
        log('getting token...')

        if (!token) {
            // Try to recover from storage refresh token
            const refreshToken = await storageAdapter.get(STORAGE_KEYS.REFRESH_TOKEN)
            if (refreshToken) {
                log('No token in memory, attempting to refresh from storage')
                
                // Check if refresh is already in progress
                if (refreshPromiseRef.current) {
                    log('Token refresh already in progress, waiting...')
                    try {
                        const newToken = await refreshPromiseRef.current
                        if (newToken?.access_token) {
                            return newToken.access_token
                        }
                    } catch (error) {
                        log('In-flight refresh failed:', error)
                        throw error
                    }
                }
                
                try {
                    const newToken = await fetchToken(refreshToken, true)
                    if (newToken?.access_token) {
                        return newToken.access_token
                    }
                } catch (error) {
                    log('Failed to refresh token from storage:', error)

                    if ((error as Error).message.includes('offline') || (error as Error).message.includes('Network')) {
                        throw new Error('Network offline - authentication will be retried when online')
                    }

                    throw new Error('Authentication expired. Please sign in again.')
                }
            }
            log('no token found')
            throw new Error('no token found')
        }

        const decoded = jwtDecode(token?.access_token)
        // Add 5 second buffer to prevent edge cases where token expires during request
        const expirationBuffer = 5
        const isExpired = decoded.exp && decoded.exp < (Date.now() / 1000) + expirationBuffer

        if (isExpired) {
            log('token is expired - refreshing ...')
            
            // Check if refresh is already in progress
            if (refreshPromiseRef.current) {
                log('Token refresh already in progress, waiting...')
                try {
                    const newToken = await refreshPromiseRef.current
                    return newToken?.access_token || ''
                } catch (error) {
                    log('In-flight refresh failed:', error)
                    
                    if ((error as Error).message.includes('offline') || (error as Error).message.includes('Network')) {
                        log('Network issue - using expired token until network is restored')
                        return token.access_token
                    }
                    
                    throw error
                }
            }
            
            const refreshToken = token?.refresh_token || await storageAdapter.get(STORAGE_KEYS.REFRESH_TOKEN)
            if (refreshToken) {
                try {
                    const newToken = await fetchToken(refreshToken, true)
                    return newToken?.access_token || ''
                } catch (error) {
                    log('Failed to refresh expired token:', error)

                    if ((error as Error).message.includes('offline') || (error as Error).message.includes('Network')) {
                        log('Network issue - using expired token until network is restored')
                        return token.access_token
                    }

                    throw new Error('Authentication expired. Please sign in again.')
                }
            } else {
                throw new Error('no refresh token available')
            }
        }

        return token?.access_token || ''
    }

    const fetchToken = async (codeOrRefreshToken: string, isRefreshToken: boolean = false): Promise<Token | null> => {
        // Validate input
        if (!codeOrRefreshToken || codeOrRefreshToken.trim() === '') {
            const errorMsg = isRefreshToken ? 'Refresh token is empty or undefined' : 'Authorization code is empty or undefined'
            log('Error:', errorMsg)
            throw new Error(errorMsg)
        }

        // If this is a refresh token request and one is already in progress, return that promise
        if (isRefreshToken && refreshPromiseRef.current) {
            log('Reusing in-flight refresh token request')
            return refreshPromiseRef.current
        }

        // Create new promise for this refresh attempt
        const refreshPromise = (async (): Promise<Token | null> => {
            try {
                if (!isOnline) {
                    log('Network is offline, marking refresh as pending')
                    setPendingRefresh(true)
                    throw new Error('Network offline - refresh will be retried when online')
                }

                let requestBody: any

                const endpoints = await getActivePdsEndpoints()

                if (isRefreshToken) {
                    // Refresh token request
                    requestBody = { 
                        grant_type: 'refresh_token',
                        refresh_token: codeOrRefreshToken
                    }
                    if (project_id) {
                        requestBody.client_id = normalizeClientId(project_id, adminHostname)
                    }
                } else {
                    // Authorization code exchange
                    requestBody = { 
                        grant_type: 'authorization_code',
                        code: codeOrRefreshToken
                    }
                    
                    const storedRedirectUri = await storageAdapter.get(STORAGE_KEYS.REDIRECT_URI)
                    if (storedRedirectUri) {
                        requestBody.redirect_uri = storedRedirectUri
                        log('Including redirect_uri in token exchange:', storedRedirectUri)
                    } else {
                        log('Warning: No redirect_uri found in storage for token exchange')
                    }
                    
                    if (project_id) {
                        requestBody.client_id = normalizeClientId(project_id, adminHostname)
                    }
                }

                log('Token exchange request body:', { ...requestBody, refresh_token: isRefreshToken ? '[REDACTED]' : undefined, code: !isRefreshToken ? '[REDACTED]' : undefined })

                const token = await fetch(endpoints.token_endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => response.json())
                    .catch(error => {
                        log('Network error fetching token:', error)
                        if (!isOnline) {
                            setPendingRefresh(true)
                            throw new Error('Network offline - refresh will be retried when online')
                        }
                        throw new Error('Network error during token refresh')
                    })

                // Defensive typ check: ensure the access token isn't a refresh token
                if (token.access_token) {
                    try {
                        const decoded = jwtDecode<{ typ?: string }>(token.access_token)
                        if (decoded.typ === 'refresh') {
                            log('Error: received refresh token as access token')
                            throw new Error('Invalid token: received refresh token instead of access token')
                        }
                    } catch (decodeError) {
                        // If jwtDecode fails, the token is malformed — let downstream handle it
                        if ((decodeError as Error).message.includes('Invalid token')) {
                            throw decodeError
                        }
                        log('Warning: could not decode access token for typ check:', decodeError)
                    }
                }

                if (token.error) {
                    log('error fetching token', token.error)

                    if (token.error.includes('network') || token.error.includes('timeout')) {
                        setPendingRefresh(true)
                        throw new Error('Network issue - refresh will be retried when online')
                    }

                    await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
                    await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
                    await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
                    await storageAdapter.remove(STORAGE_KEYS.SERVER_URL)
                    await storageAdapter.remove(STORAGE_KEYS.PDS_ENDPOINTS)

                    setUser({})
                    setIsSignedIn(false)
                    setToken(null)
                    setIsAuthReady(true)

                    throw new Error(`Token refresh failed: ${token.error}`)
                } else {
                    setToken(token)
                    setPendingRefresh(false)

                    if (token.refresh_token) {
                        await storageAdapter.set(STORAGE_KEYS.REFRESH_TOKEN, token.refresh_token)
                        log('Updated refresh token in storage')
                    }

                    // Clean up redirect_uri after successful token exchange
                    if (!isRefreshToken) {
                        await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
                        log('Cleaned up redirect_uri from storage after successful exchange')
                    }

                    // Report connection to admin server (fire-and-forget, throttled to once/day)
                    reportConnection(token.access_token).catch(() => {})
                }
                return token
            } catch (error) {
                log('Token refresh error:', error)

                if (!(error as Error).message.includes('offline') && !(error as Error).message.includes('Network')) {
                    await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
                    await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
                    await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
                    await storageAdapter.remove(STORAGE_KEYS.SERVER_URL)
                    await storageAdapter.remove(STORAGE_KEYS.PDS_ENDPOINTS)

                    setUser({})
                    setIsSignedIn(false)
                    setToken(null)
                    setIsAuthReady(true)
                }

                throw error
            }
        })()

        // Store promise if this is a refresh token request
        if (isRefreshToken) {
            refreshPromiseRef.current = refreshPromise
            
            // Clear the promise reference when done (success or failure)
            refreshPromise.finally(() => {
                if (refreshPromiseRef.current === refreshPromise) {
                    refreshPromiseRef.current = null
                    log('Cleared refresh promise reference')
                }
            })
        }

        return refreshPromise
    }

    // Get the current DB instance based on mode
    const getCurrentDb = (): BasicDB => {
        if (dbMode === 'remote') {
            return remoteDbRef.current || noDb
        }
        return syncRef.current || noDb
    }

    const hasScope = (scope: string): boolean => {
        if (!tokenScope) return false
        const scopes = tokenScope.split(' ')
        return scopes.includes(scope)
    }

    // Create context value with new names and legacy aliases
    const contextValue: BasicContextType = {
        // Auth state (new naming)
        isReady: isAuthReady,
        isSignedIn,
        user,
        did,
        scope: tokenScope,
        hasScope,

        // Auth actions (new camelCase naming)
        signIn: signin,
        signInWithHandle,
        signOut: signout,
        signInWithCode: signinWithCode,

        // Token management
        getToken,
        getSignInUrl: getSignInLink,

        // DB access
        db: getCurrentDb(),
        dbStatus,
        dbMode,

        // Legacy aliases (deprecated)
        isAuthReady,
        signin,
        signout,
        signinWithCode,
        getSignInLink,
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
