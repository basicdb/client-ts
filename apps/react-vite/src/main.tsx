import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider project_id="123">
      <App />
    </BasicProvider>
  </StrictMode>,
)
