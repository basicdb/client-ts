"use client"

import { useEffect, useState, ReactNode } from "react"
import { BasicProvider, DBMode } from "@basictech/react"
import { schema } from "../../basic.config"

// Get dbMode from URL params
function getDbModeFromUrl(): DBMode {
  if (typeof window === 'undefined') return 'sync'
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('dbMode')
  return mode === 'remote' ? 'remote' : 'sync'
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [dbMode, setDbMode] = useState<DBMode>('sync')
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      setDbMode(getDbModeFromUrl())
      setMounted(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize'))
    }
  }, [])

  // Show error state
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        color: '#ff6b6b', 
        backgroundColor: '#1a1a2e',
        fontFamily: 'monospace'
      }}>
        <h2>Initialization Error</h2>
        <pre>{error.message}</pre>
      </div>
    )
  }

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BasicProvider schema={schema} debug dbMode={dbMode} children={children as any} />
  )
}
