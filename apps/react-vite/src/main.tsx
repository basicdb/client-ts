import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"

const basic_schema = {
  project_id: '123',
  namespace: 'todos',
  version: 0,
  tables: {
      todos: {
          name: 'todos',
          type: 'collection',
          fields: {
              id: {
                  type: 'string',
                  primary: true,
              },
              title: {
                  type: 'string',
                  indexed: true,
              },
              completed: {
                  type: 'boolean',
                  indexed: true,
              }
          }
      },
  }
}




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97" schema={basic_schema} >
      <App />
    </BasicProvider>
  </StrictMode>,
)
