import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { DEFAULT_BASE_URL } from '../lib/api'

type SessionContextType = {
  token: string | null
  baseUrl: string
  setToken: (token: string | null) => void
  setBaseUrl: (baseUrl: string) => void
  logout: () => void
}

const TOKEN_KEY = 'nebula-token'
const BASE_URL_KEY = 'nebula-base-url'

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  })

  const [baseUrl, setBaseUrlState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_BASE_URL
    return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL
  })

  useEffect(() => {
    if (token !== null) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  useEffect(() => {
    if (baseUrl) {
      localStorage.setItem(BASE_URL_KEY, baseUrl)
    }
  }, [baseUrl])

  const value = useMemo(
    () => ({
      token,
      baseUrl,
      setToken: (newToken: string | null) => setTokenState(newToken),
      setBaseUrl: (url: string) => setBaseUrlState(url),
      logout: () => setTokenState(null),
    }),
    [token, baseUrl],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
