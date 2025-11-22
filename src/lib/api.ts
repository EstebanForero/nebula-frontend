const DEFAULT_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'

export type Visibility = 'public' | 'private'

export type Room = {
  id: string
  name: string
  visibility: Visibility
  createdBy: string
  createdAt: string
}

export type Message = {
  id: string
  roomId: string
  senderId: string
  content: string
  createdAt: string
}

type ApiOptions = {
  token?: string | null
  baseUrl?: string
  init?: RequestInit
}

export class HttpError extends Error {
  status: number
  body?: string

  constructor(message: string, status: number, body?: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

const normalizeBaseUrl = (baseUrl?: string) => {
  const raw = baseUrl || DEFAULT_BASE_URL
  const hasProtocol = /^https?:\/\//i.test(raw) || /^wss?:\/\//i.test(raw)
  const withProtocol = hasProtocol ? raw : `http://${raw}`
  return withProtocol.replace(/\/$/, '')
}

export async function apiFetch<T>(
  path: string,
  { token, baseUrl, init }: ApiOptions = {},
): Promise<T> {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`

  const headers = new Headers(init?.headers ?? {})
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new HttpError(
      errorText || `Request failed with status ${res.status}`,
      res.status,
      errorText,
    )
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }

  return (await res.text()) as unknown as T
}

export async function login(
  payload: { identifier: string; password: string },
  opts: ApiOptions,
) {
  const data = await apiFetch<Record<string, unknown> | string>('/login', {
    ...opts,
    init: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  })

  const token =
    (typeof data === 'string' ? data.trim() : null) ||
    (typeof data === 'object' ? (data.token as string | undefined) : undefined) ||
    (typeof data === 'object' ? (data.access_token as string | undefined) : undefined) ||
    (typeof data === 'object' ? (data.accessToken as string | undefined) : undefined)

  if (!token) {
    throw new Error('Token was not returned by the API')
  }

  return { token, raw: data }
}

export async function register(
  payload: { username: string; email: string; password: string },
  opts: ApiOptions,
) {
  return apiFetch<Record<string, unknown>>('/register', {
    ...opts,
    init: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  })
}

export async function createRoom(
  payload: { name: string; visibility: Visibility; password?: string | null },
  opts: ApiOptions,
) {
  return apiFetch<Room>('/room', {
    ...opts,
    init: {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        password: payload.password ?? null,
      }),
    },
  })
}

export async function joinRoom(
  roomId: string,
  payload: { password?: string | null } = {},
  opts: ApiOptions = {},
) {
  return apiFetch<Room>(`/room/join/${roomId}`, {
    ...opts,
    init: {
      method: 'POST',
      body: payload.password ? JSON.stringify(payload) : undefined,
    },
  })
}

export async function getUserRooms(opts: ApiOptions) {
  return apiFetch<Room[]>('/rooms', opts)
}

export async function getPublicRooms(opts: ApiOptions) {
  return apiFetch<Room[]>('/rooms/public', opts)
}

export async function sendMessage(
  payload: { room_id: string; content: string },
  opts: ApiOptions,
) {
  return apiFetch<Message>('/message', {
    ...opts,
    init: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  })
}

export async function getMessages(
  params: { room_id: string; page?: number; page_size?: number },
  opts: ApiOptions,
) {
  const search = new URLSearchParams({
    room_id: params.room_id,
  })
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))

  return apiFetch<Message[]>(`/message?${search.toString()}`, opts)
}

export function buildRoomWsUrl(roomId: string, baseUrl?: string, token?: string) {
  const base = normalizeBaseUrl(baseUrl)
  const wsBase = base.replace(/^https?/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'))
  const url = new URL(`/ws/room/${roomId}`, wsBase)
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

export function isAuthError(err: unknown) {
  return err instanceof HttpError && err.status === 401
}

export { DEFAULT_BASE_URL }
