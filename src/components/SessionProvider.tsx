import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { getBaseUrl } from '../lib/api'

type SessionContextType = {
  token: string | null
  userId: string | null
  user: { id: string; username: string; email: string } | null
  baseUrl: string
  setToken: (token: string | null) => void
  setBaseUrl: (baseUrl: string) => void
  logout: () => void
  setUser: (user: { id: string; username: string; email: string } | null) => void
}

const TOKEN_KEY = 'nebula-token'
const BASE_URL_KEY = 'nebula-base-url'

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  })
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(TOKEN_KEY)
    return stored ? decodeJwtSub(stored) : null
  })

  const [baseUrl, setBaseUrlState] = useState<string>('',)

  // Initialize baseUrl on mount when window is definitely available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem(BASE_URL_KEY)
      if (storedUrl) {
        setBaseUrlState(storedUrl)
      } else {
        setBaseUrlState(getBaseUrl())
      }
    }
  }, [])
  const [user, setUser] = useState<{ id: string; username: string; email: string } | null>(null)

  useEffect(() => {
    if (token !== null) {
      localStorage.setItem(TOKEN_KEY, token)
      setUserId(decodeJwtSub(token))
    } else {
      localStorage.removeItem(TOKEN_KEY)
      setUserId(null)
      setUser(null)
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
      userId,
      user,
      baseUrl,
      setToken: (newToken: string | null) => setTokenState(newToken),
      setBaseUrl: (url: string) => setBaseUrlState(url),
      logout: () => setTokenState(null),
      setUser,
    }),
    [token, userId, baseUrl, user],
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

function decodeJwtSub(token: string): string | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(normalized))
    return typeof json.sub === 'string' ? json.sub : null
  } catch {
    return null
  }
}
