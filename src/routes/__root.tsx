import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useSession } from '../components/SessionProvider'
import { useEffect, useState } from 'react'
import { enablePush } from '../lib/notifications'
import { BellRing } from 'lucide-react'
import { getBaseUrl, setCustomApiUrl } from '../lib/api'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { token, logout, baseUrl, setBaseUrl } = useSession()
  const [notifStatus, setNotifStatus] = useState<'idle' | 'pending' | 'enabled' | 'error'>('idle')
  const [notifError, setNotifError] = useState<string | null>(null)
  const [editBaseUrl, setEditBaseUrl] = useState(() => getBaseUrl())

  const runtimeDevFlag =
    (typeof window !== 'undefined' && ((window as any).ENV?.VITE_DEV_MODE as string)) || ''
  const devMode =
    runtimeDevFlag === 'true' ||
    runtimeDevFlag === '1' ||
    (import.meta.env.VITE_DEV_MODE as string | undefined) === 'true' ||
    import.meta.env.DEV

  const handleEnableNotifications = async () => {
    if (!token) {
      setNotifError('Log in to enable notifications')
      return
    }
    setNotifStatus('pending')
    setNotifError(null)
    try {
      await enablePush({ token })
      setNotifStatus('enabled')
    } catch (err) {
      setNotifStatus('error')
      setNotifError(err instanceof Error ? err.message : 'Unable to enable notifications')
    }
  }

  useEffect(() => {
    setEditBaseUrl(baseUrl || getBaseUrl())
  }, [baseUrl])

  const handleApplyBaseUrl = () => {
    const next = editBaseUrl.trim()
    if (next) {
      setCustomApiUrl(next)
      setBaseUrl(next)
    } else {
      if (typeof window !== 'undefined' && (window as any).CUSTOM_API_URL) {
        delete (window as any).CUSTOM_API_URL
      }
      const reset = getBaseUrl()
      setEditBaseUrl(reset)
      setBaseUrl(reset)
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.08),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(236,72,153,0.06),transparent_28%)]" />

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#05070d]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Link to="/rooms" className="flex items-center gap-2 text-xl font-semibold text-white">
              <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 shadow-lg shadow-cyan-500/30" />
              Nebula Chat
            </Link>
            <nav className="hidden items-center gap-3 md:flex">
              <Link
                to="/rooms"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Rooms
              </Link>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Register
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {devMode && (
              <div className="hidden items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-slate-100 shadow-inner shadow-cyan-500/20 sm:flex">
                <input
                  value={editBaseUrl}
                  onChange={(e) => setEditBaseUrl(e.target.value)}
                  placeholder={getBaseUrl()}
                  className="w-56 bg-transparent text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  onClick={handleApplyBaseUrl}
                  className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-white/30"
                  title="Apply custom backend URL"
                >
                  Use
                </button>
              </div>
            )}
            <button
              onClick={handleEnableNotifications}
              className={`hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold sm:flex ${
                notifStatus === 'enabled'
                  ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/60 hover:text-white'
              }`}
              title="Enable web push notifications"
            >
              <BellRing size={16} />
              {notifStatus === 'pending'
                ? 'Enabling…'
                : notifStatus === 'enabled'
                ? 'Notifications on'
                : 'Enable notifications'}
            </button>
            {token ? (
              <button
                onClick={logout}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-indigo-500/30"
              >
                Launch app
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-none px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>

      {notifError && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 shadow-lg shadow-rose-500/30">
          {notifError}
        </div>
      )}

      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  )
}
