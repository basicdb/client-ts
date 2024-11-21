// @ts-nocheck
// import { useState } from 'react'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
import { useBasic, useQuery } from "@basictech/react"
import { validateSchema, validateData } from "@basictech/schema"


function App() {
  const {  db, dbStatus, isAuthReady, isSignedIn, user, signout, signin } = useBasic()
  // const item = useQuery(() => db.collection('todos').get('01930059-c605-7330-86f3-1e72338038b2'))
  // const todos = useQuery(() => db.collection('todos').getAll())

  function debug() {
    db.collection('example').getAll().then((items) => {
      console.log(items)
    })
    // const items = db.collection('todos').getAll().then((items) => {
    //   return items
    // })

    // const item = db.collection('todos').get('"01930059-c605-7330-86f3-1e72338038b2"')

    // console.log(item)
  }



  // const item = db.collection('example').get('01930059-c605-7330-86f3-1e72338038b2')

  // console.log(item)


  // debug()
  // console.log(item1)


  return (
    <>
      <div>

      </div>
      <h1>basic + react</h1>
      <div className="card">
        {dbStatus}

        <div style={{ marginBottom: 10 }}>


          {isSignedIn ? <button onClick={signout}>sign out</button> : <button onClick={signin}>sign in</button>}
          {user?.email}
        </div>

        <button onClick={debug}>debug</button>


        {/* {item1} */}


        {/* {
          todos.map((todo: any) => {
            return <div onClick={() => console.log(todo)} key={todo.id}>{todo.title} 
            {todo.completed ? " ✅" : " ❌"}

              <button onClick={() => db.collection('todos').delete(todo.id)}>delete</button>
            </div>
          })
        } */}


      </div>

    </>
  )
}

export default App