import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"
// import { validateSchema, validateData, validateUpdateSchema } from "@basictech/schema"

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

const new_schema = {
  project_id: '5a15ffd6-89fe-4921-a1a0-e411ecd6da97',
  namespace: 'todos',
  version: 1,
  tables: {
    todos: {
      name: 'todos',
      type: 'collection',
      fields: {
        title: {
          type: 'string',
          required: true,
          indexed: true,
        },
        user_id: {
          type: "string",
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
    }, 
    users: {
      name: 'users',
      type: 'collection',
      fields: {
        name: { type: 'string' }
      }
    }
  }
}

// const valid = validateSchema(basic_schema)
// console.log(valid)

// const validData = validateData(basic_schema, "todos", { title: "hello", completed: true })
// console.log(validData)

// const verify = validateUpdateSchema(basic_schema, new_schema)
// console.table(verify.errors)


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97" schema={basic_schema} debug >
      <App />
    </BasicProvider>
  </StrictMode>,
)
