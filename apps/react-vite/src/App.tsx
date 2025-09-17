// @ts-nocheck
import { useState } from 'react'
import './App.css'

import { useBasic, useQuery } from "@basictech/react"
import { validateSchema, validateData } from "@basictech/schema"

function App() {
  const { db, dbStatus, isAuthReady, isSignedIn, user, signout, signin, signinWithCode, getToken, getSignInLink } = useBasic()
  const [newItemText, setNewItemText] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [authState, setAuthState] = useState('')
  
  const todos = useQuery(() => db.collection('hello').getAll())
  const foo = useQuery(() => db.collection('foo').getAll())

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
  const testGetSignInLink = () => {
    try {
      const link = getSignInLink()
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
    <>
      {/* Sticky Header with Title */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '1rem',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>@basictech/react</h1>
          <div>
            Status: <span style={{ color: '#646cff' }}>{dbStatus}</span>
          </div>
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
      <div style={{ height: '80px' }} /> 

      {/* Main Content - Two Column Layout */}
      <div style={{ 
        display: 'flex', 
        gap: '4rem', 
        padding: '2rem',
        minHeight: 'calc(100vh - 80px)'
      }}>
        
        {/* Left Half - DB Functions */}
        <div style={{ flex: 1 }}>
          <h2>Database Functions Testing</h2>
          
          {/* Add Item Section */}
          <div className="card" style={{ padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <h3>Add Item</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                placeholder="Add new item..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                style={{ 
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <button onClick={addItem}>Add</button>
            </div>
            <button onClick={getAllItems} style={{ marginRight: '0.5rem' }}>Get All Items</button>
          </div>

          {/* Items List */}
          <div className="card" style={{ padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <h3>Items List</h3>
            {todos?.map((todo: any) => (
              <div key={todo.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg, rgba(255, 255, 255, 0.1))'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <span style={{ flex: 1 }}>{todo.hello}</span>
                <button onClick={() => updateItem(todo.id)}>Update</button>
                <button onClick={() => deleteItem(todo.id)}>Delete</button>
              </div>
            ))}
          </div>

          {/* Foo Collection */}
          <div className="card" style={{ padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <h3>Foo Collection</h3>
            {foo?.map((item: any) => (
              <div key={item.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg, rgba(255, 255, 255, 0.1))'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <span style={{ flex: 1 }}>{item.bar}</span>
                <button onClick={() => {
                  db.collection('foo').update(item.id, {
                    bar: `updated ${Math.floor(Math.random() * 1000) + 1}`
                  })
                }}>Update</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Half - Auth Functions */}
        <div style={{ flex: 1 }}>
          <h2>Authentication Functions Testing</h2>
          
          {/* Auth Status */}
          <div className="card" style={{ padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <h3>Auth Status</h3>
            <p>Auth Ready: <span style={{ color: isAuthReady ? 'var(--success-color, #4caf50)' : 'var(--error-color, #f44336)' }}>{isAuthReady ? 'Yes' : 'No'}</span></p>
            <p>Signed In: <span style={{ color: isSignedIn ? 'var(--success-color, #4caf50)' : 'var(--error-color, #f44336)' }}>{isSignedIn ? 'Yes' : 'No'}</span></p>
            {user && (
              <div>
                <p>User: {user.email || user.name || 'Unknown'}</p>
                <p>ID: {user.id}</p>
              </div>
            )}
          </div>

          {/* Auth Functions */}
          <div className="card" style={{ padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <h3>Auth Functions</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <button onClick={testGetSignInLink} style={{ marginRight: '0.5rem' }}>
                Test getSignInLink()
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <button onClick={testGetToken} style={{ marginRight: '0.5rem' }}>
                Test getToken()
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4>Sign In With Code</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Auth Code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  style={{ 
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
                <input 
                  type="text" 
                  placeholder="State (optional)"
                  value={authState}
                  onChange={(e) => setAuthState(e.target.value)}
                  style={{ 
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
                <button onClick={testSignInWithCode}>
                  Test signinWithCode()
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <button onClick={signin} style={{ marginRight: '0.5rem' }}>
                Sign In
              </button>
              <button onClick={signout}>
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

export default App