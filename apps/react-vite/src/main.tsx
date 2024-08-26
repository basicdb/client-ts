import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97">
      <App />
    </BasicProvider>
  </StrictMode>,
)
