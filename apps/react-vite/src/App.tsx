import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// import { TestComp } from "@repo/ui/test-comp";
// import * as hooks from "@repo/kubb";
// import { useBasic } from "@basictech/react"

function App() {
  const [count, setCount] = useState(0)
  // const {user } = useBasic()

  // const {data , error, isLoading} = hooks.useGetProjectProjectIdProfile("123")

  function debug() { 
    // console.log(data, error, isLoading)
  }

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}

        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
       <button onClick={debug}></button>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
