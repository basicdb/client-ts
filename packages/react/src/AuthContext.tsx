import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
  lazy,
} from 'react'

import { BasicSync, initDexieExtensions } from './sync'
import { RemoteDB, DBMode, BasicDB } from './core/db'
import { AuthManager } from './core/auth/AuthManager'
import type {
  User,
  AuthResult,
  GetTokenOptions,
  PdsEndpoints,
  AuthStatus,
} from './core/auth/AuthManager'

import { log } from './config'
import { version as currentVersion } from '../package.json'
import { createVersionUpdater } from './updater/versionUpdater'
import { getMigrations } from './updater/updateMigrations'
import { BasicStorage, LocalStorageAdapter } from './utils/storage'
import {
  isDevelopment,
  checkForNewVersion,
  getSyncStatus,
} from './utils/network'
import { validateAndCheckSchema } from './utils/schema'
import {
  BasicContext,
  DBStatus,
  noDb,
  type BasicSchemaDevInfo,
} from './context'

const BasicDevToolbar = lazy(() =>
  import('./dev/BasicDevToolbar').then((m) => ({ default: m.BasicDevToolbar })),
)

export type { BasicStorage, LocalStorageAdapter } from './utils/storage'
export type { DBMode, BasicDB, Collection } from './core/db'
export type {
  Token,
  User,
  AuthResult,
  GetTokenOptions,
  PdsEndpoints,
  AuthStatus,
} from './core/auth/AuthManager'
export type { BasicContextType, BasicSchemaDevInfo } from './context'
export { DBStatus, useBasic, BasicContext } from './context'

export type AuthConfig = {
  scopes?: string | string[]
  /** @deprecated Use pds_url instead */
  server_url?: string
  /** PDS URL for auth and data (default: https://pds.basic.id) */
  pds_url?: string
  /** Admin server URL for connect reporting (default: https://api.basic.tech) */
  admin_url?: string
  ws_url?: string
}

export type BasicProviderProps = {
  children: React.ReactNode
  /**
   * @deprecated Project ID is now extracted from schema.project_id.
   * This prop is kept for backward compatibility but can be omitted.
   */
  project_id?: string
  /** The Basic schema object containing project_id and table definitions */
  schema?: any
  debug?: boolean
  storage?: BasicStorage
  auth?: AuthConfig
  /**
   * Database mode - determines which implementation is used
   * - 'sync': Uses Dexie + WebSocket for local-first sync (default)
   * - 'remote': Uses REST API calls directly to server
   */
  dbMode?: DBMode
  /** Show floating dev toolbar (localhost, NODE_ENV=development, or debug=true). */
  devToolbar?: boolean
}

const DEFAULT_AUTH_CONFIG = {
  scopes: 'profile,email,app:admin',
  pds_url: 'https://pds.basic.id',
  admin_url: 'https://api.basic.tech',
  ws_url: 'wss://pds.basic.id/ws',
} as const

type ErrorObject = {
  code: string
  title: string
  message: string
}

type AuthSnapshot = {
  isSignedIn: boolean
  hasToken: boolean
  isAuthReady: boolean
  authStatus: AuthStatus
  authErrorCode: string | null
  user: User | null
  did: string | null
  tokenScope: string | null
}

function snapshotAuth(mgr: AuthManager): AuthSnapshot {
  return {
    isSignedIn: mgr.isSignedIn,
    hasToken: !!mgr.token,
    isAuthReady: mgr.isAuthReady,
    authStatus: mgr.authStatus,
    authErrorCode: mgr.authErrorCode,
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
  dbMode = 'sync',
  devToolbar = false,
}: BasicProviderProps) {
  const project_id = schema?.project_id || project_id_prop

  if (auth?.server_url && !auth?.pds_url) {
    log('Warning: auth.server_url is deprecated, use auth.pds_url instead')
  }
  const authConfig = {
    scopes: auth?.scopes || DEFAULT_AUTH_CONFIG.scopes,
    pds_url: auth?.pds_url || auth?.server_url || DEFAULT_AUTH_CONFIG.pds_url,
    admin_url: auth?.admin_url || DEFAULT_AUTH_CONFIG.admin_url,
    ws_url: auth?.ws_url || DEFAULT_AUTH_CONFIG.ws_url,
  }

  const scopesString = Array.isArray(authConfig.scopes)
    ? authConfig.scopes.join(' ')
    : authConfig.scopes

  const storageRef = useRef<BasicStorage>(storage || new LocalStorageAdapter())
  const storageAdapter = storageRef.current

  const schemaRef = useRef(schema)
  schemaRef.current = schema

  const [authState, setAuthState] = useState<AuthSnapshot>({
    isSignedIn: false,
    hasToken: false,
    isAuthReady: false,
    authStatus: 'bootstrapping',
    authErrorCode: null,
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

  const syncRef = useRef<BasicSync | null>(null)
  const remoteDbRef = useRef<RemoteDB | null>(null)
  const [shouldConnect, setShouldConnect] = useState(false)
  const [dbStatus, setDbStatus] = useState<DBStatus>(DBStatus.OFFLINE)
  const [isDbReady, setIsDbReady] = useState(false)
  const [error, setError] = useState<ErrorObject | null>(null)
  const [schemaDevInfo, setSchemaDevInfo] = useState<BasicSchemaDevInfo | null>(
    null,
  )

  const isDevMode = () => isDevelopment(debug)

  const refreshSchemaStatus = useCallback(async () => {
    const s = schemaRef.current
    if (!s) {
      setSchemaDevInfo(
        project_id
          ? {
              projectId: project_id,
              localVersion: undefined,
              status: 'no_schema',
              valid: false,
              lastCheckedAt: Date.now(),
            }
          : null,
      )
      return
    }
    const result = await validateAndCheckSchema(s)
    if (!result.isValid) {
      const errText =
        result.errors
          ?.map((e: { message?: string }) => e.message || '')
          .join('; ') || 'invalid'
      setSchemaDevInfo({
        projectId: s.project_id ?? null,
        localVersion: s.version,
        status: 'invalid',
        valid: false,
        lastCheckedAt: Date.now(),
        error: errText,
      })
      return
    }
    setSchemaDevInfo({
      projectId: s.project_id ?? null,
      localVersion: s.version,
      status: result.schemaStatus.status ?? 'unknown',
      valid: result.schemaStatus.valid,
      lastCheckedAt: Date.now(),
    })
  }, [project_id])

  useEffect(() => {
    const runVersionUpdater = async () => {
      try {
        const versionUpdater = createVersionUpdater(
          storageAdapter,
          currentVersion,
          getMigrations(),
        )
        const updateResult = await versionUpdater.checkAndUpdate()

        if (updateResult.updated) {
          log(
            `App updated from ${updateResult.fromVersion} to ${updateResult.toVersion}`,
          )
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

  useEffect(() => {
    async function initSyncDb(options: { shouldConnect: boolean }) {
      if (!syncRef.current) {
        log('Initializing Basic Sync DB')

        await initDexieExtensions()

        syncRef.current = new BasicSync('basicdb', { schema: schema })

        syncRef.current.syncable.on('statusChanged', (status: number) => {
          const newStatus = getSyncStatus(status) as DBStatus
          setDbStatus(newStatus)

          if (newStatus === DBStatus.ERROR_WILL_RETRY) {
            log(
              'Sync entered ERROR_WILL_RETRY - reconciling auth session before retry',
            )
            authRef.current
              .reconcileSession('sync retry', {
                forceRefresh: true,
                throttleMs: 0,
              })
              .catch(() => {})
          }
        })

        if (options.shouldConnect) {
          setShouldConnect(true)
        } else {
          log('Sync is disabled')
        }

        setIsDbReady(true)
      }
    }

    function initRemoteDb() {
      if (!remoteDbRef.current) {
        if (!project_id) {
          setError({
            code: 'missing_project_id',
            title: 'Project ID Required',
            message:
              'Remote mode requires a project_id. Provide it via schema.project_id or the project_id prop.',
          })
          setIsDbReady(true)
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
            if (error.errorType === 'forbidden') {
              log('403 Forbidden - user lacks required scope, not signing out')
              return
            }
            authRef.current
              .reconcileSession(`remote db ${error.errorType}`, {
                forceRefresh: error.errorType !== 'network',
                throttleMs: 0,
              })
              .catch((reconcileError) => {
                log('RemoteDB auth recovery failed:', reconcileError)
              })
          },
        })
        setDbStatus(DBStatus.ONLINE)
        setIsDbReady(true)
      }
    }

    async function checkSchema() {
      const result = await validateAndCheckSchema(schema)

      if (!result.isValid) {
        let errorMessage = ''
        if (result.errors) {
          result.errors.forEach((err: any, index: number) => {
            errorMessage += `${index + 1}: ${err.message} - at ${err.instancePath}\n`
          })
        }
        setSchemaDevInfo({
          projectId: schema?.project_id ?? null,
          localVersion: schema?.version,
          status: 'invalid',
          valid: false,
          lastCheckedAt: Date.now(),
          error: errorMessage.trim() || undefined,
        })
        setError({
          code: 'schema_invalid',
          title: 'Basic Schema is invalid!',
          message: errorMessage,
        })
        setIsDbReady(true)
        return null
      }

      setSchemaDevInfo({
        projectId: schema?.project_id ?? null,
        localVersion: schema?.version,
        status: result.schemaStatus.status ?? 'unknown',
        valid: result.schemaStatus.valid,
        lastCheckedAt: Date.now(),
      })

      if (dbMode === 'remote') {
        initRemoteDb()
      } else {
        if (result.schemaStatus.valid) {
          await initSyncDb({ shouldConnect: true })
        } else {
          if (result.schemaStatus.status === 'unpublished') {
            log(
              'Schema not published yet (version 0) - sync is disabled. Publish your schema to enable sync.',
            )
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
      setSchemaDevInfo(
        project_id
          ? {
              projectId: project_id,
              localVersion: undefined,
              status: 'no_schema',
              valid: false,
              lastCheckedAt: Date.now(),
            }
          : null,
      )
      if (dbMode === 'remote' && project_id) {
        initRemoteDb()
      } else {
        setIsDbReady(true)
      }
    }
  }, [])

  useEffect(() => {
    if (
      authState.hasToken &&
      syncRef.current &&
      authState.isSignedIn &&
      authState.authStatus !== 'reauth_required' &&
      shouldConnect
    ) {
      log('connecting to db...')

      syncRef.current
        ?.connect({
          getToken: (opts?: GetTokenOptions) => authRef.current.getToken(opts),
          ws_url: authConfig.ws_url,
        })
        .catch((e: any) => {
          log('error connecting to db', e)
        })
    }
  }, [
    authState.authStatus,
    authState.isSignedIn,
    authState.hasToken,
    shouldConnect,
  ])

  useEffect(() => {
    if (authState.authStatus !== 'reauth_required' || !syncRef.current) {
      return
    }

    log('Auth requires reauthentication - disconnecting sync without deleting local DB')
    setDbStatus(DBStatus.ERROR_TOKEN_EXPIRED)
    syncRef.current
      .disconnect({ ws_url: authConfig.ws_url })
      .catch((disconnectError: unknown) => {
        log('Error disconnecting sync after auth invalidation:', disconnectError)
      })
  }, [authConfig.ws_url, authState.authStatus])

  // TODO: replace reload with proper sync DB teardown + re-init so
  // sign-out → sign-in works without a full page reload.
  const handleSignOut = async () => {
    await authRef.current.signOut()
    if (syncRef.current) {
      try {
        await syncRef.current.close()
        await syncRef.current.delete({ disableAutoOpen: false })
        syncRef.current = null
      } catch (error) {
        console.error('Error during database cleanup:', error)
      }
    }
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const handleSignIn = async () => {
    try {
      await authRef.current.signIn()
    } catch (error) {
      if (isDevMode()) {
        setError({
          code: 'signin_error',
          title: 'Sign-in Failed',
          message:
            (error as Error).message ||
            'An error occurred during sign-in. Please try again.',
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
          message:
            (error as Error).message ||
            'An error occurred during sign-in. Please try again.',
        })
      }
      throw error
    }
  }

  const getCurrentDb = (): BasicDB => {
    if (dbMode === 'remote') {
      return remoteDbRef.current || noDb
    }
    return syncRef.current || noDb
  }

  const contextValue = {
    isReady: authState.isAuthReady,
    isSignedIn: authState.isSignedIn,
    authStatus: authState.authStatus,
    authErrorCode: authState.authErrorCode,
    user: authState.user,
    did: authState.did,
    scope: authState.tokenScope,
    hasScope: (s: string) => authRef.current.hasScope(s),
    missingScopes: () => authRef.current.missingScopes(),

    signIn: handleSignIn,
    signInWithHandle: handleSignInWithHandle,
    signOut: handleSignOut,
    signInWithCode: (code: string, state?: string) =>
      authRef.current.signInWithCode(code, state),

    getToken: (opts?: GetTokenOptions) => authRef.current.getToken(opts),
    getSignInUrl: (redirectUri?: string) =>
      authRef.current.getSignInUrl(redirectUri),

    db: getCurrentDb(),
    dbStatus,
    dbMode,

    devInfo: schemaDevInfo,
    refreshSchemaStatus,

    isAuthReady: authState.isAuthReady,
    signin: handleSignIn,
    signout: handleSignOut,
    signinWithCode: (code: string, state?: string) =>
      authRef.current.signInWithCode(code, state),
    getSignInLink: (redirectUri?: string) =>
      authRef.current.getSignInUrl(redirectUri),
  }

  return (
    <BasicContext.Provider value={contextValue}>
      {error && isDevMode() && <ErrorDisplay error={error} />}
      {devToolbar && isDevMode() && (
        <Suspense fallback={null}>
          <BasicDevToolbar debug={debug} />
        </Suspense>
      )}
      {isDbReady && authState.isAuthReady && children}
    </BasicContext.Provider>
  )
}

function ErrorDisplay({ error }: { error: ErrorObject }) {
  return (
    <div
      style={{
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
      }}
    >
      <h3 style={{ fontSize: '0.8rem', opacity: 0.8 }}>code: {error.code}</h3>
      <h1 style={{ fontSize: '1.2rem', lineHeight: 1.5 }}>{error.title}</h1>
      <p>{error.message}</p>
    </div>
  )
}
