import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { useBasic, useQuery, DBMode, STORAGE_KEYS, resolveDid, resolveHandle, type ResolvedDid } from "@basictech/react"

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

function App() {
  const { 
    db, 
    dbStatus, 
    dbMode,
    isReady,
    isSignedIn, 
    user, 
    signOut,
    signIn,
    signInWithCode,
    getToken, 
    getSignInUrl
  } = useBasic()
  
  const [newFooItem, setNewFooItem] = useState({ name: '', count: 0, is_done: false })
  const [authCode, setAuthCode] = useState('')
  const [authState, setAuthState] = useState('')
  const [remoteFooItems, setRemoteFooItems] = useState<FooItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [storageValues, setStorageValues] = useState<StorageValues>({})
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [queryId, setQueryId] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [resolveInput, setResolveInput] = useState('')
  const [resolveResult, setResolveResult] = useState<ResolvedDid | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

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
        if (decoded?.sub && decoded.sub.startsWith('did:')) {
          setResolveInput(decoded.sub)
        }
      }).catch(() => {})
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
      const items = await db.collection<FooItem>('foo').getAll()
      setRemoteFooItems(items)
      console.log('foo.getAll() refreshed:', items)
    } catch (error) {
      console.error('foo.getAll() error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [db, dbMode])

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
      // Default to random values if inputs are empty
      const result = await db.collection('foo').add({
        name: newFooItem.name || `item_${Math.floor(Math.random() * 10000)}`,
        count: newFooItem.count || Math.floor(Math.random() * 100),
        is_done: newFooItem.is_done,
        data: { created: Date.now() }
      })
      console.log('foo.add() result:', result)
      setNewFooItem({ name: '', count: 0, is_done: false })
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.add() error:', error)
    }
  }

  const updateFooItem = async (id: string) => {
    try {
      const result = await db.collection('foo').update(id, {
        count: Math.floor(Math.random() * 100),
        is_done: Math.random() > 0.5
      })
      console.log('foo.update() result:', result)
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.update() error:', error)
    }
  }

  const deleteFooItem = async (id: string) => {
    try {
      const result = await db.collection('foo').delete(id)
      console.log('foo.delete() result:', result)
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.delete() error:', error)
    }
  }

  // Auth Functions
  const testGetSignInUrl = async () => {
    try {
      const url = await getSignInUrl()
      console.log('getSignInUrl() result:', url)
    } catch (error) {
      console.error('getSignInUrl() error:', error)
    }
  }

  const testGetToken = async () => {
    try {
      const token = await getToken()
      console.log('getToken() result:', token)
      setAccessToken(token)
    } catch (error) {
      console.error('getToken() error:', error)
      setAccessToken(null)
    }
  }

  const testSignInWithCode = async () => {
    try {
      const result = await signInWithCode(authCode, authState)
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
      const result = await db.collection<FooItem>('foo').get(queryId.trim())
      console.log('foo.get() result:', result)
      setQueryResult({ type: 'get', data: result })
    } catch (error) {
      console.error('foo.get() error:', error)
      setQueryResult({ type: 'get', error: String(error) })
    }
  }

  const testFilterDone = async () => {
    try {
      const result = await db.collection<FooItem>('foo').filter((item) => item.is_done === true)
      console.log('foo.filter(is_done=true) result:', result)
      setQueryResult({ type: 'filter', data: result })
    } catch (error) {
      console.error('foo.filter() error:', error)
      setQueryResult({ type: 'filter', error: String(error) })
    }
  }

  const testFilterNotDone = async () => {
    try {
      const result = await db.collection<FooItem>('foo').filter((item) => item.is_done === false)
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
          <span className="header-title">@basictech/react</span>
          <div className="status-badge">
            <span className={`status-dot ${getStatusClass()}`} />
            <span>{dbStatus}</span>
          </div>
        </div>
        <div className="header-right">
          {user?.email && <span className="user-email">{user.email}</span>}
          {isSignedIn ? (
            <button onClick={signOut}>Sign Out</button>
          ) : (
            <button className="primary" onClick={signIn}>Sign In</button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Left Column - Database */}
        <div className="column">
          <h2>Database</h2>
          
          {/* DB Mode Toggle */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Mode</span>
            </div>
            <div className="panel-body">
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">dbMode</span>
                  <span className={`status-value ${dbMode === 'sync' ? 'success' : 'pending'}`}>
                    {dbMode}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">dbStatus</span>
                  <span className="status-value">{dbStatus}</span>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                <button 
                  className={dbMode === 'sync' ? 'primary' : ''} 
                  onClick={() => dbMode !== 'sync' && toggleDbMode()}
                  disabled={dbMode === 'sync'}
                >
                  Sync Mode
                </button>
                <button 
                  className={dbMode === 'remote' ? 'primary' : ''} 
                  onClick={() => dbMode !== 'remote' && toggleDbMode()}
                  disabled={dbMode === 'remote'}
                >
                  Remote Mode
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                {dbMode === 'sync' 
                  ? 'Using local IndexedDB + WebSocket sync' 
                  : 'Using REST API calls directly'}
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
                  placeholder="name"
                  value={newFooItem.name}
                  onChange={(e) => setNewFooItem(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addFooItem()}
                  style={{ flex: 1 }}
                />
                <input 
                  type="number" 
                  placeholder="0"
                  value={newFooItem.count || ''}
                  onChange={(e) => setNewFooItem(prev => ({ ...prev, count: Number(e.target.value) || 0 }))}
                  className="number-input"
                />
                <button 
                  className="icon-btn"
                  onClick={() => setNewFooItem(prev => ({ ...prev, is_done: !prev.is_done }))}
                  title={newFooItem.is_done ? 'Mark as not done' : 'Mark as done'}
                  style={{ 
                    opacity: newFooItem.is_done ? 1 : 0.4,
                    fontSize: 16
                  }}
                >
                  ✓
                </button>
                <button className="icon-btn primary" onClick={addFooItem} title="Add item">
                  +
                </button>
              </div>
              {fooItems?.length === 0 && (
                <div className="empty-state">No items</div>
              )}
              {fooItems?.map((item) => (
                <div key={item.id} className="list-item">
                  <div style={{ flex: 1 }}>
                    <div className="list-item-text">{item.name || '(no name)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      count: {item.count} • done: {item.is_done ? '✓' : '✗'}
                    </div>
                  </div>
                  <span className="list-item-id">{item.id?.slice(0, 8)}</span>
                  <div className="list-item-actions">
                    <button className="small" onClick={() => updateFooItem(item.id)}>Edit</button>
                    <button className="small danger" onClick={() => deleteFooItem(item.id)}>Del</button>
                  </div>
                </div>
              ))}
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
        </div>

        {/* Right Column - Auth */}
        <div className="column">
          <h2>Authentication</h2>
          
          {/* Auth Status */}
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
                    <span>{user.id}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Auth Functions */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Functions</span>
            </div>
            <div className="panel-body">
              <div className="button-group" style={{ marginBottom: 'var(--space-3)' }}>
                <button onClick={testGetSignInUrl}>getSignInUrl()</button>
                <button onClick={testGetToken}>getToken()</button>
              </div>
              <div className="button-group">
                <button onClick={signIn}>signIn()</button>
                <button onClick={signOut}>signOut()</button>
              </div>
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

          {/* Access Token */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Access Token</span>
              <button 
                className="icon-btn small" 
                onClick={testGetToken}
                title="Refresh token"
                style={{ width: 24, height: 24, fontSize: 12 }}
              >
                ↻
              </button>
            </div>
            <div className="panel-body">
              {accessToken ? (
                <div className="token-display">
                  <div className="token-raw">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Raw (truncated):</span>
                    <code>{accessToken.slice(0, 50)}...</code>
                  </div>
                  {decodeToken(accessToken) && (
                    <div className="token-decoded">
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Decoded payload:</span>
                      <pre>{JSON.stringify(decodeToken(accessToken), null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">No token</div>
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
                  
                  // Parse JSON for USER_INFO
                  let parsedJson = null
                  if (key === 'USER_INFO' && value) {
                    try {
                      parsedJson = JSON.parse(value)
                    } catch {
                      // ignore parse errors
                    }
                  }

                  const displayValue = value 
                    ? (key === 'REFRESH_TOKEN' 
                        ? `${value.slice(0, 20)}...` 
                        : value)
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
