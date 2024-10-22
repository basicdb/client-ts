// import { useState } from 'react'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
import { useBasic, useQuery } from "@basictech/react"

function App() {
  const { db, dbStatus } = useBasic()
  const todos = useQuery(() => db.collection('todos').ref.toArray())



  function debug() { 

    // console.log(db)
    // console.log(user)

  }

  

  return (
    <>
      <div>
      
      </div>
      <h1>basic + react</h1>
      <div className="card">
        <button onClick={debug}>debug</button>
      
      { dbStatus }

      { 
        todos?.map((todo: any) => {
          return <div key={todo.id}>{todo.title}</div>
        })
      }


      </div>
    
    </>
  )
}

export default App