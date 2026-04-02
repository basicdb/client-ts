import { jwtDecode } from 'jwt-decode'
import { BasicStorage, STORAGE_KEYS } from '../../utils/storage'
import { normalizeClientId } from '../../utils/normalizeClientId'
import { resolveHandle } from '../../utils/resolveDid'
import { cleanOAuthParamsFromUrl } from '../../utils/network'
import { log } from '../../config'

const DEFINITIVE_TOKEN_ERRORS = new Set([
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
])
const USER_RECOVERY_RETRY_COOLDOWN_MS = 30_000
const SESSION_RECONCILE_THROTTLE_MS = 5_000

class DefinitiveAuthError extends Error {
  readonly code: string

  constructor(code: string) {
    super(`Definitive auth failure: ${code}`)
    this.name = 'DefinitiveAuthError'
    this.code = code
  }
}

// --- PKCE helpers (RFC 7636) ---

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generateCodeChallenge(
  verifier: string,
): Promise<{ challenge: string; method: 'S256' | 'plain' }> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    log(
      'crypto.subtle unavailable (non-secure context?) -- falling back to plain PKCE challenge',
    )
    return { challenge: verifier, method: 'plain' }
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return { challenge: base64UrlEncode(new Uint8Array(digest)), method: 'S256' }
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = ''
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]!)
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export type Token = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export type User = {
  sub?: string
  name?: string
  email?: string
  picture?: string
}

/**
 * High-level auth lifecycle state.
 *
 * - `bootstrapping` — SDK is initializing; not yet determined if a session exists.
 * - `authenticated` — User has a valid access token and active session.
 * - `recovering`    — A session likely exists (refresh token / cached user) but
 *                     the SDK hasn't confirmed it yet (e.g. offline, mid-refresh).
 * - `reauth_required` — The session is definitively invalid (revoked, expired
 *                     refresh token, etc.). The user must sign in again.
 *                     NOTE: `isSignedIn` remains `true` in this state so the UI
 *                     can display user info while prompting re-authentication.
 *                     Use `authStatus === 'reauth_required'` to distinguish
 *                     this from a healthy signed-in state.
 * - `signed_out`    — No session. User is not authenticated.
 *
 * TODO: revisit naming and ergonomics — consider adding a `needsReauth` or
 * `shouldPromptSignIn` convenience getter so consumers don't need to inspect
 * the raw status to decide between "sign in" vs "sign out" UI.
 */
export type AuthStatus =
  | 'bootstrapping'
  | 'authenticated'
  | 'recovering'
  | 'reauth_required'
  | 'signed_out'

export type AuthResult = {
  success: boolean
  error?: string
  code?: string
}

export type GetTokenOptions = {
  forceRefresh?: boolean
}

export type PdsEndpoints = {
  pds_url: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

export type AuthManagerConfig = {
  projectId: string | undefined
  scopes: string
  pdsUrl: string
  adminUrl: string
  debug: boolean
}

type JwtClaims = {
  sub?: string
  scope?: string
  typ?: string
  exp?: number
}

type CurrentSessionInfo = {
  active: boolean
  reauth_required?: boolean
  session_id?: string | null
  client_id?: string
  scope?: string
  account_did?: string
  connection_status?: string
  last_seen_at?: string | null
  error?: string
}

/**
 * Framework-agnostic auth manager. Holds token state, handles OAuth flow,
 * token refresh (with mutex), and user info fetching.
 *
 * React integration: pass a state-setter as `notify` so the component
 * re-renders whenever auth state changes.
 */
export class AuthManager {
  // --- Public state (read by the UI layer) ---
  token: Token | null = null
  user: User | null = null
  isSignedIn: boolean = false
  isAuthReady: boolean = false
  authStatus: AuthStatus = 'bootstrapping'
  authErrorCode: string | null = null
  did: string | null = null
  /** Space-separated scopes granted in the current access token */
  tokenScope: string | null = null
  /** Space-separated scopes originally requested in the auth config */
  requestedScopes: string

  readonly config: AuthManagerConfig
  readonly storage: BasicStorage

  /** True only during a user-initiated OAuth code exchange (not session restore) */
  private freshSignIn: boolean = false

  // --- Private ---
  private notify: () => void
  private refreshPromise: Promise<Token | null> | null = null
  private codeExchangePromise: Promise<Token | null> | null = null
  private pendingRefresh: boolean = false
  private isOnline: boolean =
    typeof navigator !== 'undefined' ? navigator.onLine : true
  private channel: BroadcastChannel | null = null
  private nextUserRecoveryAt: number = 0
  private sessionCheckPromise: Promise<void> | null = null
  private lastSessionCheckAt: number = 0

  constructor(
    config: AuthManagerConfig,
    storage: BasicStorage,
    notify: () => void,
  ) {
    this.config = config
    this.storage = storage
    this.notify = notify
    this.requestedScopes = config.scopes
    this.initCrossTabSync()
  }

  private initCrossTabSync(): void {
    if (typeof BroadcastChannel === 'undefined') return

    try {
      this.channel = new BroadcastChannel('basic-auth')
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'token_refreshed') {
          log('Received token refresh from another tab')
          void this.handleExternalTokenRefresh(event.data)
        }
        if (event.data?.type === 'signed_in') {
          log('Received sign-in from another tab, restoring session')
          void this.restoreStoredSession('cross-tab sign-in')
        }
        if (event.data?.type === 'signed_out') {
          log('Received sign-out from another tab')
          this.resetAuthState('signed_out')
          this.notify()
          // TODO: replace reload with proper cross-tab sync teardown so
          // other tabs can clean up without a full page reload.
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }
        if (event.data?.type === 'session_invalidated') {
          log('Received session invalidation from another tab')
          void this.markReauthRequired(event.data.code || 'invalid_grant', {
            broadcast: false,
          })
        }
      }
    } catch {
      log('BroadcastChannel not available for cross-tab sync')
    }
  }

  private broadcastTokenRefresh(): void {
    this.channel?.postMessage({
      type: 'token_refreshed',
      accessToken: this.token?.access_token,
      did: this.did,
      tokenScope: this.tokenScope,
    })
  }

  private broadcastSignIn(): void {
    this.channel?.postMessage({ type: 'signed_in' })
  }

  private broadcastSignOut(): void {
    this.channel?.postMessage({ type: 'signed_out' })
  }

  private broadcastSessionInvalidated(code: string): void {
    this.channel?.postMessage({ type: 'session_invalidated', code })
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Bootstrap auth: handle OAuth callback (?code=), restore session
   * from refresh token, or load cached user for offline mode.
   */
  async initialize(): Promise<void> {
    this.updateAuthStatus('bootstrapping')
    await this.storage.set(
      STORAGE_KEYS.DEBUG,
      this.config.debug ? 'true' : 'false',
    )

    const storedServerUrl = await this.storage.get(STORAGE_KEYS.SERVER_URL)
    if (storedServerUrl && storedServerUrl !== this.config.pdsUrl) {
      log('PDS URL changed, clearing stored tokens')
      await this.clearStoredAuth()
    }
    await this.storage.set(STORAGE_KEYS.SERVER_URL, this.config.pdsUrl)

    try {
      const params = new URLSearchParams(window.location.search)

      if (params.has('code')) {
        const code = params.get('code')
        if (!code) {
          this.updateAuthStatus('signed_out')
          this.notify()
          return
        }

        const state = await this.storage.get(STORAGE_KEYS.AUTH_STATE)
        const urlState = params.get('state')
        if (!state || state !== urlState) {
          log('error: auth state does not match')
          this.updateAuthStatus('signed_out')
          this.notify()
          await this.storage.remove(STORAGE_KEYS.AUTH_STATE)
          cleanOAuthParamsFromUrl()
          return
        }

        await this.storage.remove(STORAGE_KEYS.AUTH_STATE)
        cleanOAuthParamsFromUrl()

        this.freshSignIn = true
        this.exchangeToken(code, false).catch((error) => {
          log('Error fetching token:', error)
          this.freshSignIn = false
          void this.restoreCachedUser({
            hasRecoverableSession: !this.isDefinitiveAuthFailure(error),
          })
        })
      } else {
        await this.restoreStoredSession('initialize')
      }
    } catch (e) {
      log('error getting token', e)
      this.updateAuthStatus('signed_out')
      this.notify()
    }
  }

  /**
   * Get a valid access token string. Refreshes proactively (5s buffer)
   * or on demand (forceRefresh). Mutex prevents concurrent refreshes.
   */
  async getToken(options?: GetTokenOptions): Promise<string> {
    log('getting token...')

    if (!this.token) {
      const refreshToken = await this.getRefreshToken()
      if (refreshToken) {
        log('No token in memory, attempting to refresh from storage')

        if (this.refreshPromise) {
          log('Token refresh already in progress, waiting...')
          try {
            const newToken = await this.refreshPromise
            if (newToken?.access_token) {
              return newToken.access_token
            }
          } catch (error) {
            log('In-flight refresh failed:', error)
            throw error
          }
        }

        try {
          const newToken = await this.exchangeToken(refreshToken, true)
          if (newToken?.access_token) {
            return newToken.access_token
          }
        } catch (error) {
          log('Failed to refresh token from storage:', error)
          if (this.isNetworkError(error)) {
            throw new Error(
              'Network offline - authentication will be retried when online',
            )
          }
          if (!this.isDefinitiveAuthFailure(error)) {
            throw error
          }
          throw new Error('Authentication expired. Please sign in again.')
        }
      }
      log('no token found')
      throw new Error('no token found')
    }

    const decoded = jwtDecode<JwtClaims>(this.token.access_token)
    const expirationBuffer = 5
    const isExpired =
      decoded.exp && decoded.exp < Date.now() / 1000 + expirationBuffer
    const shouldRefresh = isExpired || options?.forceRefresh === true

    if (shouldRefresh) {
      log(
        options?.forceRefresh
          ? 'force refreshing token...'
          : 'token is expired - refreshing ...',
      )

      if (this.refreshPromise) {
        log('Token refresh already in progress, waiting...')
        try {
          const newToken = await this.refreshPromise
          if (!newToken?.access_token)
            throw new Error('Token refresh returned empty access token')
          return newToken.access_token
        } catch (error) {
          log('In-flight refresh failed:', error)
          if (this.isNetworkError(error)) {
            log('Network issue - using expired token until network is restored')
            return this.token.access_token
          }
          throw error
        }
      }

      const refreshToken = await this.getRefreshToken()
      if (refreshToken) {
        try {
          const newToken = await this.exchangeToken(refreshToken, true)
          if (!newToken?.access_token)
            throw new Error('Token refresh returned empty access token')
          return newToken.access_token
        } catch (error) {
          log('Failed to refresh expired token:', error)
          if (this.isNetworkError(error)) {
            log('Network issue - using expired token until network is restored')
            return this.token.access_token
          }
          if (!this.isDefinitiveAuthFailure(error)) {
            throw error
          }
          throw new Error('Authentication expired. Please sign in again.')
        }
      } else {
        throw new Error('no refresh token available')
      }
    }

    if (!this.token.access_token)
      throw new Error('Token exists but access_token is empty')
    return this.token.access_token
  }

  async getSignInUrl(
    redirectUri?: string,
    endpoints?: PdsEndpoints,
  ): Promise<string> {
    log('getting sign in link...')

    if (!this.config.projectId) {
      throw new Error('Project ID is required to generate sign-in link')
    }

    const pdsEndpoints = endpoints || this.defaultPdsEndpoints()
    await this.storage.set(
      STORAGE_KEYS.PDS_ENDPOINTS,
      JSON.stringify(pdsEndpoints),
    )

    const randomState = base64UrlEncode(
      crypto.getRandomValues(new Uint8Array(16)),
    )
    await this.storage.set(STORAGE_KEYS.AUTH_STATE, randomState)

    const redirectUrl = redirectUri || window.location.href
    if (
      !redirectUrl ||
      (!redirectUrl.startsWith('http://') &&
        !redirectUrl.startsWith('https://'))
    ) {
      throw new Error('Invalid redirect URI provided')
    }

    await this.storage.set(STORAGE_KEYS.REDIRECT_URI, redirectUrl)
    log('Stored redirect_uri for token exchange:', redirectUrl)

    // PKCE: generate code_verifier and code_challenge (RFC 7636)
    const codeVerifier = generateCodeVerifier()
    const { challenge: codeChallenge, method: challengeMethod } =
      await generateCodeChallenge(codeVerifier)
    await this.storage.set(STORAGE_KEYS.CODE_VERIFIER, codeVerifier)

    let baseUrl = pdsEndpoints.authorization_endpoint
    baseUrl += `?client_id=${encodeURIComponent(normalizeClientId(this.config.projectId, this.adminHostname))}`
    baseUrl += `&redirect_uri=${encodeURIComponent(redirectUrl)}`
    baseUrl += `&response_type=code`
    baseUrl += `&scope=${encodeURIComponent(this.config.scopes)}`
    baseUrl += `&state=${randomState}`
    baseUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}`
    baseUrl += `&code_challenge_method=${challengeMethod}`

    log('Generated sign-in link successfully with scopes:', this.config.scopes)
    return baseUrl
  }

  async signIn(redirectUri?: string): Promise<void> {
    log('signing in...')

    if (!this.config.projectId) {
      log('Error: project_id is required for sign-in')
      throw new Error('Project ID is required for authentication')
    }

    const signInLink = await this.getSignInUrl(redirectUri)
    log('Generated sign-in link:', signInLink)

    try {
      new URL(signInLink)
    } catch {
      log('Error: Invalid sign-in link generated')
      throw new Error('Failed to generate valid sign-in URL')
    }

    window.location.href = signInLink
  }

  async signInWithHandle(handle: string): Promise<void> {
    log('signing in with handle:', handle)

    if (!this.config.projectId) {
      throw new Error('Project ID is required for authentication')
    }

    const resolved = await resolveHandle(handle)
    log('Resolved handle to PDS:', resolved.pdsUrl)

    const endpoints: PdsEndpoints = {
      pds_url: resolved.pdsUrl,
      authorization_endpoint: resolved.authorization_endpoint,
      token_endpoint: resolved.token_endpoint,
      userinfo_endpoint: resolved.userinfo_endpoint,
    }

    const signInLink = await this.getSignInUrl(undefined, endpoints)
    log('Generated federated sign-in link:', signInLink)

    try {
      new URL(signInLink)
    } catch {
      throw new Error('Failed to generate valid sign-in URL')
    }

    window.location.href = signInLink
  }

  async signInWithCode(code: string, state?: string): Promise<AuthResult> {
    try {
      log('signInWithCode called with code:', code)

      if (!code || typeof code !== 'string') {
        return { success: false, error: 'Invalid authorization code' }
      }

      if (state) {
        const storedState = await this.storage.get(STORAGE_KEYS.AUTH_STATE)
        if (storedState && storedState !== state) {
          log('State parameter mismatch:', {
            provided: state,
            stored: storedState,
          })
          return { success: false, error: 'State parameter mismatch' }
        }
      }

      await this.storage.remove(STORAGE_KEYS.AUTH_STATE)
      cleanOAuthParamsFromUrl()

      this.freshSignIn = true
      const token = await this.exchangeToken(code, false)
      if (token) {
        log('signInWithCode successful')
        return { success: true }
      } else {
        return { success: false, error: 'Failed to exchange code for token' }
      }
    } catch (error) {
      log('signInWithCode error:', error)
      this.freshSignIn = false
      return {
        success: false,
        error: (error as Error).message || 'Authentication failed',
      }
    }
  }

  /**
   * Clear auth state and storage. Does NOT handle sync/DB cleanup —
   * the UI layer (BasicProvider) wraps this to add sync teardown.
   */
  async signOut(): Promise<void> {
    log('signing out!')
    this.resetAuthState('signed_out')

    await this.storage.remove(STORAGE_KEYS.AUTH_STATE)
    await this.storage.remove(STORAGE_KEYS.LAST_CONNECT_REPORT)
    await this.clearStoredAuth()

    this.broadcastSignOut()
    this.notify()
  }

  async reconcileSession(
    reason: string = 'manual',
    options?: { forceRefresh?: boolean; throttleMs?: number },
  ): Promise<void> {
    if (this.authStatus === 'signed_out' || this.authStatus === 'reauth_required') {
      return
    }

    if (!this.isOnline) {
      this.updateAuthStatus('recovering', this.authErrorCode)
      this.notify()
      return
    }

    const throttleMs = options?.throttleMs ?? SESSION_RECONCILE_THROTTLE_MS
    const forceRefresh = options?.forceRefresh === true
    const now = Date.now()

    if (this.sessionCheckPromise) {
      return this.sessionCheckPromise
    }

    if (!forceRefresh && now - this.lastSessionCheckAt < throttleMs) {
      return
    }

    this.lastSessionCheckAt = now

    let sessionCheck: Promise<void> | null = null
    sessionCheck = (async () => {
      try {
        const accessToken = await this.getToken(
          forceRefresh ? { forceRefresh: true } : undefined,
        )
        const currentSession = await this.fetchCurrentSession(accessToken)
        if (currentSession?.active) {
          this.updateAuthStatus('authenticated')
          this.notify()
          if (!this.user) {
            await this.recoverMissingUserProfile(reason, accessToken)
          }
        }
      } catch (error) {
        log(`Session reconciliation failed on ${reason}:`, error)
        if (this.isDefinitiveAuthFailure(error)) {
          return
        }
        if (this.isNetworkError(error)) {
          this.updateAuthStatus('recovering', this.authErrorCode)
          this.notify()
        }
      } finally {
        if (this.sessionCheckPromise === sessionCheck) {
          this.sessionCheckPromise = null
        }
      }
    })()

    this.sessionCheckPromise = sessionCheck
    return sessionCheck
  }

  hasScope(scope: string): boolean {
    if (!this.tokenScope) return false
    return this.tokenScope
      .split(/[\s,]+/)
      .filter(Boolean)
      .includes(scope)
  }

  /**
   * Returns scopes that were requested but not granted in the current token.
   * Useful after login or when a 403 is returned.
   */
  missingScopes(): string[] {
    const requested = this.requestedScopes.split(/[\s,]+/).filter(Boolean)
    if (!this.tokenScope) return requested
    const granted = new Set(this.tokenScope.split(/[\s,]+/).filter(Boolean))
    return requested.filter((s) => !granted.has(s))
  }

  /**
   * Register online/offline and visibility handlers that retry pending
   * refreshes and proactively refresh tokens when the app resumes from
   * background (critical for PWAs and mobile browsers where timers are
   * frozen while backgrounded).
   * Returns a cleanup function for useEffect teardown.
   */
  setupNetworkListeners(): () => void {
    const handleOnline = async () => {
      log('Network came back online')
      this.isOnline = true
      if (this.pendingRefresh) {
        log('Retrying pending token refresh')
        this.pendingRefresh = false
        const refreshToken = await this.getRefreshToken()
        if (refreshToken) {
          this.exchangeToken(refreshToken, true).catch((error) => {
            log('Retry refresh failed:', error)
          })
        }
      }
      if (this.isSignedIn) {
        this.reconcileSession('online event', {
          forceRefresh: true,
          throttleMs: 0,
        }).catch((error) => {
          log('Session reconciliation on online failed:', error)
        })
      } else if (this.user) {
        await this.restoreStoredSession('online restore')
      }
    }

    const handleOffline = () => {
      log('Network went offline')
      this.isOnline = false
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.isSignedIn) {
        log('App became visible - reconciling auth session')
        this.reconcileSession('visibility resume', {
          forceRefresh: true,
        }).catch((err) => {
          log('Session reconciliation on visibility resume failed:', err)
        })
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }

  // ------------------------------------------------------------------
  // Private
  // ------------------------------------------------------------------

  private get adminHostname(): string {
    try {
      return new URL(this.config.adminUrl).hostname
    } catch {
      return 'api.basic.tech'
    }
  }

  private defaultPdsEndpoints(): PdsEndpoints {
    return {
      pds_url: this.config.pdsUrl,
      authorization_endpoint: `${this.config.pdsUrl}/auth/authorize`,
      token_endpoint: `${this.config.pdsUrl}/auth/token`,
      userinfo_endpoint: `${this.config.pdsUrl}/auth/userinfo`,
    }
  }

  private async getActivePdsEndpoints(): Promise<PdsEndpoints> {
    const stored = await this.storage.get(STORAGE_KEYS.PDS_ENDPOINTS)
    if (stored) {
      try {
        return JSON.parse(stored) as PdsEndpoints
      } catch {
        /* fall through */
      }
    }
    return this.defaultPdsEndpoints()
  }

  private async reportConnection(accessToken: string): Promise<void> {
    if (!this.config.projectId || !this.config.adminUrl) return
    const lastReport = await this.storage.get(STORAGE_KEYS.LAST_CONNECT_REPORT)
    if (lastReport) {
      const elapsed = Date.now() - parseInt(lastReport, 10)
      if (elapsed < 24 * 60 * 60 * 1000) return
    }
    try {
      await fetch(
        `${this.config.adminUrl}/project/${this.config.projectId}/user/connect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: accessToken }),
        },
      )
      await this.storage.set(
        STORAGE_KEYS.LAST_CONNECT_REPORT,
        Date.now().toString(),
      )
      log('Reported connection to admin server')
    } catch (err) {
      log('Failed to report connection (non-blocking):', err)
    }
  }

  /**
   * After a new token is stored, decode JWT claims and fetch user info.
   */
  private async processNewToken(): Promise<void> {
    if (!this.token) {
      this.updateAuthStatus('signed_out')
      this.notify()
      return
    }

    try {
      const decoded = jwtDecode<JwtClaims>(this.token.access_token)
      this.applyTokenClaims(decoded)
      this.updateAuthStatus('authenticated')
      this.notify()
      this.broadcastSessionUpdate()
      await this.fetchUser(this.token.access_token)
    } catch (error) {
      log('Error processing token:', error)
      this.updateAuthStatus('recovering')
      this.notify()
    }
  }

  private async restoreCachedUser(options?: {
    hasRecoverableSession: boolean
  }): Promise<void> {
    const cached = await this.storage.get(STORAGE_KEYS.USER_INFO)
    if (cached && options?.hasRecoverableSession) {
      try {
        this.user = JSON.parse(cached)
        log('Restored cached user info for recoverable session')
      } catch {
        /* corrupted cache, ignore */
      }
    } else {
      this.user = null
    }
    this.updateAuthStatus(
      options?.hasRecoverableSession ? 'recovering' : 'signed_out',
    )
    this.notify()
  }

  private async fetchUser(accessToken: string): Promise<void> {
    log('fetching user')
    try {
      const endpoints = await this.getActivePdsEndpoints()
      const response = await fetch(endpoints.userinfo_endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`)
      }

      const user = await response.json()

      if (user.error) {
        log('error fetching user', user.error)
        throw new Error(`User info error: ${user.error}`)
      }

      if (this.token?.refresh_token) {
        await this.storage.set(
          STORAGE_KEYS.REFRESH_TOKEN,
          this.token.refresh_token,
        )
      }

      await this.storage.set(STORAGE_KEYS.USER_INFO, JSON.stringify(user))
      log('Cached user info in storage')

      this.user = user
      if (this.authStatus !== 'reauth_required') {
        this.updateAuthStatus('authenticated')
      }
      this.nextUserRecoveryAt = 0
      this.notify()
    } catch (error) {
      log('Failed to fetch user info:', error)
      await this.handleUserFetchFailure()
    }
  }

  /**
   * Exchange an auth code or refresh token for an access token.
   * Handles mutex (one in-flight refresh), token validation, and
   * triggers processNewToken on success.
   */
  private async exchangeToken(
    codeOrRefreshToken: string,
    isRefreshToken: boolean,
  ): Promise<Token | null> {
    if (!codeOrRefreshToken || codeOrRefreshToken.trim() === '') {
      const errorMsg = isRefreshToken
        ? 'Refresh token is empty or undefined'
        : 'Authorization code is empty or undefined'
      log('Error:', errorMsg)
      throw new Error(errorMsg)
    }

    if (isRefreshToken && this.refreshPromise) {
      log('Reusing in-flight refresh token request')
      return this.refreshPromise
    }

    if (!isRefreshToken && this.codeExchangePromise) {
      log('Reusing in-flight code exchange request')
      return this.codeExchangePromise
    }

    const tokenPromise = (async (): Promise<Token | null> => {
      try {
        if (!this.isOnline) {
          log('Network is offline, marking refresh as pending')
          this.pendingRefresh = true
          throw new Error(
            'Network offline - refresh will be retried when online',
          )
        }

        const endpoints = await this.getActivePdsEndpoints()
        let requestBody: any

        if (isRefreshToken) {
          requestBody = {
            grant_type: 'refresh_token',
            refresh_token: codeOrRefreshToken,
          }
          if (this.config.projectId) {
            requestBody.client_id = normalizeClientId(
              this.config.projectId,
              this.adminHostname,
            )
          }
        } else {
          requestBody = {
            grant_type: 'authorization_code',
            code: codeOrRefreshToken,
          }

          const storedRedirectUri = await this.storage.get(
            STORAGE_KEYS.REDIRECT_URI,
          )
          if (storedRedirectUri) {
            requestBody.redirect_uri = storedRedirectUri
            log('Including redirect_uri in token exchange:', storedRedirectUri)
          } else {
            log('Warning: No redirect_uri found in storage for token exchange')
          }

          // PKCE: include code_verifier from the authorization request
          const codeVerifier = await this.storage.get(
            STORAGE_KEYS.CODE_VERIFIER,
          )
          if (codeVerifier) {
            requestBody.code_verifier = codeVerifier
          }

          if (this.config.projectId) {
            requestBody.client_id = normalizeClientId(
              this.config.projectId,
              this.adminHostname,
            )
          }
        }

        log('Token exchange request body:', {
          ...requestBody,
          ...(isRefreshToken
            ? { refresh_token: '[REDACTED]' }
            : { code: '[REDACTED]' }),
          ...(requestBody.code_verifier ? { code_verifier: '[REDACTED]' } : {}),
        })

        const token = await fetch(endpoints.token_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
          .then((response) => response.json())
          .catch((error) => {
            log('Network error fetching token:', error)
            if (!this.isOnline) {
              this.pendingRefresh = true
              throw new Error(
                'Network offline - refresh will be retried when online',
              )
            }
            throw new Error('Network error during token refresh')
          })

        if (token.access_token) {
          try {
            const decoded = jwtDecode<{ typ?: string }>(token.access_token)
            if (decoded.typ === 'refresh') {
              log('Error: received refresh token as access token')
              throw new Error(
                'Invalid token: received refresh token instead of access token',
              )
            }
          } catch (decodeError) {
            if ((decodeError as Error).message.includes('Invalid token')) {
              throw decodeError
            }
            log(
              'Warning: could not decode access token for type check:',
              decodeError,
            )
          }
        }

        if (token.error) {
          log('error fetching token', token.error)

          if (
            typeof token.error === 'string' &&
            (token.error.includes('network') || token.error.includes('timeout'))
          ) {
            this.pendingRefresh = true
            throw new Error(
              'Network issue - refresh will be retried when online',
            )
          }

          // Only clear stored auth on definitive OAuth rejection.
          // Transient server errors (500, 503, etc.) should NOT wipe
          // the refresh token — the user can retry later.
          if (this.isDefinitiveTokenErrorCode(token.error)) {
            await this.markReauthRequired(token.error)
            throw new DefinitiveAuthError(token.error)
          }
          throw new Error(`Token refresh failed: ${token.error}`)
        } else {
          if (!token.access_token) {
            throw new Error('Token response missing access token')
          }
          this.token = token
          this.pendingRefresh = false

          if (token.refresh_token) {
            await this.storage.set(
              STORAGE_KEYS.REFRESH_TOKEN,
              token.refresh_token,
            )
            log('Updated refresh token in storage')
          }

          if (!isRefreshToken) {
            await this.storage.remove(STORAGE_KEYS.REDIRECT_URI)
            await this.storage.remove(STORAGE_KEYS.CODE_VERIFIER)
            log(
              'Cleaned up redirect_uri and code_verifier from storage after successful exchange',
            )
          }

          this.reportConnection(token.access_token).catch(() => {})

          await this.processNewToken()
        }

        return token
      } catch (error) {
        log('Token refresh error:', error)
        if (this.isDefinitiveAuthFailure(error)) {
          log('Preserving cleared auth state after definitive token rejection')
        } else if (this.isNetworkError(error)) {
          log('Recoverable network auth failure - preserving session state')
        } else {
          log('Recoverable auth failure - preserving session state')
        }

        throw error
      }
    })()

    if (isRefreshToken) {
      this.refreshPromise = tokenPromise
      tokenPromise.finally(() => {
        if (this.refreshPromise === tokenPromise) {
          this.refreshPromise = null
          log('Cleared refresh promise reference')
        }
      })
    } else {
      this.codeExchangePromise = tokenPromise
      tokenPromise.finally(() => {
        if (this.codeExchangePromise === tokenPromise) {
          this.codeExchangePromise = null
          log('Cleared code exchange promise reference')
        }
      })
    }

    return tokenPromise
  }

  private resetAuthState(status: AuthStatus = 'signed_out'): void {
    this.user = status === 'reauth_required' ? this.user : null
    this.token = null
    if (status !== 'reauth_required') {
      this.did = null
    }
    this.tokenScope = null
    this.nextUserRecoveryAt = 0
    this.updateAuthStatus(status)
  }

  private async clearStoredAuth(): Promise<void> {
    await this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
    await this.storage.remove(STORAGE_KEYS.USER_INFO)
    await this.storage.remove(STORAGE_KEYS.REDIRECT_URI)
    await this.storage.remove(STORAGE_KEYS.CODE_VERIFIER)
    await this.storage.remove(STORAGE_KEYS.SERVER_URL)
    await this.storage.remove(STORAGE_KEYS.PDS_ENDPOINTS)
  }

  private isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) return true
    if (error instanceof Error) {
      return (
        error.message.includes('offline') || error.message.includes('Network')
      )
    }
    return false
  }

  private async getRefreshToken(): Promise<string | null> {
    const storedRefreshToken = await this.storage.get(
      STORAGE_KEYS.REFRESH_TOKEN,
    )
    if (storedRefreshToken) {
      log('Using refresh token from storage')
      if (this.token && this.token.refresh_token !== storedRefreshToken) {
        this.token = { ...this.token, refresh_token: storedRefreshToken }
      }
      return storedRefreshToken
    }

    const memoryRefreshToken = this.token?.refresh_token ?? null
    if (memoryRefreshToken) {
      log('Using refresh token from memory fallback')
    } else {
      log('No refresh token available in storage or memory')
    }
    return memoryRefreshToken
  }

  private async syncRefreshTokenFromStorage(): Promise<void> {
    const storedRefreshToken = await this.storage.get(
      STORAGE_KEYS.REFRESH_TOKEN,
    )
    if (
      storedRefreshToken &&
      this.token &&
      this.token.refresh_token !== storedRefreshToken
    ) {
      this.token = { ...this.token, refresh_token: storedRefreshToken }
      log('Synced refresh token from shared storage into memory')
    }
  }

  private applyTokenClaims(decoded: JwtClaims): void {
    this.did = decoded.sub || null
    this.tokenScope = decoded.scope || null
  }

  private broadcastSessionUpdate(): void {
    if (this.freshSignIn) {
      this.freshSignIn = false
      this.broadcastSignIn()
    } else {
      this.broadcastTokenRefresh()
    }
  }

  private async handleUserFetchFailure(): Promise<void> {
    if (this.isCompatibleUser(this.user)) {
      log('Preserving existing user after userinfo failure')
    } else if (this.user) {
      log('Discarding stale in-memory user after userinfo failure')
      this.user = null
    }

    if (!this.user) {
      const cached = await this.storage.get(STORAGE_KEYS.USER_INFO)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as User
          if (this.isCompatibleUser(parsed)) {
            this.user = parsed
            log('Recovered cached user after userinfo failure')
          } else {
            log('Cached user did not match the active session')
          }
        } catch (error) {
          log('Failed to parse cached user after userinfo failure:', error)
        }
      }
    }

    if (!this.user) {
      log('No compatible cached user available after userinfo failure')
      this.nextUserRecoveryAt = Date.now() + USER_RECOVERY_RETRY_COOLDOWN_MS
    } else {
      this.nextUserRecoveryAt = 0
    }

    if (this.authStatus === 'bootstrapping') {
      this.updateAuthStatus(this.token ? 'authenticated' : 'recovering')
    }
    this.notify()
  }

  private isCompatibleUser(user: User | null): boolean {
    if (!user) return false
    if (!this.did) return true
    return user.sub === this.did
  }

  private async recoverMissingUserProfile(
    reason: string,
    accessToken?: string,
  ): Promise<void> {
    if (!this.isSignedIn || this.user) return
    const now = Date.now()
    if (this.nextUserRecoveryAt > now) {
      log(
        `Skipping user profile recovery on ${reason} until ${new Date(this.nextUserRecoveryAt).toISOString()}`,
      )
      return
    }
    log(`Attempting user profile recovery on ${reason}`)
    const token = accessToken ?? (await this.getToken())
    if (this.user) return
    await this.fetchUser(token)
  }

  private isDefinitiveTokenErrorCode(code: unknown): code is string {
    return typeof code === 'string' && DEFINITIVE_TOKEN_ERRORS.has(code)
  }

  private isDefinitiveAuthFailure(error: unknown): boolean {
    return error instanceof DefinitiveAuthError
  }

  /**
   * Centralised auth status setter. Derives `isSignedIn` and `isAuthReady`
   * from the status so they stay consistent.
   *
   * `isSignedIn` is intentionally `true` during `reauth_required` so the
   * UI layer can still display user info while prompting re-authentication.
   * Consumers should check `authStatus` (or a future convenience getter)
   * when they need to distinguish "healthy session" from "needs re-auth".
   */
  private updateAuthStatus(
    status: AuthStatus,
    errorCode: string | null = null,
  ): void {
    this.authStatus = status
    this.authErrorCode = errorCode
    this.isSignedIn =
      status === 'authenticated' ||
      status === 'recovering' ||
      status === 'reauth_required'
    this.isAuthReady = status !== 'bootstrapping'
  }

  private async clearStoredSessionTokens(): Promise<void> {
    await this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
    await this.storage.remove(STORAGE_KEYS.REDIRECT_URI)
    await this.storage.remove(STORAGE_KEYS.CODE_VERIFIER)
  }

  private async restoreStoredSession(reason: string): Promise<void> {
    const refreshToken = await this.getRefreshToken()
    if (!refreshToken) {
      log(`No stored refresh token available during ${reason}`)
      await this.restoreCachedUser({ hasRecoverableSession: false })
      return
    }

    log(`Restoring stored session during ${reason}`)
    await this.restoreCachedUser({ hasRecoverableSession: true })

    if (!this.isOnline) {
      return
    }

    this.exchangeToken(refreshToken, true).catch(async (error) => {
      log(`Stored session refresh failed during ${reason}:`, error)
      if (this.isDefinitiveAuthFailure(error)) {
        return
      }
      await this.restoreCachedUser({ hasRecoverableSession: true })
    })
  }

  private async handleExternalTokenRefresh(data: {
    accessToken?: string
    did?: string
    tokenScope?: string
  }): Promise<void> {
    await this.syncRefreshTokenFromStorage()
    const refreshToken = await this.getRefreshToken()
    if (data.accessToken && refreshToken) {
      try {
        const decoded = jwtDecode<JwtClaims>(data.accessToken)
        const expiresIn =
          decoded.exp != null
            ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
            : 0
        this.token = {
          access_token: data.accessToken,
          token_type: 'Bearer',
          expires_in: expiresIn,
          refresh_token: refreshToken,
        }
        this.applyTokenClaims(decoded)
      } catch (error) {
        log('Failed to decode token refreshed by another tab:', error)
        this.token = {
          access_token: data.accessToken,
          token_type: 'Bearer',
          expires_in: 0,
          refresh_token: refreshToken,
        }
      }
      if (this.authStatus !== 'reauth_required') {
        this.updateAuthStatus('authenticated')
      }
    } else if (refreshToken) {
      await this.restoreCachedUser({ hasRecoverableSession: true })
    }

    if (data.did) this.did = data.did
    if (data.tokenScope) this.tokenScope = data.tokenScope
    this.notify()
  }

  private async fetchCurrentSession(
    accessToken: string,
  ): Promise<CurrentSessionInfo | null> {
    const endpoints = await this.getActivePdsEndpoints()
    const response = await fetch(`${endpoints.pds_url}/auth/session`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = (await response.json().catch(() => ({}))) as CurrentSessionInfo

    if (response.status === 401 && data.reauth_required) {
      await this.markReauthRequired(data.error || 'invalid_session')
      throw new DefinitiveAuthError(data.error || 'invalid_session')
    }

    if (!response.ok) {
      throw new Error(`Failed to reconcile session: ${response.status}`)
    }

    return data
  }

  private async markReauthRequired(
    code: string,
    options?: { broadcast?: boolean },
  ): Promise<void> {
    log('Marking auth session as requiring reauthentication:', code)
    await this.clearStoredSessionTokens()
    if (!this.user) {
      const cached = await this.storage.get(STORAGE_KEYS.USER_INFO)
      if (cached) {
        try {
          this.user = JSON.parse(cached)
        } catch {
          /* ignore corrupted cache */
        }
      }
    }
    this.token = null
    this.tokenScope = null
    this.nextUserRecoveryAt = 0
    this.updateAuthStatus('reauth_required', code)
    if (options?.broadcast !== false) {
      this.broadcastSessionInvalidated(code)
    }
    this.notify()
  }
}
