// @ts-nocheck
// import { useState } from 'react'
import './App.css'

import { useBasic, useQuery } from "@basictech/react"
import { validateSchema, validateData } from "@basictech/schema"


function App() {
  const { db, dbStatus, isAuthReady, isSignedIn, user, signout, signin } = useBasic()
  const foo = useQuery(() => db.collection('foo').getAll())

  function debug() {
    db.collection('foo').add({
      bar: `foo ${Math.floor(Math.random() * 1000) + 1}`
    })
  }

  return (
    <>

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
        <div>
          Status: <span style={{ color: '#646cff' }}>{dbStatus}</span>
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
      <h1>foo</h1>
 
      

        <button onClick={debug}>debug</button>


        {
          foo?.map((item: any) => {
            return <div key={item.id}>{item.bar}

              <button onClick={() => {
                db.collection('foo').update(item.id, {
                  bar: `${item.bar}+`
                })
              }}>u</button>

              <button onClick={() => {
                db.collection('foo').delete(item.id)
              }}>d</button>

            </div>
          })
        }


    </>
  )
}

export default App