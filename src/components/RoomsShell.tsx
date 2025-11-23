import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, RefreshCw } from 'lucide-react'

import type { Room, Visibility } from '../lib/api'
import { createRoom, getPublicRooms, getUserRooms, isAuthError, joinRoom } from '../lib/api'
import { useSession } from './SessionProvider'
import { useRouterState } from '@tanstack/react-router'

type RoomsShellProps = {
  children: ReactNode
  activeRoomId?: string
}

export function RoomsShell({ children, activeRoomId }: RoomsShellProps) {
  const { token, logout } = useSession()
  const routerState = useRouterState()
  const navigate = useNavigate()
  const [userRooms, setUserRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createVisibility, setCreateVisibility] = useState<Visibility>('public')
  const [createPassword, setCreatePassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [exploreTab, setExploreTab] = useState<'public' | 'private'>('public')
  const [showAllPublic, setShowAllPublic] = useState(false)

  const filteredPublic = useMemo(() => {
    if (!search.trim()) return publicRooms
    return publicRooms.filter((room) =>
      room.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
  }, [search, publicRooms])
  const showPrivatePasswordWarning = createVisibility === 'private'

  const fetchRooms = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [mine, pubs] = await Promise.all([
        getUserRooms({ token }),
        getPublicRooms({ token }),
      ])
      setUserRooms(Array.isArray(mine) ? mine : [])
      setPublicRooms(Array.isArray(pubs) ? pubs : [])
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to load rooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, routerState.location.pathname, routerState.location.search])

  const handleJoin = async (room: Room, password?: string | null) => {
    if (!token) {
      navigate({ to: '/login' })
      return
    }
    setJoiningId(room.id)
    setError(null)
    try {
      await joinRoom(room.id, { password: password ?? null }, { token })
      setUserRooms((prev) => {
        const exists = prev.some((r) => r.id === room.id)
        return exists ? prev : [...prev, room]
      })
      setModalOpen(false)
      navigate({ to: '/rooms/$roomId', params: { roomId: room.id } })
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to join room')
    } finally {
      setJoiningId(null)
    }
  }

  const handleJoinById = async () => {
    if (!joinRoomId.trim()) return
    await handleJoin(
      {
        id: joinRoomId.trim(),
        name: joinRoomId.trim(),
        visibility: 'private',
        createdAt: new Date().toISOString(),
        createdBy: '',
      },
      joinPassword || null,
    )
  }

  const handleCreate = async () => {
    if (!token) {
      navigate({ to: '/login' })
      return
    }
    setCreating(true)
    setError(null)
    try {
      const newRoom = await createRoom(
        {
          name: createName.trim(),
          visibility: createVisibility,
          password: createVisibility === 'private' ? createPassword || null : null,
        },
        { token },
      )
      setUserRooms((prev) => [...prev, newRoom])
      if (newRoom.visibility === 'public') {
        setPublicRooms((prev) => [...prev, newRoom])
      }
      setCreateName('')
      setCreatePassword('')
      setCreateVisibility('public')
      setModalOpen(false)
      navigate({ to: '/rooms/$roomId', params: { roomId: newRoom.id } })
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to create room')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative grid min-h-[70vh] grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-cyan-500/5 lg:grid-cols-[320px_1fr] lg:gap-6 lg:p-4">
      <aside className="flex max-h-[70vh] flex-col gap-4 rounded-xl border border-white/10 bg-[#0a0f1a]/80 p-4 shadow-inner shadow-black/40 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Rooms</p>
            <h3 className="text-lg font-semibold text-white">Your list</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRooms}
              className="rounded-lg border border-white/10 p-2 text-slate-200 hover:border-cyan-400/60 hover:text-white"
              title="Refresh rooms"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 p-2 text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-indigo-500/30"
              title="Explore rooms"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {token ? (
          <div className="flex-1 space-y-2 overflow-y-auto pr-2">
            {loading && <p className="text-slate-400 text-sm">Loading rooms…</p>}
            {!loading && userRooms.length === 0 && (
              <p className="text-slate-500 text-sm">
                No rooms yet. Click the plus to explore or join a private room.
              </p>
            )}
            {Array.isArray(userRooms) &&
              userRooms.map((room) => (
                <Link
                  key={room.id}
                  to="/rooms/$roomId"
                  params={{ roomId: room.id }}
                  className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm transition ${
                    activeRoomId === room.id
                      ? 'border-cyan-400/60 bg-cyan-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:text-white'
                  }`}
                >
                  <span className="font-semibold">{room.name}</span>
                  <span className="text-[11px] text-slate-400">ID: {room.id}</span>
                </Link>
              ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            Log in to view and join rooms.
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}
      </aside>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 sm:p-4 shadow-inner shadow-black/30">
        {children}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0f1a] p-6 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Discover</p>
                <h3 className="text-2xl font-semibold text-white">Find a room</h3>
                <p className="text-slate-400 text-sm">
                  Search public rooms or join a private one with its ID and password.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200 hover:border-cyan-400/60 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-6 lg:grid lg:grid-cols-[1.3fr,1fr] lg:gap-6 lg:space-y-0">
              <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex w-full gap-2 rounded-lg bg-black/30 p-1 ring-1 ring-white/10">
                    <button
                      type="button"
                      onClick={() => setExploreTab('public')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        exploreTab === 'public'
                          ? 'bg-gradient-to-r from-cyan-500/30 to-indigo-500/30 text-white ring-1 ring-cyan-400/40'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Public rooms
                    </button>
                    <button
                      type="button"
                      onClick={() => setExploreTab('private')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        exploreTab === 'private'
                          ? 'bg-gradient-to-r from-fuchsia-500/25 to-rose-500/25 text-white ring-1 ring-fuchsia-400/40'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Private room
                    </button>
                  </div>
                </div>

                {exploreTab === 'public' ? (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search public rooms"
                        className="w-full bg-transparent text-white focus:outline-none"
                      />
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                      {Array.isArray(filteredPublic) &&
                        (showAllPublic ? filteredPublic : filteredPublic.slice(0, 5)).map((room) => (
                          <div
                            key={room.id}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <div>
                              <p className="font-semibold text-white">{room.name}</p>
                              <p className="text-xs text-slate-400">Visibility: {room.visibility}</p>
                            </div>
                            <button
                              onClick={() => handleJoin(room)}
                              disabled={joiningId === room.id}
                              className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-cyan-500/30 transition disabled:opacity-60"
                            >
                              {joiningId === room.id ? 'Joining…' : 'Join'}
                            </button>
                          </div>
                        ))}
                      {!filteredPublic.length && (
                        <p className="text-sm text-slate-500">No public rooms found.</p>
                      )}
                    </div>
                    {filteredPublic.length > 5 && (
                      <div className="flex items-center justify-end gap-3 pt-2 text-xs text-slate-400">
                        <span>
                          Showing {showAllPublic ? filteredPublic.length : Math.min(5, filteredPublic.length)} of{' '}
                          {filteredPublic.length}
                        </span>
                        <button
                          onClick={() => setShowAllPublic((v) => !v)}
                          className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold text-white hover:border-cyan-400/60"
                        >
                          {showAllPublic ? 'Show fewer' : 'Show all'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">Join by room ID</p>
                    <input
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      placeholder="Room ID"
                      className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <input
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Password (if required)"
                      className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      onClick={handleJoinById}
                      disabled={!joinRoomId.trim()}
                      className="w-full rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25 disabled:opacity-60"
                    >
                      Join room
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Create a new room</p>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Room name"
                  className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('public')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      createVisibility === 'public'
                        ? 'border-cyan-400/80 bg-cyan-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-white'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('private')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      createVisibility === 'private'
                        ? 'border-fuchsia-400/80 bg-fuchsia-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-fuchsia-300/40 hover:text-white'
                    }`}
                  >
                    Private
                  </button>
                </div>
                {createVisibility === 'private' && (
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white focus:border-fuchsia-400 focus:outline-none"
                  />
                )}
                {showPrivatePasswordWarning && (
                  <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Once you set a password, it cannot be recovered. Be sure to remember it before creating the room.
                  </p>
                )}
                <button
                  onClick={handleCreate}
                  disabled={!createName.trim() || creating}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-cyan-500/30 transition hover:shadow-indigo-500/30 disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create & join'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
