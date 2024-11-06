// import { useState } from 'react'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
import { useBasic, useQuery } from "@basictech/react"

function App() {
  const { db, dbStatus, isAuthReady, isSignedIn, user, signout, signin } = useBasic()
  const todos = useQuery(() => db.collection('todos').getAll())
  // const lists = useQuery(()=>db.collection('lists').getAll())

  function debug() {

    db.collection('todos').add({
      title: "test",
      completed: true,
    })

  }

  console.log(todos)


  console.log("isAuthReady", isAuthReady, "isSignedIn", isSignedIn)


  return (
    <>
      <div>

      </div>
      <h1>basic + react</h1>
      <div className="card">

        <div style={{ marginBottom: 10 }}>


          {isSignedIn ? <button onClick={signout}>sign out</button> : <button onClick={signin}>sign in</button>}
          {user?.email}
        </div>

        <button onClick={debug}>debug</button>

        {dbStatus}


        {
          todos.map((todo: any) => {
            return <div onClick={() => console.log(todo)} key={todo.id}>{todo.title} 
            {todo.completed ? " ✅" : " ❌"}

              <button onClick={() => db.collection('todos').delete(todo.id)}>delete</button>
            </div>
          })
        }


      </div>

    </>
  )
}

export default App