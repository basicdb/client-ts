import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

import { useBasic, useQuery, DBMode, STORAGE_KEYS, resolveDid, resolveHandle, type ResolvedDid } from "@basictech/react"
import { version as sdkVersion } from "@basictech/react/package.json"

// Random name generator
const adjectives = [
  "abandoned", "acoustic", "adorable", "ancient", "bitter", "black", "blue", "brave", "breezy",
  "bright", "broken", "brown", "calm", "chilly", "clever", "cold", "cool", "crooked", "curved",
  "damp", "dazzling", "deep", "elegant", "faint", "fancy", "fast", "fierce", "flat", "fluffy",
  "freezing", "fresh", "gentle", "gigantic", "golden", "gray", "green", "grumpy", "hollow", "hot",
  "huge", "icy", "jolly", "lazy", "little", "lively", "long", "loud", "melted", "modern", "narrow",
  "odd", "orange", "plain", "proud", "purple", "quick", "quiet", "rapid", "red", "rich", "rough",
  "round", "rusty", "salty", "sharp", "short", "shy", "silent", "slow", "small", "smooth", "steep",
  "sticky", "strong", "swift", "tall", "tangy", "tight", "tiny", "warm", "weak", "wet", "white",
  "wide", "wild", "wooden", "yellow", "young",
]
const nouns = [
  "alligator", "balloon", "banana", "bear", "bird", "book", "camera", "candle", "car", "carpet",
  "cat", "cloud", "crayon", "cricket", "crow", "diamond", "dog", "dolphin", "dragon", "dream",
  "eagle", "egg", "elephant", "engine", "falcon", "fish", "flower", "forest", "fountain", "fox",
  "ghost", "guitar", "hammer", "hawk", "helmet", "horse", "insect", "island", "jackal", "kangaroo",
  "kite", "lamp", "lantern", "leopard", "lion", "lizard", "machine", "monkey", "moon", "mouse",
  "needle", "nest", "notebook", "ocean", "owl", "oyster", "parrot", "pencil", "piano", "pillow",
  "planet", "rabbit", "rainbow", "raven", "river", "rocket", "rose", "sail", "sandwich", "shadow",
  "sparrow", "spider", "stone", "storm", "sun", "table", "tiger", "train", "tree", "turtle",
  "umbrella", "vase", "vulture", "whale", "window", "wolf", "yak", "zebra",
]
const randomName = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}-${noun}-${num}`
}

// Helper to set dbMode in URL (triggers page reload)
const setDbModeInUrl = (mode: DBMode) => {
  const url = new URL(window.location.href)
  url.searchParams.set('dbMode', mode)
  window.location.href = url.toString()
}

// Types for the foo collection (matches schema)
interface FooItem {
  id: string
  name: string
  count: number
  is_done: boolean
  data?: Record<string, unknown>
}

interface QueryResult {
  type: 'get' | 'filter'
  data?: FooItem | FooItem[] | null
  error?: string
}

type StorageValues = Record<string, string | null>

// Event log types
interface LogEntry {
  id: number
  timestamp: number
  type: 'status' | 'operation' | 'network' | 'error'
  message: string
  detail?: string
  duration?: number
}

// Performance timing types
interface OpTiming {
  operation: string
  duration: number
  timestamp: number
  success: boolean
}

let logIdCounter = 0

function App() {
  const {
    db,
    dbStatus,
    dbMode,
    isReady,
    isSignedIn,
    user,
    did,
    scope,
    hasScope,
    signOut,
    signIn,
    signInWithCode,
    signInWithHandle,
    getToken,
    getSignInUrl
  } = useBasic()
  
  const [newFooItem, setNewFooItem] = useState({ name: '', count: 0, is_done: false })
  const [placeholder, setPlaceholder] = useState({ name: randomName(), count: Math.floor(Math.random() * 100) })
  const [authCode, setAuthCode] = useState('')
  const [authState, setAuthState] = useState('')
  const [remoteFooItems, setRemoteFooItems] = useState<FooItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [storageValues, setStorageValues] = useState<StorageValues>({})
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [queryId, setQueryId] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)
  const [expiryCountdown, setExpiryCountdown] = useState<string>('')
  const [scopeTestInput, setScopeTestInput] = useState('')
  const [scopeTestResult, setScopeTestResult] = useState<boolean | null>(null)
  const [handleInput, setHandleInput] = useState('')
  const [handleError, setHandleError] = useState<string | null>(null)
  const [isHandleLoading, setIsHandleLoading] = useState(false)
  const [resolveInput, setResolveInput] = useState('')
  const [resolveResult, setResolveResult] = useState<ResolvedDid | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  // Event log & performance state
  const [eventLog, setEventLog] = useState<LogEntry[]>([])
  const [opTimings, setOpTimings] = useState<OpTiming[]>([])
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const prevDbStatus = useRef(dbStatus)
  const statusChangeTime = useRef(performance.now())

  // Add entry to event log
  const addLog = useCallback((type: LogEntry['type'], message: string, detail?: string, duration?: number) => {
    setEventLog(prev => {
      const entry: LogEntry = { id: ++logIdCounter, timestamp: Date.now(), type, message, detail, duration }
      const next = [...prev, entry]
      return next.length > 200 ? next.slice(-200) : next
    })
  }, [])

  // Wrap a DB operation with timing
  const timed = useCallback(async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      const detail = Array.isArray(result) ? `${result.length} items` : result === null ? 'null' : 'ok'
      addLog('operation', `${name}`, detail, duration)
      setOpTimings(prev => {
        const next = [...prev, { operation: name, duration, timestamp: Date.now(), success: true }]
        return next.length > 50 ? next.slice(-50) : next
      })
      return result
    } catch (error) {
      const duration = performance.now() - start
      addLog('error', `${name} failed`, error instanceof Error ? error.message : String(error), duration)
      setOpTimings(prev => {
        const next = [...prev, { operation: name, duration, timestamp: Date.now(), success: false }]
        return next.length > 50 ? next.slice(-50) : next
      })
      throw error
    }
  }, [addLog])

  // Track dbStatus changes with timing
  useEffect(() => {
    if (dbStatus !== prevDbStatus.current) {
      const now = performance.now()
      const duration = now - statusChangeTime.current
      const prev = prevDbStatus.current
      addLog('status', `${prev} → ${dbStatus}`, `${prev} lasted`, duration)
      setOpTimings(t => {
        const next = [...t, { operation: `sync: ${prev} → ${dbStatus}`, duration, timestamp: Date.now(), success: dbStatus !== 'ERROR' }]
        return next.length > 50 ? next.slice(-50) : next
      })
      prevDbStatus.current = dbStatus
      statusChangeTime.current = now
    }
  }, [dbStatus, addLog])

  // Track network online/offline
  useEffect(() => {
    const onOnline = () => { setIsOffline(false); addLog('network', 'Back online') }
    const onOffline = () => { setIsOffline(true); addLog('network', 'Went offline') }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [addLog])


  // Token expiry countdown
  useEffect(() => {
    if (!tokenExpiry) { setExpiryCountdown(''); return }
    const tick = () => {
      const remaining = tokenExpiry * 1000 - Date.now()
      if (remaining <= 0) { setExpiryCountdown('Expired'); return }
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setExpiryCountdown(`${mins}m ${secs}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tokenExpiry])

  // Simulate offline/online toggle
  const toggleOffline = () => {
    if (!isOffline) {
      addLog('network', 'Simulating offline (DevTools recommended for full simulation)')
      window.dispatchEvent(new Event('offline'))
    } else {
      addLog('network', 'Simulating online')
      window.dispatchEvent(new Event('online'))
    }
  }

  // Clear all local data (localStorage, IndexedDB, sessionStorage)
  const clearAllLocalData = async () => {
    if (!confirm('Clear all local data? This will remove localStorage, sessionStorage, and all IndexedDB databases, then reload.')) return
    localStorage.clear()
    sessionStorage.clear()
    if (window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases()
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name)
      }
    }
    addLog('operation', 'Cleared all local data')
    setTimeout(() => window.location.reload(), 300)
  }

  // Load storage values
  const refreshStorageValues = useCallback(() => {
    const values: StorageValues = {}
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      values[key] = localStorage.getItem(storageKey)
    })
    setStorageValues(values)
  }, [])

  // Load storage values on mount and when auth state changes
  useEffect(() => {
    refreshStorageValues()
  }, [isSignedIn, isReady, refreshStorageValues])

  // Auto-fetch token and pre-fill DID resolver on sign-in
  useEffect(() => {
    if (isSignedIn && !accessToken) {
      getToken().then((token) => {
        setAccessToken(token)
        const decoded = decodeToken(token)
        if (decoded?.exp) setTokenExpiry(decoded.exp)
        if (decoded?.sub && decoded.sub.startsWith('did:')) {
          setResolveInput(decoded.sub)
        }
      }).catch(() => {})
    }
    if (!isSignedIn) {
      setTokenExpiry(null)
      setAccessToken(null)
    }
  }, [isSignedIn])
  
  // For sync mode, use live query
  const syncFooItems = useQuery(() => dbMode === 'sync' ? db.collection('foo').getAll() : Promise.resolve([]))
  
  // Use sync items or remote items based on mode
  const fooItems = dbMode === 'sync' ? syncFooItems : remoteFooItems

  // Fetch data for remote mode
  const refreshFooItems = useCallback(async () => {
    if (dbMode !== 'remote') return
    setIsRefreshing(true)
    try {
      const items = await timed('foo.getAll()', () => db.collection<FooItem>('foo').getAll())
      setRemoteFooItems(items)
      console.log('foo.getAll() refreshed:', items)
    } catch (error) {
      console.error('foo.getAll() error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [db, dbMode, timed])

  // Auto-fetch on mount for remote mode
  useEffect(() => {
    if (dbMode === 'remote' && isReady) {
      refreshFooItems()
    }
  }, [dbMode, isReady, refreshFooItems])

  // Toggle dbMode (requires page reload since it's a provider prop)
  const toggleDbMode = () => {
    const newMode: DBMode = dbMode === 'sync' ? 'remote' : 'sync'
    setDbModeInUrl(newMode)
  }

  // Foo Collection Functions (matches schema: name, count, is_done, data)
  const addFooItem = async () => {
    try {
      const result = await timed('foo.add()', () => db.collection('foo').add({
        name: newFooItem.name || placeholder.name,
        count: newFooItem.count || placeholder.count,
        is_done: newFooItem.is_done,
        data: { created: Date.now() }
      }))
      console.log('foo.add() result:', result)
      setNewFooItem({ name: '', count: 0, is_done: false })
      setPlaceholder({ name: randomName(), count: Math.floor(Math.random() * 100) })
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.add() error:', error)
    }
  }

  const updateFooItem = async (id: string) => {
    try {
      const result = await timed('foo.update()', () => db.collection('foo').update(id, {
        count: Math.floor(Math.random() * 100),
        is_done: Math.random() > 0.5
      }))
      console.log('foo.update() result:', result)
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.update() error:', error)
    }
  }

  const deleteFooItem = async (id: string) => {
    try {
      const result = await timed('foo.delete()', () => db.collection('foo').delete(id))
      console.log('foo.delete() result:', result)
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.delete() error:', error)
    }
  }

  // Auth Functions (all timed + logged)
  const testGetSignInUrl = async () => {
    try {
      const url = await timed('getSignInUrl()', () => getSignInUrl())
      console.log('getSignInUrl() result:', url)
    } catch (error) {
      console.error('getSignInUrl() error:', error)
    }
  }

  const testGetToken = async () => {
    try {
      const token = await timed('getToken()', () => getToken())
      console.log('getToken() result:', token)
      setAccessToken(token)
      const decoded = decodeToken(token)
      if (decoded?.exp) setTokenExpiry(decoded.exp)
    } catch (error) {
      console.error('getToken() error:', error)
      setAccessToken(null)
      setTokenExpiry(null)
    }
  }

  const testSignIn = async () => {
    addLog('status', 'signIn() initiated')
    await signIn()
  }

  const testSignOut = async () => {
    const start = performance.now()
    await signOut()
    addLog('status', 'signOut()', 'ok', performance.now() - start)
    setAccessToken(null)
    setTokenExpiry(null)
  }

  const testSignInWithHandle = async () => {
    const handle = handleInput.trim()
    if (!handle) return
    setIsHandleLoading(true)
    setHandleError(null)
    try {
      addLog('status', `signInWithHandle("${handle}") initiated`)
      await signInWithHandle(handle)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setHandleError(msg)
      addLog('error', `signInWithHandle() failed`, msg)
    } finally {
      setIsHandleLoading(false)
    }
  }

  const testSignInWithCode = async () => {
    try {
      const result = await timed('signInWithCode()', () => signInWithCode(authCode, authState))
      console.log('signInWithCode() result:', result)
    } catch (error) {
      console.error('signInWithCode() error:', error)
    }
  }

  const testResolveDid = async () => {
    const input = resolveInput.trim()
    if (!input) return
    setIsResolving(true)
    setResolveError(null)
    setResolveResult(null)
    try {
      const result = input.startsWith('did:')
        ? await resolveDid(input)
        : await resolveHandle(input)
      setResolveResult(result)
      console.log('resolve result:', result)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setResolveError(msg)
      console.error('resolve error:', error)
    } finally {
      setIsResolving(false)
    }
  }

  // DB Query Functions
  const testGetById = async () => {
    if (!queryId.trim()) return
    try {
      const result = await timed('foo.get()', () => db.collection<FooItem>('foo').get(queryId.trim()))
      console.log('foo.get() result:', result)
      setQueryResult({ type: 'get', data: result })
    } catch (error) {
      console.error('foo.get() error:', error)
      setQueryResult({ type: 'get', error: String(error) })
    }
  }

  const testFilterDone = async () => {
    try {
      const result = await timed('foo.filter(done)', () => db.collection<FooItem>('foo').filter((item) => item.is_done === true))
      console.log('foo.filter(is_done=true) result:', result)
      setQueryResult({ type: 'filter', data: result })
    } catch (error) {
      console.error('foo.filter() error:', error)
      setQueryResult({ type: 'filter', error: String(error) })
    }
  }

  const testFilterNotDone = async () => {
    try {
      const result = await timed('foo.filter(!done)', () => db.collection<FooItem>('foo').filter((item) => item.is_done === false))
      console.log('foo.filter(is_done=false) result:', result)
      setQueryResult({ type: 'filter', data: result })
    } catch (error) {
      console.error('foo.filter() error:', error)
      setQueryResult({ type: 'filter', error: String(error) })
    }
  }

  // Decode JWT token for display
  const decodeToken = (token: string) => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1]))
      return payload
    } catch {
      return null
    }
  }

  // Format unix timestamp to readable date
  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000)
    return d.toLocaleString('en', { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const getStatusClass = () => {
    if (dbStatus === 'ONLINE') return 'connected'
    if (dbStatus === 'CONNECTING' || dbStatus === 'SYNCING') return 'connecting'
    return ''
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="header-title">@basictech/react <span className="header-version">v{sdkVersion}</span></span>
          <div className="status-badge">
            <span className={`status-dot ${getStatusClass()}`} />
            <span>{dbStatus}</span>
          </div>
        </div>
        <div className="header-right">
          {user?.email && <span className="user-email">{user.email}</span>}
          {isSignedIn ? (
            <button onClick={testSignOut}>Sign Out</button>
          ) : (
            <button className="primary" onClick={testSignIn}>Sign In</button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Left Column - Database */}
        <div className="column">
          <h2>Database</h2>
          
          {/* Mode & Network */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Mode & Network</span>
            </div>
            <div className="panel-body">
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${dbMode === 'sync' ? 'active' : ''}`}
                  onClick={() => dbMode !== 'sync' && toggleDbMode()}
                >
                  Sync
                </button>
                <button
                  className={`toggle-btn ${dbMode === 'remote' ? 'active' : ''}`}
                  onClick={() => dbMode !== 'remote' && toggleDbMode()}
                >
                  Remote
                </button>
              </div>
              <div className="status-grid" style={{ marginTop: 'var(--space-3)' }}>
                <div className="status-item">
                  <span className="status-label">dbStatus</span>
                  <span className={`status-value ${dbStatus === 'ONLINE' ? 'success' : dbStatus === 'ERROR' ? 'error' : 'pending'}`}>
                    {dbStatus}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Network</span>
                  <span className={`status-value ${isOffline ? 'error' : 'success'}`}>
                    {isOffline ? 'Offline' : 'Online'}
                  </span>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                <button
                  className={`small ${isOffline ? '' : 'danger'}`}
                  onClick={toggleOffline}
                  style={{ flex: 1 }}
                >
                  {isOffline ? 'Go Online' : 'Simulate Offline'}
                </button>
                <button
                  className="small danger"
                  onClick={clearAllLocalData}
                  style={{ flex: 1 }}
                >
                  Clear Local Data
                </button>
              </div>
            </div>
          </div>

          {/* Foo Collection - matches schema: name, count, is_done, data */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">foo</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fooItems?.length || 0} items
                </span>
                {dbMode === 'remote' && (
                  <button 
                    className="icon-btn small" 
                    onClick={refreshFooItems}
                    disabled={isRefreshing}
                    title="Refresh data"
                    style={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {isRefreshing ? '...' : '↻'}
                  </button>
                )}
              </div>
            </div>
            <div className="panel-body">
              <div className="form-row" style={{ marginBottom: 'var(--space-3)' }}>
                <input 
                  type="text" 
                  placeholder={placeholder.name}
                  value={newFooItem.name}
                  onChange={(e) => setNewFooItem(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addFooItem()}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  placeholder={String(placeholder.count)}
                  value={newFooItem.count || ''}
                  onChange={(e) => setNewFooItem(prev => ({ ...prev, count: Number(e.target.value) || 0 }))}
                  className="number-input"
                />
                <button
                  className={`icon-btn checkbox-btn ${newFooItem.is_done ? 'checked' : ''}`}
                  onClick={() => setNewFooItem(prev => ({ ...prev, is_done: !prev.is_done }))}
                  title={newFooItem.is_done ? 'Mark as not done' : 'Mark as done'}
                >
                  ✓
                </button>
                <button className="icon-btn primary" onClick={addFooItem} title="Add item">
                  +
                </button>
              </div>
              <div className="item-list-scroll">
              {fooItems?.length === 0 && (
                <div className="empty-state">No items</div>
              )}
              {fooItems?.map((item) => (
                <div key={item.id} className={`list-item-wrap ${expandedItems.has(item.id) ? 'expanded' : ''}`}>
                  <div className="list-item" onClick={() => setExpandedItems(prev => {
                    const next = new Set(prev)
                    next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                    return next
                  })}>
                    <div style={{ flex: 1 }}>
                      <div className="list-item-text">{item.name || '(no name)'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        count: {item.count} • done: {item.is_done ? '✓' : '✗'}
                      </div>
                    </div>
                    <span
                      className="list-item-id"
                      title="Click to copy full ID"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(item.id)
                        const el = e.currentTarget
                        el.textContent = 'copied!'
                        setTimeout(() => { el.textContent = item.id?.slice(0, 8) }, 1000)
                      }}
                    >
                      {item.id?.slice(0, 8)}
                    </span>
                    <div className="list-item-actions">
                      <button className="small" onClick={(e) => { e.stopPropagation(); updateFooItem(item.id) }}>Edit</button>
                      <button className="small danger" onClick={(e) => { e.stopPropagation(); deleteFooItem(item.id) }}>Del</button>
                    </div>
                  </div>
                  {expandedItems.has(item.id) && (
                    <pre className="list-item-json">{JSON.stringify(item, null, 2)}</pre>
                  )}
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* Query Testing */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Query Methods</span>
            </div>
            <div className="panel-body">
              {/* get(id) */}
              <div className="form-row" style={{ marginBottom: 'var(--space-2)' }}>
                <input 
                  type="text" 
                  placeholder="item id"
                  value={queryId}
                  onChange={(e) => setQueryId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && testGetById()}
                  style={{ flex: 1 }}
                />
                <button onClick={testGetById}>get(id)</button>
              </div>
              
              {/* filter() */}
              <div className="button-group" style={{ marginBottom: 'var(--space-3)' }}>
                <button onClick={testFilterDone}>filter(done)</button>
                <button onClick={testFilterNotDone}>filter(!done)</button>
              </div>

              {/* Query Result */}
              {queryResult && (
                <div className="query-result">
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {queryResult.type}() result:
                  </div>
                  {queryResult.error ? (
                    <div style={{ color: 'var(--accent-error)' }}>{queryResult.error}</div>
                  ) : queryResult.data === null ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null (not found)</div>
                  ) : Array.isArray(queryResult.data) ? (
                    <div>{queryResult.data.length} items found</div>
                  ) : (
                    <pre style={{ margin: 0, fontSize: 10, overflow: 'auto' }}>
                      {JSON.stringify(queryResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Performance */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Performance</span>
              <button
                className="icon-btn small"
                onClick={() => setOpTimings([])}
                title="Clear timings"
                style={{ width: 24, height: 24, fontSize: 12 }}
              >
                ×
              </button>
            </div>
            <div className="panel-body">
              {opTimings.length === 0 ? (
                <div className="empty-state">Run some operations to see timings</div>
              ) : (
                <>
                  <div className="perf-summary">
                    <div className="status-item">
                      <span className="status-label">Ops</span>
                      <span className="status-value">{opTimings.length}</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Avg</span>
                      <span className="status-value">
                        {(opTimings.reduce((s, t) => s + t.duration, 0) / opTimings.length).toFixed(1)}ms
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Min</span>
                      <span className="status-value success">
                        {Math.min(...opTimings.map(t => t.duration)).toFixed(1)}ms
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Max</span>
                      <span className="status-value error">
                        {Math.max(...opTimings.map(t => t.duration)).toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                  <div className="perf-list">
                    {opTimings.slice().reverse().map((t, i) => (
                      <div key={i} className="perf-entry">
                        <span className={`perf-dot ${t.success ? '' : 'error'}`} />
                        <span className="perf-op">{t.operation}</span>
                        <span className={`perf-duration ${t.duration > 1000 ? 'slow' : t.duration > 100 ? 'medium' : 'fast'}`}>
                          {t.duration.toFixed(1)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Event Log */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Event Log</span>
              <button
                className="icon-btn small"
                onClick={() => setEventLog([])}
                title="Clear log"
                style={{ width: 24, height: 24, fontSize: 12 }}
              >
                ×
              </button>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <div className="event-log">
                {eventLog.length === 0 && (
                  <div className="empty-state">No events yet</div>
                )}
                {eventLog.map((entry) => (
                  <div key={entry.id} className={`log-entry log-${entry.type}`}>
                    <span className="log-time">
                      {new Date(entry.timestamp).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions)}
                    </span>
                    <span className={`log-badge log-badge-${entry.type}`}>{entry.type}</span>
                    <span className="log-message">{entry.message}</span>
                    {entry.detail && <span className="log-detail">{entry.detail}</span>}
                    {entry.duration !== undefined && (
                      <span className={`log-duration ${entry.duration! > 1000 ? 'slow' : entry.duration! > 100 ? 'medium' : ''}`}>
                        {entry.duration.toFixed(1)}ms
                      </span>
                    )}
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Auth */}
        <div className="column">
          <h2>Authentication</h2>

          {/* Auth Status + Actions (merged) */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Status</span>
            </div>
            <div className="panel-body">
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">isReady</span>
                  <span className={`status-value ${isReady ? 'success' : 'pending'}`}>
                    {isReady ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">isSignedIn</span>
                  <span className={`status-value ${isSignedIn ? 'success' : 'error'}`}>
                    {isSignedIn ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              {user && (
                <div className="user-info" style={{ marginTop: 'var(--space-3)' }}>
                  <div className="user-info-row">
                    <span className="user-info-label">email</span>
                    <span>{user.email || '—'}</span>
                  </div>
                  <div className="user-info-row">
                    <span className="user-info-label">id</span>
                    <span>{user.sub}</span>
                  </div>
                  {did && (
                    <div className="user-info-row">
                      <span className="user-info-label">did</span>
                      <span style={{ fontSize: 10, wordBreak: 'break-all' }}>{did}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                {isSignedIn ? (
                  <button className="danger" onClick={testSignOut} style={{ flex: 1 }}>signOut()</button>
                ) : (
                  <button className="primary" onClick={testSignIn} style={{ flex: 1 }}>signIn()</button>
                )}
                <button onClick={testGetSignInUrl}>getSignInUrl()</button>
                <button onClick={testGetToken}>getToken()</button>
              </div>
            </div>
          </div>

          {/* Scopes */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Scopes</span>
            </div>
            <div className="panel-body">
              {scope ? (
                <div className="scope-badges">
                  {scope.split(/[,\s]+/).filter(Boolean).map(s => (
                    <span key={s} className="scope-badge">{s}</span>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No scopes</div>
              )}
              <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                <input
                  type="text"
                  placeholder="test a scope, e.g. profile"
                  value={scopeTestInput}
                  onChange={(e) => { setScopeTestInput(e.target.value); setScopeTestResult(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && scopeTestInput.trim() && setScopeTestResult(hasScope(scopeTestInput.trim()))}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => scopeTestInput.trim() && setScopeTestResult(hasScope(scopeTestInput.trim()))}
                  disabled={!scopeTestInput.trim()}
                >
                  hasScope()
                </button>
              </div>
              {scopeTestResult !== null && (
                <div style={{ fontSize: 11, marginTop: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>hasScope("{scopeTestInput}"):</span>{' '}
                  <span className={scopeTestResult ? 'status-value success' : 'status-value error'}>
                    {String(scopeTestResult)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Access Token */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Access Token</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {expiryCountdown && (
                  <span className={`token-countdown ${expiryCountdown === 'Expired' ? 'expired' : ''}`}>
                    {expiryCountdown}
                  </span>
                )}
                <button
                  className="icon-btn small"
                  onClick={testGetToken}
                  title="Refresh token"
                  style={{ width: 24, height: 24, fontSize: 12 }}
                >
                  ↻
                </button>
              </div>
            </div>
            <div className="panel-body">
              {accessToken ? (() => {
                const decoded = decodeToken(accessToken)
                return (
                  <div className="token-display">
                    {/* Structured claims */}
                    {decoded && (
                      <div className="token-claims">
                        {decoded.iss && (
                          <div className="token-claim-row">
                            <span className="token-claim-label">issuer</span>
                            <span className="token-claim-value">{decoded.iss}</span>
                          </div>
                        )}
                        {decoded.sub && (
                          <div className="token-claim-row">
                            <span className="token-claim-label">subject</span>
                            <span className="token-claim-value">{decoded.sub}</span>
                          </div>
                        )}
                        {decoded.scope && (
                          <div className="token-claim-row">
                            <span className="token-claim-label">scope</span>
                            <span className="token-claim-value">{decoded.scope}</span>
                          </div>
                        )}
                        {decoded.iat && (
                          <div className="token-claim-row">
                            <span className="token-claim-label">issued</span>
                            <span className="token-claim-value">{formatTimestamp(decoded.iat)}</span>
                          </div>
                        )}
                        {decoded.exp && (
                          <div className="token-claim-row">
                            <span className="token-claim-label">expires</span>
                            <span className={`token-claim-value ${decoded.exp * 1000 < Date.now() ? 'expired' : ''}`}>
                              {formatTimestamp(decoded.exp)}
                              {expiryCountdown && ` (${expiryCountdown})`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw token with copy */}
                    <div className="token-raw">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Raw token</span>
                        <button
                          className="small"
                          onClick={() => navigator.clipboard.writeText(accessToken)}
                          style={{ padding: '2px 6px', fontSize: 10 }}
                        >
                          Copy
                        </button>
                      </div>
                      <code>{accessToken.slice(0, 60)}...</code>
                    </div>

                    {/* Full decoded payload */}
                    {decoded && (
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)' }}>Full payload</summary>
                        <pre style={{ margin: 0, marginTop: 'var(--space-1)', fontSize: 10, overflow: 'auto', maxHeight: 150 }}>
                          {JSON.stringify(decoded, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )
              })() : (
                <div className="empty-state">No token</div>
              )}
            </div>
          </div>

          {/* DID Resolver */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">DID Resolver</span>
            </div>
            <div className="panel-body">
              <div className="form-row" style={{ marginBottom: 'var(--space-2)' }}>
                <input
                  type="text"
                  placeholder="handle or did:web:..."
                  value={resolveInput}
                  onChange={(e) => setResolveInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && testResolveDid()}
                  style={{ flex: 1 }}
                />
                <button onClick={testResolveDid} disabled={isResolving || !resolveInput.trim()}>
                  {isResolving ? '...' : 'Resolve'}
                </button>
              </div>
              {resolveError && (
                <div style={{ color: 'var(--accent-error)', fontSize: 12, marginBottom: 'var(--space-2)' }}>
                  {resolveError}
                </div>
              )}
              {resolveResult && (
                <div className="user-info">
                  <div className="user-info-row">
                    <span className="user-info-label">did</span>
                    <span style={{ wordBreak: 'break-all', fontSize: 11 }}>{resolveResult.did}</span>
                  </div>
                  {(() => {
                    const aka = (resolveResult.didDocument.alsoKnownAs as string[] | undefined)
                      ?.find(s => s.startsWith('basic://'))?.replace('basic://', '')
                    const handle = resolveResult.handle || aka
                    return handle ? (
                      <div className="user-info-row">
                        <span className="user-info-label">handle</span>
                        <span>{handle}</span>
                      </div>
                    ) : null
                  })()}
                  <div className="user-info-row">
                    <span className="user-info-label">pds</span>
                    <span style={{ wordBreak: 'break-all', fontSize: 11 }}>{resolveResult.pdsUrl}</span>
                  </div>
                  <details style={{ marginTop: 'var(--space-2)' }}>
                    <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>DID Document</summary>
                    <pre style={{ margin: 0, marginTop: 'var(--space-1)', fontSize: 10, overflow: 'auto' }}>
                      {JSON.stringify(resolveResult.didDocument, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* Sign In With Code */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">signInWithCode()</span>
            </div>
            <div className="panel-body">
              <div className="form-stack">
                <input
                  type="text"
                  placeholder="code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="state (optional)"
                  value={authState}
                  onChange={(e) => setAuthState(e.target.value)}
                />
                <button onClick={testSignInWithCode}>Execute</button>
              </div>
            </div>
          </div>

          {/* Sign In With Handle */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">signInWithHandle()</span>
            </div>
            <div className="panel-body">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                Resolves a handle to its PDS, discovers OAuth endpoints, and redirects to sign in.
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="alice.basic.id"
                  value={handleInput}
                  onChange={(e) => { setHandleInput(e.target.value); setHandleError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && testSignInWithHandle()}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={testSignInWithHandle}
                  disabled={isHandleLoading || !handleInput.trim()}
                >
                  {isHandleLoading ? '...' : 'Sign In'}
                </button>
              </div>
              {handleError && (
                <div style={{ color: 'var(--accent-error)', fontSize: 11, marginTop: 'var(--space-2)' }}>
                  {handleError}
                </div>
              )}
            </div>
          </div>

          {/* Local Storage */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Local Storage</span>
              <button
                className="icon-btn small"
                onClick={refreshStorageValues}
                title="Refresh"
                style={{ width: 24, height: 24, fontSize: 12 }}
              >
                ↻
              </button>
            </div>
            <div className="panel-body">
              <div className="storage-list">
                {Object.entries(STORAGE_KEYS).map(([key, storageKey]) => {
                  const value = storageValues[key]

                  let parsedJson = null
                  if (key === 'USER_INFO' && value) {
                    try { parsedJson = JSON.parse(value) } catch { /* ignore */ }
                  }

                  const displayValue = value
                    ? (key === 'REFRESH_TOKEN' ? `${value.slice(0, 20)}...` : value)
                    : null

                  return (
                    <div key={key} className="storage-item">
                      <div className="storage-key">
                        <span className="storage-key-name">{storageKey}</span>
                        <span className={`storage-status ${value ? 'has-value' : ''}`}>
                          {value ? '●' : '○'}
                        </span>
                      </div>
                      <div className="storage-value">
                        {!value ? (
                          <span className="empty">empty</span>
                        ) : parsedJson ? (
                          <pre className="storage-json">{JSON.stringify(parsedJson, null, 2)}</pre>
                        ) : (
                          displayValue
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
