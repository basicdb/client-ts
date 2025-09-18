// @ts-nocheck
import { useState } from 'react'
import './App.css'

import { useBasic, useQuery } from "@basictech/react"
import { validateSchema, validateData } from "@basictech/schema"

function App() {
  const { db, dbStatus, isAuthReady, isSignedIn, user, signout, signin, signinWithCode, getToken, getSignInLink, remoteDb} = useBasic()
  const [newItemText, setNewItemText] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [authState, setAuthState] = useState('')
  
  const todos = useQuery(() => db.collection('hello').getAll())
  const foo = useQuery(() => db.collection('foo').getAll())


  const testRemoteDb = async () => { 
    const result = await remoteDb.table('hello').getAll()
    console.log('getAll result:', result)

    const add_result = await remoteDb.table('hello').create({
      hello: 'test remote whoa'
    })
    console.log('Remote DB create_result:', add_result)


    const update_result = await remoteDb.table('hello').update(add_result.id, {
      hello: 'test remote updated'
    })
    console.log('Remote DB update_result:', update_result)


    const get_result = await remoteDb.table('hello').getAll().filter({
      hello: 'test remote updated'
    })
    console.log('Remote DB get_result:', get_result)



 
  }


  
  // DB Functions
  const addItem = async () => {
    try {
      const result = await db.collection('hello').add({
        hello: newItemText || `test ${Math.floor(Math.random() * 1000) + 1}`
      })
      console.log('Add item result:', result)
      setNewItemText('')
    } catch (error) {
      console.error('Add item error:', error)
    }
  }

  const updateItem = async (id: string) => {
    try {
      const result = await db.collection('hello').update(id, {
        hello: `updated ${Math.floor(Math.random() * 1000) + 1}`
      })
      console.log('Update item result:', result)
    } catch (error) {
      console.error('Update item error:', error)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const result = await db.collection('hello').delete(id)
      console.log('Delete item result:', result)
    } catch (error) {
      console.error('Delete item error:', error)
    }
  }

  const getAllItems = async () => {
    try {
      const result = await db.collection('hello').getAll()
      console.log('Get all items result:', result)
    } catch (error) {
      console.error('Get all items error:', error)
    }
  }

  // Auth Functions
  const testGetSignInLink = async () => {
    try {
      const link = await getSignInLink()
      console.log('Get sign in link result:', link)
    } catch (error) {
      console.error('Get sign in link error:', error)
    }
  }

  const testGetToken = async () => {
    try {
      const token = await getToken()
      console.log('Get token result:', token)
    } catch (error) {
      console.error('Get token error:', error)
    }
  }

  const testSignInWithCode = async () => {
    try {
      const result = await signinWithCode(authCode, authState)
      console.log('Sign in with code result:', result)
    } catch (error) {
      console.error('Sign in with code error:', error)
    }
  }


  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Header Row */}
      <div style={{
        padding: '1rem',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>@basictech/react</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.email && <span>{user.email}</span>}
          {isSignedIn ? (
            <button onClick={signout}>Sign Out</button>
          ) : (
            <button onClick={signin}>Sign In</button>
          )}
        </div>
      </div>

      {/* Body Row - Two Column Layout */}
      <div style={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden'
      }}>
        
        {/* Left Half - DB Functions */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Sticky Database Header */}
          <div style={{
            background: '#0f0f0f',
            borderBottom: '1px solid #333',
            borderRight: '1px solid #333',
            padding: '1rem',
            flexShrink: 0
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.25rem', 
                fontWeight: '600',
                color: '#e0e0e0',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
              }}>
                DATABASE
              </h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <button 
                  onClick={getAllItems}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                  }}
                >
                  REFRESH
                </button>
                <button 
                  onClick={testRemoteDb}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: '#1e40af',
                    border: '1px solid #3b82f6',
                    color: '#dbeafe',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                  }}
                >
                  TEST REMOTE
                </button>
              </div>
            </div>
            
            {/* Database Status and Controls */}
            <div style={{ 
              display: 'flex', 
              gap: '2rem', 
              alignItems: 'center',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
              marginBottom: '1rem'
            }}>
              <div>
                ITEMS: <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                  {(todos?.length || 0) + (foo?.length || 0)}
                </span>
              </div>
              <div>
                SYNC: <span style={{ 
                  color: dbStatus === 'ONLINE' ? '#22c55e' : 
                        dbStatus === 'CONNECTING' ? '#f59e0b' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {dbStatus?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
            
            {/* Add Item Controls in Header */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Add new item..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                style={{ 
                  flex: 1,
                  padding: '0.5rem',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#e0e0e0',
                  fontSize: '0.875rem',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                }}
              />
              <button 
                onClick={addItem}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#16a34a',
                  border: '1px solid #22c55e',
                  color: '#dcfce7',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                }}
              >
                ADD
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="scrollable-area"
            style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '1rem',
              borderRight: '1px solid #333'
            }}
          >
          {/* Items List */}
            <div style={{ 
              background: '#111111', 
              border: '1px solid #333', 
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: '#1a1a1a', 
              borderBottom: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                fontWeight: '600',
                color: '#94a3b8',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                HELLO COLLECTION
              </h3>
              <span style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
              }}>
                {todos?.length || 0} items
              </span>
            </div>
            
            <div className="scrollable-area" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {todos?.length === 0 ? (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                }}>
                  No items found
                </div>
              ) : (
                todos?.map((todo: any) => (
              <div key={todo.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #1e1e1e',
                    transition: 'all 0.15s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a1a'
                    e.currentTarget.style.borderLeftColor = '#3b82f6'
                    e.currentTarget.style.borderLeftWidth = '3px'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderLeftColor = 'transparent'
                    e.currentTarget.style.borderLeftWidth = '0px'
                  }}
                  onClick={() => {console.log(todo)}}
                  >
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <span style={{ 
                        color: '#e0e0e0',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                      }}>
                        {todo.hello}
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                      }}>
                        ID: {todo.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => updateItem(todo.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#f59e0b',
                          border: '1px solid #f59e0b',
                          color: '#1a1a1a',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                          fontWeight: '500'
                        }}
                      >
                        UPDATE
                      </button>
                      <button 
                        onClick={() => deleteItem(todo.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#dc2626',
                          border: '1px solid #dc2626',
                          color: '#fef2f2',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                          fontWeight: '500'
                        }}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))
              )}
              </div>
          </div>

          {/* Foo Collection */}
            <div style={{ 
              background: '#111111', 
              border: '1px solid #333', 
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: '#1a1a1a', 
              borderBottom: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                fontWeight: '600',
                color: '#94a3b8',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                FOO COLLECTION
              </h3>
              <span style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
              }}>
                {foo?.length || 0} items
              </span>
            </div>
            
            <div className="scrollable-area" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {foo?.length === 0 ? (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                }}>
                  No items found
                </div>
              ) : (
                foo?.map((item: any) => (
              <div key={item.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #1e1e1e',
                    transition: 'all 0.15s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a1a'
                    e.currentTarget.style.borderLeftColor = '#8b5cf6'
                    e.currentTarget.style.borderLeftWidth = '3px'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderLeftColor = 'transparent'
                    e.currentTarget.style.borderLeftWidth = '0px'
                  }}
                  >
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <span style={{ 
                        color: '#e0e0e0',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                      }}>
                        {item.bar}
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                      }}>
                        ID: {item.id}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                  db.collection('foo').update(item.id, {
                    bar: `updated ${Math.floor(Math.random() * 1000) + 1}`
                  })
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        background: '#8b5cf6',
                        border: '1px solid #8b5cf6',
                        color: '#f3e8ff',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                        fontWeight: '500'
                      }}
                    >
                      UPDATE
                    </button>
                  </div>
                ))
              )}
            </div>
              </div>
          </div>
        </div>

        {/* Right Half - Auth Functions */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Sticky Authentication Header */}
          <div style={{
            background: '#0f0f0f',
            borderBottom: '1px solid #333',
            padding: '1rem',
            flexShrink: 0
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.25rem', 
                fontWeight: '600',
                color: '#e0e0e0',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
              }}>
                AUTHENTICATION
              </h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <button 
                  onClick={testGetSignInLink}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                  }}
                >
                  GET LINK
                </button>
                <button 
                  onClick={testGetToken}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: '#7c3aed',
                    border: '1px solid #8b5cf6',
                    color: '#ede9fe',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                  }}
                >
                  GET TOKEN
                </button>
              </div>
            </div>
            
            {/* Auth Status in Header */}
            <div style={{ 
              display: 'flex', 
              gap: '2rem', 
              alignItems: 'center',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
            }}>
              <div>
                AUTH: <span style={{ 
                  color: isAuthReady ? '#22c55e' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {isAuthReady ? 'READY' : 'NOT READY'}
                </span>
              </div>
              <div>
                STATUS: <span style={{ 
                  color: isSignedIn ? '#22c55e' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {isSignedIn ? 'SIGNED IN' : 'SIGNED OUT'}
                </span>
              </div>
              {user?.email && (
                <div>
                  USER: <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                    {user.email}
                  </span>
              </div>
            )}
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="scrollable-area"
            style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '1rem'
            }}
          >
            {/* Auth Status Details */}
            <div style={{ 
              background: '#111111', 
              border: '1px solid #333', 
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: '#1a1a1a', 
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#94a3b8',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  USER DETAILS
                </h3>
              </div>
              
              <div style={{ padding: '1rem' }}>
                {user ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem',
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Email:</span>
                      <span style={{ color: '#e0e0e0' }}>{user.email || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Name:</span>
                      <span style={{ color: '#e0e0e0' }}>{user.name || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>ID:</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{user.id}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#64748b',
                    fontSize: '0.875rem',
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                    padding: '1rem'
                  }}>
                    No user data available
                  </div>
                )}
              </div>
            </div>

          {/* Auth Status */}
            <div style={{ 
              background: '#111111', 
              border: '1px solid #333', 
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: '#1a1a1a', 
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#94a3b8',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  AUTH STATUS
                </h3>
              </div>
              
              <div style={{ padding: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8' }}>Auth Ready:</span>
                    <span style={{ 
                      color: isAuthReady ? '#22c55e' : '#ef4444',
                      fontWeight: '600',
                      padding: '0.25rem 0.5rem',
                      background: isAuthReady ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '3px',
                      fontSize: '0.75rem'
                    }}>
                      {isAuthReady ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8' }}>Signed In:</span>
                    <span style={{ 
                      color: isSignedIn ? '#22c55e' : '#ef4444',
                      fontWeight: '600',
                      padding: '0.25rem 0.5rem',
                      background: isSignedIn ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '3px',
                      fontSize: '0.75rem'
                    }}>
                      {isSignedIn ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Functions */}
            <div style={{ 
              background: '#111111', 
              border: '1px solid #333', 
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: '#1a1a1a', 
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: '#94a3b8',
                  fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  AUTH FUNCTIONS
                </h3>
              </div>
              
              <div style={{ padding: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1rem'
                }}>
                  {/* Sign In With Code Section */}
                  <div>
                    <h4 style={{ 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      color: '#e0e0e0',
                      fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Sign In With Code
                    </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Auth Code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  style={{ 
                          padding: '0.5rem',
                          background: '#1a1a1a',
                          border: '1px solid #333',
                    borderRadius: '4px',
                          color: '#e0e0e0',
                          fontSize: '0.875rem',
                          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                  }}
                />
                <input 
                  type="text" 
                  placeholder="State (optional)"
                  value={authState}
                  onChange={(e) => setAuthState(e.target.value)}
                  style={{ 
                          padding: '0.5rem',
                          background: '#1a1a1a',
                          border: '1px solid #333',
                    borderRadius: '4px',
                          color: '#e0e0e0',
                          fontSize: '0.875rem',
                          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace'
                        }}
                      />
                      <button 
                        onClick={testSignInWithCode}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#7c3aed',
                          border: '1px solid #8b5cf6',
                          color: '#ede9fe',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                          fontWeight: '500'
                        }}
                      >
                        SIGN IN WITH CODE
                </button>
              </div>
            </div>

                  {/* Auth Actions */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #333'
                  }}>
                    <button 
                      onClick={signin}
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        background: '#16a34a',
                        border: '1px solid #22c55e',
                        color: '#dcfce7',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                        fontWeight: '500'
                      }}
                    >
                      SIGN IN
              </button>
                    <button 
                      onClick={signout}
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        background: '#dc2626',
                        border: '1px solid #dc2626',
                        color: '#fef2f2',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                        fontWeight: '500'
                      }}
                    >
                      SIGN OUT
              </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App