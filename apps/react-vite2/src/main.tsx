import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"
import { schema } from '../basic.config'


const schema2 = { 
  project_id: 'basic-tech-test',
  version: 0,
  tables: {
    foo: {
      name: 'foo',
      fields: {
        bar: {
          type: 'string'
        }
      }
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider
    // project_id={schema.project_id}
    // schema={schema}  
    schema={schema2}
    debug
    >
      <App />
    </BasicProvider>
  </StrictMode>,
)
