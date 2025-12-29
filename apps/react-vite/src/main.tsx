import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider, DBMode } from "@basictech/react"

import { schema as basic_schema } from '../basic.config.ts'

// Get dbMode from URL params (allows toggling between sync and remote)
const getDbModeFromUrl = (): DBMode => {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('dbMode')
  return mode === 'remote' ? 'remote' : 'sync'
}

const dbMode = getDbModeFromUrl()
console.log('[main] Starting with dbMode:', dbMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider 
      schema={basic_schema}  
      debug
      dbMode={dbMode}
      // auth={{ server_url: "http://localhost:3003", scopes: ['profile', 'email'], ws_url: "x" }}
    >
      <App />
    </BasicProvider>
  </StrictMode>,
)
