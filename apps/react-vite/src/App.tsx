import { useState } from 'react'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
import { useBasic } from "@basictech/react"

function App() {
  const [count, setCount] = useState(0)
  const {user, db } = useBasic()


  function debug() { 
    // console.log(data, error, isLoading)
    console.log(user)

    db.table("test").get().then((data: unknown) => {
      console.log(data)
    })
  }

  

  return (
    <>
      <div>
      
      </div>
      <h1>basic + react</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}

        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
       <button onClick={debug}>debug</button>


      </div>
    
    </>
  )
}

export default App