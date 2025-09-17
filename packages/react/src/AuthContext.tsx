import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { jwtDecode } from 'jwt-decode'

import { BasicSync } from './sync'
import { get, add, update, deleteRecord } from './db'
import { validateSchema, compareSchemas } from '@basictech/schema'

import { log } from './config'
import {version as currentVersion} from '../package.json'
import { createVersionUpdater } from './updater/versionUpdater'
import { getMigrations } from './updater/updateMigrations'

export interface BasicStorage {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
}

export class LocalStorageAdapter implements BasicStorage {
    async get(key: string): Promise<string | null> {
        return localStorage.getItem(key)
    }
    
    async set(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value)
    }
    
    async remove(key: string): Promise<void> {
        localStorage.removeItem(key)
    }
}

type BasicSyncType = {
    basic_schema: any;
    connect: (options: { access_token: string }) => void;
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

const EmptyDB: BasicSyncType = {
    basic_schema: {},
    connect: () => {},
    debugeroo: () => {},
    isOpen: false,
    collection: () => {
        return {
            ref: {
                toArray: () => Promise.resolve([]),
                count: () => Promise.resolve(0)
            }
        }
    }
}

async function getSchemaStatus(schema: any) {
    const projectId = schema.project_id
    let status = ''
    const valid = validateSchema(schema)

    if (!valid.valid) {
        console.warn('BasicDB Error: your local schema is invalid. Please fix errors and try again - sync is disabled')
        return { 
            valid: false, 
            status: 'invalid',
            latest: null
        }
    }

    const latestSchema = await fetch(`https://api.basic.tech/project/${projectId}/schema`)
    .then(res => res.json())
    .then(data => data.data[0].schema)
    .catch(err => {
        return { 
            valid: false, 
            status: 'error',
            latest: null
        }
    })

    console.log('latestSchema', latestSchema)

    if (!latestSchema.version) {
        return { 
            valid: false, 
            status: 'error',
            latest: null
        }
    }

    if (latestSchema.version > schema.version) {
        // error_code: schema_behind
        console.warn('BasicDB Error: your local schema version is behind the latest. Found version:', schema.version, 'but expected', latestSchema.version, " - sync is disabled")
        return { 
            valid: false, 
            status: 'behind', 
            latest: latestSchema
        }
    } else if (latestSchema.version < schema.version) {
        // error_code: schema_ahead
        console.warn('BasicDB Error: your local schema version is ahead of the latest. Found version:', schema.version, 'but expected', latestSchema.version, " - sync is disabled")
        return { 
            valid: false, 
            status: 'ahead', 
            latest: latestSchema
        }
    } else if (latestSchema.version === schema.version) {
        const changes = compareSchemas(schema, latestSchema)
        if (changes.valid) {
            return { 
                valid: true,
                status: 'current',
                latest: latestSchema
            }
        } else {
            // error_code: schema_conflict
            console.warn('BasicDB Error: your local schema is conflicting with the latest. Your version:', schema.version, 'does not match origin version', latestSchema.version, " - sync is disabled")
            return { 
                valid: false, 
                status: 'conflict',
                latest: latestSchema
            }
        }
    } else { 
        return { 
            valid: false, 
            status: 'error',
            latest: null
        }
    }
}


function getSyncStatus(statusCode: number): string {
    switch (statusCode) {
        case -1:
            return "ERROR";
        case 0:
            return "OFFLINE";
        case 1:
            return "CONNECTING";
        case 2:
            return "ONLINE";
        case 3:
            return "SYNCING";
        case 4:
            return "ERROR_WILL_RETRY";
        default:
            return "UNKNOWN";
    }
}

type ErrorObject = {
    code: string;
    title: string;
    message: string;
}

async function checkForNewVersion(): Promise<{ hasNewVersion: boolean, latestVersion: string | null, currentVersion: string | null }> {
    try {

        const isBeta = currentVersion.includes('beta')

        const response = await fetch(`https://registry.npmjs.org/@basictech/react/${isBeta ? 'beta' : 'latest'}`);
        if (!response.ok) {
            throw new Error('Failed to fetch version from npm');
        }

        const data = await response.json();
        const latestVersion = data.version;

        if (latestVersion !== currentVersion) {
            console.warn('[basic] New version available:', latestVersion, `\nrun "npm install @basictech/react@${latestVersion}" to update`);
        }
        if (isBeta) {
            log('thank you for being on basictech/react beta :)')
        }
     
        return {
            hasNewVersion: currentVersion !== latestVersion,
            latestVersion,
            currentVersion
        };
    } catch (error) {
        log('Error checking for new version:', error);
        return {
            hasNewVersion: false,
            latestVersion: null, 
            currentVersion: null
        };
    }
}

export function BasicProvider({ 
    children, 
    project_id, 
    schema, 
    debug = false, 
    storage 
}: { 
    children: React.ReactNode, 
    project_id?: string, 
    schema?: any, 
    debug?: boolean,
    storage?: BasicStorage 
}) {
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
    const STORAGE_KEYS = {
        REFRESH_TOKEN: 'basic_refresh_token',
        USER_INFO: 'basic_user_info',
        AUTH_STATE: 'basic_auth_state',
        DEBUG: 'basic_debug'
    }

    const isDevelopment = () => {
        return (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('localhost') ||
            window.location.hostname.includes('127.0.0.1') ||
            window.location.hostname.includes('.local') ||
            process.env.NODE_ENV === 'development' ||
            debug === true
        )
    }

    const cleanOAuthParamsFromUrl = () => {
        if (window.location.search.includes('code') || window.location.search.includes('state')) {
            const url = new URL(window.location.href)
            url.searchParams.delete('code')
            url.searchParams.delete('state')
            window.history.pushState({}, document.title, url.pathname + url.search)
            log('Cleaned OAuth parameters from URL')
        }
    }

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
                        fetchToken(refreshToken).catch(error => {
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
            const valid = validateSchema(schema)
            if (!valid.valid) {
                log('Basic Schema is invalid!', valid.errors)
                console.group('Schema Errors')
                let errorMessage = ''
                valid.errors.forEach((error, index) => {
                    log(`${index + 1}:`, error.message, ` - at ${error.instancePath}`)
                    errorMessage += `${index + 1}: ${error.message} - at ${error.instancePath}\n`
                })
                console.groupEnd()
                setError({
                    code: 'schema_invalid',
                    title: 'Basic Schema is invalid!',
                    message: errorMessage
                })
                setIsReady(true)
                return null
            }


            let schemaStatus = { valid: false }
            if (schema.version !== 0) {
                schemaStatus = await getSchemaStatus(schema)
                log('schemaStatus', schemaStatus)
            }else { 
                log("schema not published - at version 0")
            }

            if (schemaStatus.valid) {
                initDb({ shouldConnect: true })
            } else {
                log('Schema is invalid!', schemaStatus)
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
        if (token && syncRef.current && isSignedIn && shouldConnect) {
            connectToDb()
        }
    }, [isSignedIn, shouldConnect])

    const connectToDb = async () => {
        const tok = await getToken()
        if (!tok) {
            log('no token found')
            return
        }

        log('connecting to db...')

        syncRef.current?.connect({ access_token: tok })
            .catch((e) => {
                log('error connecting to db', e)
            })
    }

    useEffect(() => {
        const initializeAuth = async () => {
            await storageAdapter.set(STORAGE_KEYS.DEBUG, debug ? 'true' : 'false')

            // Initialize version updater and run migrations
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
                // Continue with app initialization even if version update fails
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
                    // Clean OAuth parameters from URL
                    cleanOAuthParamsFromUrl()
                    return
                }

                await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
                // Clean OAuth parameters from URL
                cleanOAuthParamsFromUrl()

                fetchToken(code).catch((error) => {
                    log('Error fetching token:', error)
                })                
            } else { 
                const refreshToken = await storageAdapter.get(STORAGE_KEYS.REFRESH_TOKEN)
                if (refreshToken) {
                    log('Found refresh token in storage, attempting to refresh access token')
                    fetchToken(refreshToken).catch((error) => {
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
            const user = await fetch('https://api.basic.tech/auth/userInfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${acc_token}`
                }
            })
                .then(response => response.json())
                .catch(error => log('Error:', error))

            if (user.error) {
                log('error fetching user', user.error)
                return
            } else {
                if (token?.refresh_token) {
                    await storageAdapter.set(STORAGE_KEYS.REFRESH_TOKEN, token.refresh_token)
                }
                
                await storageAdapter.set(STORAGE_KEYS.USER_INFO, JSON.stringify(user))
                log('Cached user info in storage')
                
                document.cookie = `basic_access_token=${token?.access_token}; Secure; SameSite=Strict; HttpOnly=false`;
                document.cookie = `basic_token=${JSON.stringify(token)}; Secure; SameSite=Strict`;
                
                setUser(user)
                setIsSignedIn(true)

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
            const isExpired = decoded.exp && decoded.exp < Date.now() / 1000

            if (isExpired) {
                log('token is expired - refreshing ...')
                try {
                    const newToken = await fetchToken(token?.refresh_token || '')
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

            let baseUrl = "https://api.basic.tech/auth/authorize"
            baseUrl += `?client_id=${project_id}`
            baseUrl += `&redirect_uri=${encodeURIComponent(redirectUrl)}`
            baseUrl += `&response_type=code`
            baseUrl += `&scope=profile`
            baseUrl += `&state=${randomState}`

            log('Generated sign-in link successfully')
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
            
            if (!signInLink || !signInLink.startsWith('https://')) {
                log('Error: Invalid sign-in link generated')
                throw new Error('Failed to generate valid sign-in URL')
            }
            
            window.location.href = signInLink
            
        } catch (error) {
            log('Error during sign-in:', error)
            
            if (isDevelopment()) {
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
            cleanOAuthParamsFromUrl()

            const token = await fetchToken(code)
            
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
        
        document.cookie = `basic_token=; Secure; SameSite=Strict`;
        document.cookie = `basic_access_token=; Secure; SameSite=Strict`;
        await storageAdapter.remove(STORAGE_KEYS.AUTH_STATE)
        await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
        await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
        if (syncRef.current) {
            (async () => {
                try {
                    await syncRef.current?.close()
                    await syncRef.current?.delete({disableAutoOpen: false})
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
                try {
                    const newToken = await fetchToken(refreshToken)
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
        const isExpired = decoded.exp && decoded.exp < Date.now() / 1000

        if (isExpired) {
            log('token is expired - refreshing ...')
            const refreshToken = token?.refresh_token || await storageAdapter.get(STORAGE_KEYS.REFRESH_TOKEN)
            if (refreshToken) {
                try {
                    const newToken = await fetchToken(refreshToken)
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

    function getCookie(name: string) {
        let cookieValue = '';
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i]?.trim();
                if (cookie && cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const fetchToken = async (code: string) => {
        try {
            if (!isOnline) {
                log('Network is offline, marking refresh as pending')
                setPendingRefresh(true)
                throw new Error('Network offline - refresh will be retried when online')
            }

            const token = await fetch('https://api.basic.tech/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: code })
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
                document.cookie = `basic_token=; Secure; SameSite=Strict`;
                document.cookie = `basic_access_token=; Secure; SameSite=Strict`;
                
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
                
                document.cookie = `basic_access_token=${token.access_token}; Secure; SameSite=Strict; HttpOnly=false`;
                log('Updated access token in cookie')
            }
            return token
        } catch (error) {
            log('Token refresh error:', error)
            
            if (!(error as Error).message.includes('offline') && !(error as Error).message.includes('Network')) {
                await storageAdapter.remove(STORAGE_KEYS.REFRESH_TOKEN)
                await storageAdapter.remove(STORAGE_KEYS.USER_INFO)
                document.cookie = `basic_token=; Secure; SameSite=Strict`;
                document.cookie = `basic_access_token=; Secure; SameSite=Strict`;
                
                setUser({})
                setIsSignedIn(false)
                setToken(null)
                setIsAuthReady(true)
            }
            
            throw error
        }
    }


    const db_ = (tableName: string) => {
        const checkSignIn = () => {
            if (!isSignedIn) {
                throw new Error('cannot use db. user not logged in.')
            }
        }

        return {
            get: async () => {
                checkSignIn()
                const tok = await getToken()
                return get({ projectId: project_id, accountId: user?.id, tableName: tableName, token: tok })
            },
            add: async (value: any) => {
                checkSignIn()
                const tok = await getToken()
                return add({ projectId: project_id, accountId: user?.id, tableName: tableName, value: value, token: tok })
            },
            update: async (id: string, value: any) => {
                checkSignIn()
                const tok = await getToken()
                return update({ projectId: project_id, accountId: user?.id, tableName: tableName, id: id, value: value, token: tok })
            },
            delete: async (id: string) => {
                checkSignIn()
                const tok = await getToken()
                return deleteRecord({ projectId: project_id, accountId: user?.id, tableName: tableName, id: id, token: tok })
            }

        }

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
            
            {error && isDevelopment() && <ErrorDisplay error={error} />}
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
        <h3 style={{fontSize: '0.8rem', opacity: 0.8}}>code: {error.code}</h3>
        <h1 style={{fontSize: '1.2rem', lineHeight: '1.5'}}>{error.title}</h1>
        <p>{error.message}</p>
    </div>
}


export function useBasic() {
    return useContext(BasicContext);
}
