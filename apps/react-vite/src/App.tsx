// import { useState } from 'react'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
import { useBasic, useQuery } from "@basictech/react"

function App() {
  const { db, dbStatus } = useBasic()
  const todos = useQuery(db.collection('todos').getAll())
  

  function debug() { 

    // console.log(db)
    // console.log(user)

    db.collection('todos').add({
      title: "test",
      completed: false
    })

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
        todos.map((todo: any) => {
          return <div onClick={()=>console.log(todo)} key={todo.id}>{todo.title}
          
            <button onClick={()=>db.collection('todos').delete(todo.id)}>delete</button>
          </div>
        })
      }


      </div>
    
    </>
  )
}

export default App