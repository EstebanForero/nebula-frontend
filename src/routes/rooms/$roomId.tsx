import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Message } from '../../lib/api'
import { buildRoomWsUrl, getMessages, isAuthError, sendMessage } from '../../lib/api'
import { useSession } from '../../components/SessionProvider'

export const Route = createFileRoute('/rooms/$roomId')({
  component: RoomPage,
})

type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

function RoomPage() {
  const { roomId } = Route.useParams()
  const navigate = useNavigate()
  const { token, baseUrl, logout } = useSession()

  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages],
  )

  useEffect(() => {
    if (!token) return
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const initial = await getMessages(
          { room_id: roomId, page: 1, page_size: 50 },
          { token, baseUrl },
        )
        if (active) setMessages(initial)
      } catch (err) {
        if (isAuthError(err)) {
          logout()
          navigate({ to: '/login' })
          return
        }
        if (active) setError(err instanceof Error ? err.message : 'Unable to load messages')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [roomId, token, baseUrl])

  useEffect(() => {
    if (!token) {
      setSocketStatus('idle')
      return
    }
    const url = buildRoomWsUrl(roomId, baseUrl, token)
    const socket = new WebSocket(url)
    let closedByClient = false
    setSocketStatus('connecting')

    socket.onopen = () => setSocketStatus('open')
    socket.onerror = () => {
      if (closedByClient) return
      setSocketStatus('error')
      logout()
      navigate({ to: '/login' })
    }
    socket.onclose = (event) => {
      if (closedByClient) return
      setSocketStatus('closed')
      if ([4001, 4003, 4401, 4403].includes(event.code)) {
        logout()
        navigate({ to: '/login' })
      }
    }
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Message
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === payload.id)
          return exists ? prev : [...prev, payload]
        })
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      closedByClient = true
      socket.close()
    }
  }, [roomId, token, baseUrl, logout, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sortedMessages.length])

  const onSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (!token) {
      setError('Log in to send messages.')
      return
    }
    try {
      setError(null)
      const newMessage = await sendMessage(
        { room_id: roomId, content },
        { token, baseUrl },
      )
      setMessages((prev) => [...prev, newMessage])
      setContent('')
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to send message')
    }
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-semibold text-white">Authentication required</h1>
        <p className="text-slate-400">
          You need to log in to enter room <span className="text-white font-semibold">{roomId}</span>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate({ to: '/login' })}
            className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20 transition"
          >
            Log in
          </button>
          <button
            onClick={() => navigate({ to: '/register' })}
            className="rounded-xl border border-white/15 px-5 py-2.5 font-semibold text-cyan-200 hover:border-cyan-300/60 hover:text-white transition"
          >
            Register
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-500/5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Room id</p>
        <p className="mt-1 font-mono text-sm text-cyan-100 break-all">{roomId}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Socket</span>
          <StatusPill status={socketStatus} />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          The server streams room traffic over <code className="font-mono">/ws/room/{roomId}</code>.
          Messages you send go through the REST endpoint and will also appear here when the server
          echoes them back.
        </p>
        <button
          onClick={() => navigate({ to: '/rooms' })}
          className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
        >
          Back to rooms
        </button>
      </aside>

      <section className="flex h-[75vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/[0.02] shadow-2xl shadow-cyan-500/5">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live feed</p>
            <h2 className="text-xl font-semibold text-white">Room timeline</h2>
          </div>
          <StatusPill status={socketStatus} />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {loading && <p className="text-slate-400">Loading messages…</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {!loading && sortedMessages.length === 0 && (
            <p className="text-slate-500">No messages yet. Be the first to speak.</p>
          )}
          {sortedMessages.map((message) => (
            <article
              key={message.id}
              className="group rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white shadow-inner shadow-black/20"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] text-cyan-200">{message.senderId}</span>
                <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="mt-2 leading-relaxed text-slate-100">{message.content}</p>
            </article>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSend} className="border-t border-white/5 p-4">
          <div className="flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!content.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: SocketStatus }) {
  const map: Record<SocketStatus, { label: string; color: string }> = {
    idle: { label: 'Idle', color: 'bg-slate-500/30 text-slate-200 ring-slate-400/30' },
    connecting: {
      label: 'Connecting',
      color: 'bg-amber-500/20 text-amber-100 ring-amber-400/40',
    },
    open: { label: 'Live', color: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40' },
    closed: { label: 'Closed', color: 'bg-slate-500/30 text-slate-200 ring-slate-400/30' },
    error: { label: 'Error', color: 'bg-rose-500/20 text-rose-100 ring-rose-400/40' },
  }
  const { label, color } = map[status]
  return (
    <span
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${color}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  )
}
