import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"
// import { validateSchema, validateData, compareSchemas } from "@basictech/schema"

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
          required: true,
          indexed: false,
        },
        completed: {
          type: "boolean",
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

// const new_schema = {
//   project_id: '5a15ffd6-89fe-4921-a1a0-e411ecd6da97',
//   namespace: 'todos',
//   version: 0,
//   tables: {
//     todos: {
//       name: 'todos',
//       type: 'collection',
//       fields: {
//         title: {
//           type: 'string',
//           required: true,
//           indexed: false,
//         },
//         completed: {
//           type: "boolean",
//         },
//       }
//     },
//     lists: {
//       name: 'lists',
//       type: 'collection',
//       fields: {
//         name: {
//           type: 'string',
//         },
//       }
//     }
//   }
// }



// const valid = compareSchemas(basic_schema, new_schema)
// console.log("valid", valid)

// const validData = validateData(basic_schema, "todos", { title: "hello", completed: true })
// console.log(validData)

// const verify = validateUpdateSchema(basic_schema, new_schema)
// console.table(verify.errors)


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97" schema={basic_schema}  >
      <App />
    </BasicProvider>
  </StrictMode>,
)
