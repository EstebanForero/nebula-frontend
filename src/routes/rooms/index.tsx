import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import type { Room, Visibility } from '../../lib/api'
import { createRoom, getPublicRooms, getUserRooms, isAuthError, joinRoom } from '../../lib/api'
import { useSession } from '../../components/SessionProvider'

export const Route = createFileRoute('/rooms/')({
  component: RoomsPage,
})

function RoomsPage() {
  const navigate = useNavigate()
  const { token, baseUrl, logout } = useSession()

  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [password, setPassword] = useState('')
  const [joinPasswords, setJoinPasswords] = useState<Record<string, string>>({})

  const hasRooms = myRooms.length > 0 || publicRooms.length > 0

  const fetchRooms = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [mine, pubs] = await Promise.all([
        getUserRooms({ token, baseUrl }),
        getPublicRooms({ token, baseUrl }),
      ])
      setMyRooms(mine)
      setPublicRooms(pubs)
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
  }, [token, baseUrl])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('You need to be logged in to create rooms.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const newRoom = await createRoom(
        { name: roomName, visibility, password: visibility === 'private' ? password : null },
        { token, baseUrl },
      )
      setRoomName('')
      setPassword('')
      await fetchRooms()
      navigate({ to: '/rooms/$roomId', params: { roomId: newRoom.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create room')
    } finally {
      setCreating(false)
    }
  }

  const myRoomIds = new Set(myRooms.map((r) => r.id))

  const handleEnter = async (room: Room, alreadyJoined: boolean) => {
    if (!token) {
      setError('You need to be logged in to enter rooms.')
      return
    }
    setError(null)
    try {
      if (!alreadyJoined) {
        await joinRoom(
          room.id,
          room.visibility === 'private'
            ? { password: joinPasswords[room.id] || null }
            : { password: null },
          { token, baseUrl },
        )
        await fetchRooms()
      }
      navigate({ to: '/rooms/$roomId', params: { roomId: room.id } })
    } catch (err) {
      if (isAuthError(err)) {
        logout()
        navigate({ to: '/login' })
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to join room')
    }
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-cyan-500/5">
          <h1 className="text-3xl font-semibold text-white">Sign in to explore rooms</h1>
          <p className="mt-3 text-slate-400">
            We keep public and private rooms gated behind an account. Log in or register to see
            what&apos;s happening across Nebula.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-cyan-200 hover:border-cyan-300/60 hover:text-white transition"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/5 md:grid-cols-2">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Create</p>
          <h2 className="text-2xl font-semibold text-white mt-2">Start a new room</h2>
          <p className="text-slate-400 mt-2">
            Spin up a public lobby or a password-protected private space. You&apos;ll join
            automatically after creation.
          </p>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Room name</span>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="galactic-ops"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                visibility === 'public'
                  ? 'border-cyan-400/80 bg-cyan-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-white'
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                visibility === 'private'
                  ? 'border-fuchsia-400/80 bg-fuchsia-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-fuchsia-300/40 hover:text-white'
              }`}
            >
              Private
            </button>
          </div>

          {visibility === 'private' && (
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Room password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                placeholder="••••••"
                required
              />
            </label>
          )}

          <button
            type="submit"
            disabled={creating || !roomName}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create & enter'}
          </button>
        </form>
      </section>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <section className="space-y-4">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-cyan-500/15 ring-1 ring-cyan-500/50" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Your rooms</p>
            <h3 className="text-xl font-semibold text-white">Spaces you created or joined</h3>
          </div>
        </header>

        {loading && <p className="text-slate-400">Loading rooms…</p>}
        {!loading && myRooms.length === 0 && (
          <p className="text-slate-500">No rooms yet. Create one to get started.</p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {myRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              passwordValue={joinPasswords[room.id] || ''}
              onPasswordChange={(val) =>
                setJoinPasswords((prev) => ({
                  ...prev,
                  [room.id]: val,
                }))
              }
              onEnter={() => handleEnter(room, true)}
              alreadyJoined
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-500/15 ring-1 ring-purple-500/50" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-400">Public rooms</p>
            <h3 className="text-xl font-semibold text-white">Drop into any open lobby</h3>
          </div>
        </header>

        {loading && <p className="text-slate-400">Loading rooms…</p>}
        {!loading && publicRooms.length === 0 && (
          <p className="text-slate-500">No public rooms available right now.</p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publicRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              passwordValue={joinPasswords[room.id] || ''}
              onPasswordChange={(val) =>
                setJoinPasswords((prev) => ({
                  ...prev,
                  [room.id]: val,
                }))
              }
              onEnter={() => handleEnter(room, myRoomIds.has(room.id))}
              alreadyJoined={myRoomIds.has(room.id)}
            />
          ))}
        </div>
      </section>

      {!loading && !hasRooms && (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-slate-400">
          Nothing yet. Create a room above or refresh once you&apos;re invited to one.
        </div>
      )}
    </div>
  )
}

function RoomCard({
  room,
  onEnter,
  passwordValue,
  onPasswordChange,
  alreadyJoined = false,
}: {
  room: Room
  onEnter: () => void
  passwordValue: string
  onPasswordChange: (val: string) => void
  alreadyJoined?: boolean
}) {
  const isPrivate = room.visibility === 'private'
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5 shadow-lg shadow-black/30 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Room</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPrivate
              ? 'bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-500/40'
              : 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40'
          }`}
        >
          {room.visibility}
        </span>
      </div>
      <h4 className="text-xl font-semibold text-white">{room.name}</h4>
      <p className="mt-1 text-sm text-slate-400">ID: {room.id}</p>
      {isPrivate && (
        <input
          type="password"
          value={passwordValue}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Password to join"
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
        />
      )}
      <button
        onClick={onEnter}
        className="mt-4 w-full rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-white/25 hover:ring-cyan-400/60"
      >
        {alreadyJoined ? 'Enter room' : 'Join & enter'}
      </button>
    </div>
  )
}
