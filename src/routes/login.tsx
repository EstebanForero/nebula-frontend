import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { getMe, login } from '../lib/api'
import { useSession } from '../components/SessionProvider'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setUser } = useSession()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await login({ identifier, password }, {})
      setToken(token)
      try {
        const profile = await getMe({ token })
        setUser(profile)
      } catch {
        setUser(null)
      }
      navigate({ to: '/rooms' })
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Unable to log in. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/5 backdrop-blur">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Access</p>
          <h1 className="text-3xl font-semibold text-white mt-2">Welcome back to Nebula</h1>
          <p className="text-sm text-slate-400 mt-2">
            Sign in to explore public and private rooms in real-time.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Email or username</span>
            <input
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Password</span>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="••••••••"
              required
            />
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Authenticating...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="text-cyan-300 hover:text-cyan-200 underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
