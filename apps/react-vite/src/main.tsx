import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider, sc } from "@basictech/react"

const basic_schema = {
  project_id: '5a15ffd6-89fe-4921-a1a0-e411ecd6da97',
  namespace: 'todos',
  version: 0,
  tables: {
    todos: {
      name: 'todos',
      type: 'collection',
      fields: {
        title: {
          type: 'string',
          // indexed: true,
          required: true,
        },
        completed: {
          type: "boolean",
          indexed: true,
        }
      }
    },
    lists: {
      name: 'lists',
      type: 'collection',
      fields: {
        name: {
          type: 'string',
        },
      }
    }
  }
}

// function Apppy() {

//   function debug() {

//     // const valid = sc.validateSchema(basic_schema)
//     // console.log(valid)

//     const newData = { 
//       // name: "hello", 
//       // completed: {}
//     }

//     const validData = sc.validateData(basic_schema, "todos", newData)
//     console.log(validData.errors[0])


//   }

//   debug()

//   return (
//     <div>

//       {/* <h1>hello</h1> */}

//       <button onClick={debug}>debug</button>

//     </div>)
// }




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <Apppy /> */}
    <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97" schema={basic_schema}   >
      <App />
    </BasicProvider>
  </StrictMode>,
)
