// @ts-nocheck
// import { useState } from 'react'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
import { useBasic, useQuery } from "@basictech/react"
import { validateSchema, validateData } from "@basictech/schema"


function Item ({value}: {value: any}) { 
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
      <span>{value.hello}</span>
      <button onClick={() => {
        db.collection('hello').update(value.id, {
          hello: `${value.hello}+`
        })
      }}>Update</button>
      <button onClick={() => {
        db.collection('hello').delete(value.id)
      }}>Delete</button>
    </div>
  )
}

function App() {
  const {  db, dbStatus, isAuthReady, isSignedIn, user, signout, signin } = useBasic()
  // const item = useQuery(() => db.collection('todos').get('01930059-c605-7330-86f3-1e72338038b2'))
  const todos = useQuery(() => db.collection('hello').getAll())
  const foo = useQuery(() => db.collection('foo').getAll())

  function debug() {
    db.collection('hello').getAll().then((items) => {
      console.log(items)
    })

    db.collection('hello').add({
      hello: `test ${Math.floor(Math.random() * 1000) + 1}`
    })

  }


  return (
    <>
      <h1>basic + react</h1>

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
      <div style={{ height: '80px' }} /> 


      <div className="card">
   
        <button onClick={debug}>add</button>

        <div className="card" style={{ padding: '20px',  borderRadius: '8px', margin: '20px 0' }}>
          <input 
            type="text" 
            placeholder="Add new item..."
            style={{ 
              width: '100%',
              padding: '8px',
              marginBottom: '16px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
       
        </div>


        {
          todos?.map((todo: any) => {
            return <div  onClick={() => console.log(todo)} key={todo.id}>{todo.hello} 

            <button onClick={() => {
              db.collection('hello').update(todo.id, {
                hello: `updated ${Math.floor(Math.random() * 1000) + 1}`
              })
            }}>u</button>

            <button onClick={() => {
              db.collection('hello').delete(todo.id)
            }}>d</button>

            </div>
          })
        }

        <h1>foo</h1>
        {
          foo?.map((item: any) => {
            return <div key={item.id}>{item.bar}
            
              <button onClick={() => {
                db.collection('foo').update(item.id, {
                  bar: `updated ${Math.floor(Math.random() * 1000) + 1}`
                })
              }}>u</button>
              
              
              </div>
          })
        }


      </div>

    </>
  )
}

export default App