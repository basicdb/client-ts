import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { jwtDecode } from 'jwt-decode'

import { BasicSync } from './sync'

import { log } from './config'
import { version as currentVersion } from '../package.json'
import { createVersionUpdater } from './updater/versionUpdater'
import { getMigrations } from './updater/updateMigrations'
import { BasicStorage, LocalStorageAdapter, STORAGE_KEYS, getCookie, setCookie, clearCookie } from './utils/storage'
import { isDevelopment, checkForNewVersion, cleanOAuthParamsFromUrl, getSyncStatus } from './utils/network'
import { getSchemaStatus, validateAndCheckSchema } from './utils/schema'

export type { BasicStorage, LocalStorageAdapter } from './utils/storage'

export type AuthConfig = {
    scopes?: string | string[];
    server_url?: string;
    ws_url?: string;
}

export type BasicProviderProps = {
    children: React.ReactNode;
    project_id?: string;
    schema?: any;
    debug?: boolean;
    storage?: BasicStorage;
    auth?: AuthConfig;
}

const DEFAULT_AUTH_CONFIG = {
    scopes: 'profile,email,app:admin',
    server_url: 'https://api.basic.tech',
    ws_url: 'wss://pds.basic.id/ws'
} as const


type BasicSyncType = {
    basic_schema: any;
    connect: (options: { access_token: string; ws_url?: string }) => void;
    debugeroo: () => void;
    collection: (name: string) => {
        ref: {
            toArray: () => Promise<any[]>;
            count: () => Promise<number>;
        };
    };
    [key: string]: any;
};


enum DBStatus {
    LOADING = "LOADING",
    OFFLINE = "OFFLINE",
    CONNECTING = "CONNECTING",
    ONLINE = "ONLINE",
    SYNCING = "SYNCING",
    ERROR = "ERROR"
}

type User = {
    name?: string,
    email?: string,
    id?: string,
    primaryEmailAddress?: {
        emailAddress: string
    },
    fullName?: string
}
type Token = {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
}

export const BasicContext = createContext<{
    unicorn: string,
    isAuthReady: boolean,
    isSignedIn: boolean,
    user: User | null,
    signout: () => Promise<void>,
    signin: () => Promise<void>,
    signinWithCode: (code: string, state?: string) => Promise<{ success: boolean, error?: string }>,
    getToken: () => Promise<string>,
    getSignInLink: (redirectUri?: string) => Promise<string>,
    db: any,
    dbStatus: DBStatus
}>({
    unicorn: "🦄",
    isAuthReady: false,
    isSignedIn: false,
    user: null,
    signout: () => Promise.resolve(),
    signin: () => Promise.resolve(),
    signinWithCode: () => new Promise(() => { }),
    getToken: () => new Promise(() => { }),
    getSignInLink: () => Promise.resolve(""),
    db: {},
    dbStatus: DBStatus.LOADING
});

type ErrorObject = {
    code: string;
    title: string;
    message: string;
}

export function BasicProvider({
    children,
    project_id,
    schema,
    debug = false,
    storage,
    auth
}: BasicProviderProps) {
    const [isAuthReady, setIsAuthReady] = useState(false)
    const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
    const [token, setToken] = useState<Token | null>(null)
    const [user, setUser] = useState<User>({})
    const [shouldConnect, setShouldConnect] = useState<boolean>(false)
    const [isReady, setIsReady] = useState<boolean>(false)

    const [dbStatus, setDbStatus] = useState<DBStatus>(DBStatus.OFFLINE)
    const [error, setError] = useState<ErrorObject | null>(null)
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
    const [pendingRefresh, setPendingRefresh] = useState<boolean>(false)

    const syncRef = useRef<BasicSync | null>(null);
    const storageAdapter = storage || new LocalStorageAdapter();
    
    // Merge auth config with defaults
    const authConfig = {
        scopes: auth?.scopes || DEFAULT_AUTH_CONFIG.scopes,
        server_url: auth?.server_url || DEFAULT_AUTH_CONFIG.server_url,
        ws_url: auth?.ws_url || DEFAULT_AUTH_CONFIG.ws_url
    }
    
    // Normalize scopes to space-separated string
    const scopesString = Array.isArray(authConfig.scopes) 
        ? authConfig.scopes.join(' ') 
        : authConfig.scopes;

    // Token refresh mutex to prevent concurrent refreshes
    const refreshPromiseRef = useRef<Promise<Token | null> | null>(null);

    const isDevMode = () => isDevelopment(debug)

    const cleanOAuthParams = () => cleanOAuthParamsFromUrl()

    useEffect(() => {
        const handleOnline = () => {
            log('Network came back online')
            setIsOnline(true)
            if (pendingRefresh) {
                log('Retrying pending token refresh')
                setPendingRefresh(false)
                if (token) {
                    const refreshToken = token.refresh_token || localStorage.getItem('basic_refresh_token')
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
        function initDb(options: { shouldConnect: boolean }) {
            if (!syncRef.current) {
                log('Initializing Basic DB')
                syncRef.current = new BasicSync('basicdb', { schema: schema });

                syncRef.current.syncable.on('statusChanged', (status: number, url: string) => {
                    setDbStatus(getSyncStatus(status) as DBStatus)
                })

                // syncRef.current.syncable.getStatus().then((status: number) => {
                //     setDbStatus(getSyncStatus(status) as DBStatus)
                // })

                if (options.shouldConnect) {
                    setShouldConnect(true)
                } else {
                    log('Sync is disabled')
                }

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

            if (result.schemaStatus.valid) {
                initDb({ shouldConnect: true })
            } else {
                log('Schema is invalid!', result.schemaStatus)
                initDb({ shouldConnect: false })
            }

            checkForNewVersion()
        }

        if (schema) {
            checkSchema()
        } else {
            setIsReady(true)
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

            // Check if server URL has changed - if so, clear tokens
            const storedServerUrl = await storageAdapter.get(STORAGE_KEYS.SERVER_URL)
            if (storedServerUrl && storedServerUrl !== authConfig.server_url) {
                log('Server URL changed, clearing stored tokens')
                await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
                await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
                await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
                await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
                clearCookie('basic_token')
                clearCookie('basic_access_token')
            }
            await storageAdapter.set(STORAGE_KEYS.SERVER_URL, authConfig.server_url)

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
                if (window.location.search.includes('code')) {
                    let code = window.location?.search?.split('code=')[1]?.split('&')[0]
                    if (!code) return

                    const state = await storageAdapter.get(STORAGE_KEYS.AUTH_STATE)
                    const urlState = window.location.search.split('state=')[1]?.split('&')[0]
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
                        let cookie_token = getCookie('basic_token')
                        if (cookie_token !== '') {
                            const tokenData = JSON.parse(cookie_token)
                            setToken(tokenData)
                            if (tokenData.refresh_token) {
                                await storageAdapter.set(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token)
                            }
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
                }

            } catch (e) {
                log('error getting token', e)
            }
        }

        initializeAuth()
    }, [])

    useEffect(() => {
        async function fetchUser(acc_token: string) {
            console.info('fetching user')
            try {
                const response = await fetch(`${authConfig.server_url}/auth/userInfo`, {
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

                setCookie('basic_access_token', token?.access_token || '', { httpOnly: false });
                setCookie('basic_token', JSON.stringify(token));

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

            const decoded = jwtDecode(token?.access_token)
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

    const getSignInLink = async (redirectUri?: string) => {
        try {
            log('getting sign in link...')

            if (!project_id) {
                throw new Error('Project ID is required to generate sign-in link')
            }

            const randomState = Math.random().toString(36).substring(6);
            await storageAdapter.set(STORAGE_KEYS.AUTH_STATE, randomState)

            const redirectUrl = redirectUri || window.location.href

            if (!redirectUrl || (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://'))) {
                throw new Error('Invalid redirect URI provided')
            }

            // Store redirect_uri for token exchange
            await storageAdapter.set(STORAGE_KEYS.REDIRECT_URI, redirectUrl)
            log('Stored redirect_uri for token exchange:', redirectUrl)

            let baseUrl = `${authConfig.server_url}/auth/authorize`
            baseUrl += `?client_id=${project_id}`
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

        clearCookie('basic_token');
        clearCookie('basic_access_token');
        await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
        await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
        await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
        await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
        await storageAdapter.remove(STORAGE_KEYS.SERVER_URL)
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
                        log('Network issue - continuing with potentially expired token')
                        const lastToken = localStorage.getItem('basic_access_token')
                        if (lastToken) {
                            return lastToken
                        }
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

                if (isRefreshToken) {
                    // Refresh token request
                    requestBody = { 
                        grant_type: 'refresh_token',
                        refresh_token: codeOrRefreshToken
                    }
                    // Include client_id if available for validation
                    if (project_id) {
                        requestBody.client_id = project_id
                    }
                } else {
                    // Authorization code exchange
                    requestBody = { 
                        grant_type: 'authorization_code',
                        code: codeOrRefreshToken
                    }
                    
                    // Retrieve stored redirect_uri (required by OAuth2 spec)
                    const storedRedirectUri = await storageAdapter.get(STORAGE_KEYS.REDIRECT_URI)
                    if (storedRedirectUri) {
                        requestBody.redirect_uri = storedRedirectUri
                        log('Including redirect_uri in token exchange:', storedRedirectUri)
                    } else {
                        log('Warning: No redirect_uri found in storage for token exchange')
                    }
                    
                    // Include client_id for validation
                    if (project_id) {
                        requestBody.client_id = project_id
                    }
                }

                log('Token exchange request body:', { ...requestBody, refresh_token: isRefreshToken ? '[REDACTED]' : undefined, code: !isRefreshToken ? '[REDACTED]' : undefined })

                const token = await fetch(`${authConfig.server_url}/auth/token`, {
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
                    clearCookie('basic_token');
                    clearCookie('basic_access_token');

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

                    setCookie('basic_access_token', token.access_token, { httpOnly: false });
                    setCookie('basic_token', JSON.stringify(token));
                    log('Updated access token and full token in cookies')
                }
                return token
            } catch (error) {
                log('Token refresh error:', error)

                if (!(error as Error).message.includes('offline') && !(error as Error).message.includes('Network')) {
                    await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
                    await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
                    await storageAdapter.remove(STORAGE_KEYS.REDIRECT_URI)
                    await storageAdapter.remove(STORAGE_KEYS.SERVER_URL)
                    clearCookie('basic_token');
                    clearCookie('basic_access_token');

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

    const noDb = ({
        collection: () => {
            throw new Error('no basicdb found - initialization failed. double check your schema.')
        }
    })

    return (
        <BasicContext.Provider value={{
            unicorn: "🦄",
            isAuthReady,
            isSignedIn,
            user,
            signout,
            signin,
            signinWithCode,
            getToken,
            getSignInLink,
            db: syncRef.current ? syncRef.current : noDb,
            dbStatus
        }}>

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
