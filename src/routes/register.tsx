import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { register } from '../lib/api'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
    const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const passwordValid = password.length >= 8 && /\d/.test(password)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!passwordValid) {
      setError('Password must be at least 8 characters and include a digit.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await register({ username, email, password }, {})
      setSuccess(true)
      setTimeout(() => navigate({ to: '/login' }), 600)
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to register. Please check your details.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-purple-500/10 backdrop-blur">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-purple-400">Create</p>
          <h1 className="text-3xl font-semibold text-white mt-2">Spin up your Nebula identity</h1>
          <p className="text-sm text-slate-400 mt-2">
            Make an account to create rooms and send messages across the galaxy.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Username</span>
            <input
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="nebulae"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Email</span>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="you@nebula.dev"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Password</span>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-slate-500">
              At least 8 characters and 1 number. Current: {password.length} chars
            </p>
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">Account created. Redirecting…</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-3 font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-300 hover:text-purple-200 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
