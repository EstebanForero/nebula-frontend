import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Message } from '../../lib/api'
import {
  buildRoomWsUrl,
  getMessages,
  getRoomMembers,
  isAuthError,
  leaveRoom,
  sendMessage,
} from '../../lib/api'
import { useSession } from '../../components/SessionProvider'
import { RoomsShell } from '../../components/RoomsShell'

export const Route = createFileRoute('/rooms/$roomId')({
  component: RoomPage,
})

type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

function RoomPage() {
  const { roomId } = Route.useParams()
  const navigate = useNavigate()
  const { token, userId, logout } = useSession()

  // Validate roomId parameter
  if (!roomId || roomId === 'undefined' || roomId === 'null') {
    navigate({ to: '/rooms' })
    return null
  }

  const PAGE_SIZE = 20

  const [messages, setMessages] = useState<(Message & { pending?: boolean })[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const lastScrollTopRef = useRef<number>(0)
  const [members, setMembers] = useState<Record<string, string>>({})
  const [copyToast, setCopyToast] = useState<string | null>(null)

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages],
  )

  const mergeMessages = (incoming: Message[]) => {
    setMessages((prev) => {
      const map = new Map<string, Message & { pending?: boolean }>()
      ;[...prev, ...incoming].forEach((msg) => {
        map.set(msg.id, { ...msg, pending: false })
      })
      return Array.from(map.values())
    })
  }

  const isAtBottom = () => {
    const el = messagesContainerRef.current
    if (!el) return true
    const threshold = 40
    return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
  }

  const scrollToBottom = () => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!token || !roomId || roomId === 'undefined' || roomId === 'null') return
    let active = true

    const loadPage = async (pageToLoad: number, stickBottom = false) => {
      setLoading(true)
      setError(null)
      try {
        await delay(450) // artificial delay to surface loading state
        const initial = await getMessages(
          { room_id: roomId, page: pageToLoad, page_size: PAGE_SIZE },
          { token },
        )
        if (!active) return
        mergeMessages(initial)
        setPage(pageToLoad)
        setHasMore(initial.length >= PAGE_SIZE)
        if (stickBottom) {
          stickToBottomRef.current = true
          setTimeout(scrollToBottom, 0)
        }
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

    loadPage(1, true)
    ;(async () => {
      try {
        const memberList = await getRoomMembers(roomId, { token })
        if (!active) return
        const map: Record<string, string> = {}
        memberList.forEach((m) => {
          map[m.id] = m.username
        })
        setMembers(map)
      } catch (err) {
        if (isAuthError(err)) {
          logout()
          navigate({ to: '/login' })
          return
        }
      }
    })()

    return () => {
      active = false
    }
  }, [roomId, token])

  useEffect(() => {
    if (!token || !roomId || roomId === 'undefined' || roomId === 'null') {
      setSocketStatus('idle')
      return
    }
    const url = buildRoomWsUrl(roomId, token)
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
        stickToBottomRef.current = isAtBottom()
        mergeMessages([payload])
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      closedByClient = true
      socket.close()
    }
  }, [roomId, token, logout, navigate])

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom()
    }
  }, [sortedMessages.length])

  const loadOlder = async () => {
    if (!hasMore || loadingOlder || !roomId || roomId === 'undefined' || roomId === 'null') return
    const el = messagesContainerRef.current
    const prevHeight = el?.scrollHeight || 0
    stickToBottomRef.current = false
    setLoadingOlder(true)
    const nextPage = page + 1
    try {
      await delay(450) // artificial delay for visible loading indicator
      const older = await getMessages(
        { room_id: roomId, page: nextPage, page_size: PAGE_SIZE },
        { token },
      )
      mergeMessages(older)
      setPage(nextPage)
      setHasMore(older.length >= PAGE_SIZE)
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to load messages')
    } finally {
      setLoadingOlder(false)
      setTimeout(() => {
        if (el) {
          const newHeight = el.scrollHeight
          el.scrollTop = newHeight - prevHeight
        }
      }, 0)
    }
  }

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const scrollingUp = el.scrollTop < lastScrollTopRef.current
    if (scrollingUp && el.scrollTop < 60) {
      loadOlder()
    }
    stickToBottomRef.current = isAtBottom()
    lastScrollTopRef.current = el.scrollTop
  }

  const onSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (!token || !userId || !roomId || roomId === 'undefined' || roomId === 'null') {
      setError('Log in to send messages.')
      return
    }
    const tempId = crypto.randomUUID()
    const optimistic: Message & { pending?: boolean } = {
      id: tempId,
      roomId,
      senderId: userId,
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setError(null)
    stickToBottomRef.current = true
    setMessages((prev) => [...prev, optimistic])
    setContent('')

    try {
      const saved = await sendMessage(
        { room_id: roomId, content },
        { token },
      )
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, ...(saved as Message | undefined), pending: false }
            : msg,
        ),
      )
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to send message')
    }
  }

  const onLeave = async () => {
    if (!token || !roomId || roomId === 'undefined' || roomId === 'null') return
    try {
      await leaveRoom(roomId, { token })
      navigate({ to: '/rooms' })
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to leave room')
    }
  }

  const memberList = useMemo(
    () =>
      Object.entries(members)
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  )

  const chatPane = (
    <section className="flex h-[75vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/[0.02] shadow-2xl shadow-cyan-500/5">
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live feed</p>
          <h2 className="text-xl font-semibold text-white">Room timeline</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="break-all">ID: {roomId}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(roomId)
                setCopyToast('Room ID copied')
                setTimeout(() => setCopyToast(null), 2500)
              }}
              className="rounded-full border border-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:border-cyan-400/60"
              title="Copy room ID to invite others"
            >
              Copy ID
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400/60 hover:text-white transition"
          >
            Leave
          </button>
          <StatusPill status={socketStatus} />
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="chat-scroll flex-1 space-y-3 overflow-y-auto px-6 py-4"
      >
        {loadingOlder && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
            <span className="h-3 w-3 animate-spin rounded-full border border-cyan-300 border-l-transparent" />
            Loading earlier messages…
          </div>
        )}
        {loading && <p className="text-slate-400">Loading messages…</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {!loading && sortedMessages.length === 0 && (
          <p className="text-slate-500">No messages yet. Be the first to speak.</p>
        )}
        {sortedMessages.map((message) => {
          const isMine = userId && message.senderId === userId
          const displayName = isMine ? 'You' : members[message.senderId] || message.senderId
          const pending = message.pending
          return (
            <article
              key={message.id}
              className={`group rounded-xl border px-4 py-3 text-sm shadow-inner shadow-black/20 ${
                isMine
                  ? pending
                    ? 'ml-auto max-w-[85%] border-fuchsia-400/40 bg-fuchsia-500/10 text-white'
                    : 'ml-auto max-w-[85%] border-cyan-500/40 bg-cyan-500/10 text-white'
                  : 'border-white/5 bg-white/5 text-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span
                  className={`font-mono text-[11px] ${
                    isMine ? (pending ? 'text-fuchsia-100' : 'text-cyan-200') : 'text-slate-400'
                  }`}
                >
                  {displayName}
                </span>
                <span>
                  {(() => {
                    const d = new Date(message.createdAt)
                    return Number.isNaN(d.getTime()) ? 'Now' : d.toLocaleTimeString()
                  })()}
                </span>
              </div>
              <p className="mt-2 leading-relaxed text-slate-100">{message.content}</p>
              {pending && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-200">
                  Sending…
                </p>
              )}
            </article>
          )
        })}
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
  )

  const loginPrompt = (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold text-white">Authentication required</h1>
      <p className="text-slate-400">
        Log in to enter room <span className="text-white font-semibold">{roomId}</span>.
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

  const membersPane = token ? (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Members</p>
          <p className="text-sm text-white">{memberList.length} people</p>
        </div>
      </div>
      <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {memberList.length === 0 && <p className="text-xs text-slate-500">No members listed.</p>}
        {memberList.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <span className="truncate" title={m.name}>
              {m.name}
            </span>
            <span className="truncate text-[11px] text-slate-400" title={m.id}>
              {m.id.slice(0, 6)}…{m.id.slice(-4)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  ) : null

  return (
    <>
      <RoomsShell activeRoomId={roomId}>
        {token ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div>{chatPane}</div>
            <div className="hidden lg:block">{membersPane}</div>
            <div className="lg:hidden">
              {memberList.length > 0 && (
                <details className="rounded-xl border border-white/10 bg-white/5 p-3 text-white">
                  <summary className="cursor-pointer text-sm font-semibold text-white">
                    Members ({memberList.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {memberList.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <span className="truncate">{m.name}</span>
                        <span className="truncate text-[11px] text-slate-400">
                          {m.id.slice(0, 6)}…{m.id.slice(-4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ) : (
          loginPrompt
        )}
      </RoomsShell>
      {copyToast && <CopyToast message={copyToast} />}
    </>
  )
}

// Lightweight toast for copy feedback
function CopyToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-50 shadow-lg shadow-emerald-500/20">
      {message}
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
