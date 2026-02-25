"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBasic, useQuery, STORAGE_KEYS, DBMode } from "@basictech/react"

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

export function Dashboard() {
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
  
  const [newName, setNewName] = useState('')
  const [newCount, setNewCount] = useState<number>(0)
  const [authCode, setAuthCode] = useState('')
  const [authState, setAuthState] = useState('')
  const [storageValues, setStorageValues] = useState<StorageValues>({})
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [queryId, setQueryId] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [remoteFooItems, setRemoteFooItems] = useState<FooItem[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // For sync mode, use live query
  const syncFooItems = useQuery(() => dbMode === 'sync' ? db.collection<FooItem>('foo').getAll() : Promise.resolve([]))
  
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

  // Toggle dbMode (requires page reload since it's a provider prop)
  const toggleDbMode = () => {
    const newMode: DBMode = dbMode === 'sync' ? 'remote' : 'sync'
    setDbModeInUrl(newMode)
  }

  // Foo Functions
  const addFooItem = async () => {
    const name = newName.trim() || `item_${Math.floor(Math.random() * 10000)}`
    const count = newCount || Math.floor(Math.random() * 100)
    try {
      const result = await db.collection<FooItem>('foo').add({
        name,
        count,
        is_done: false,
        data: { created: Date.now() }
      })
      console.log('foo.add() result:', result)
      setNewName('')
      setNewCount(0)
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.add() error:', error)
    }
  }

  const toggleFooItem = async (id: string, is_done: boolean) => {
    try {
      const result = await db.collection<FooItem>('foo').update(id, { is_done: !is_done })
      console.log('foo.update() result:', result)
      if (dbMode === 'remote') refreshFooItems()
    } catch (error) {
      console.error('foo.update() error:', error)
    }
  }

  const deleteFooItem = async (id: string) => {
    try {
      const result = await db.collection<FooItem>('foo').delete(id)
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
          <span className="header-title">@basictech/nextjs</span>
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
          
          {/* DB Status */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Status</span>
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

          {/* Foo Collection */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">foo</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {fooItems?.length || 0} items
              </span>
              {dbMode === 'remote' && (
                <button 
                  className="icon-btn small" 
                  onClick={refreshFooItems}
                  disabled={isRefreshing}
                  title="Refresh data"
                  style={{ width: 24, height: 24, fontSize: 12, marginLeft: 'auto' }}
                >
                  ↻
                </button>
              )}
            </div>
            <div className="panel-body">
              <div className="form-row" style={{ marginBottom: 'var(--space-3)' }}>
                <input 
                  type="text" 
                  placeholder="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFooItem()}
                  style={{ flex: 1 }}
                />
                <input 
                  type="number" 
                  placeholder="count"
                  value={newCount || ''}
                  onChange={(e) => setNewCount(parseInt(e.target.value) || 0)}
                  style={{ width: 80 }}
                />
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
                    <div className="list-item-text" style={{ textDecoration: item.is_done ? 'line-through' : 'none' }}>
                      {item.name} <span style={{ color: 'var(--text-muted)' }}>({item.count})</span>
                    </div>
                  </div>
                  <span className="list-item-id">{item.id?.slice(0, 8)}</span>
                  <div className="list-item-actions" style={{ opacity: 1 }}>
                    <button className="small" onClick={() => toggleFooItem(item.id, item.is_done)}>
                      {item.is_done ? '↩' : '✓'}
                    </button>
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
                <button onClick={testFilterDone}>filter(is_done)</button>
                <button onClick={testFilterNotDone}>filter(!is_done)</button>
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
                    <span>{user.sub}</span>
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

          {/* Access Token */}
          {accessToken && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Access Token</span>
                <button 
                  className="icon-btn small" 
                  onClick={() => setAccessToken(null)}
                  title="Clear"
                  style={{ width: 24, height: 24, fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
              <div className="panel-body">
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
              </div>
            </div>
          )}

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
