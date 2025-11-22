const DEFAULT_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'
const DEFAULT_NOTIFICATION_URL =
  (import.meta.env.VITE_NOTIFICATION_BASE_URL as string | undefined) || 'http://localhost:3010'

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

export type User = {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

export type WebPushSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

type ApiOptions = {
  token?: string | null
  baseUrl?: string
  init?: RequestInit
  notificationBaseUrl?: string
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
  const data = await apiFetch<Record<string, unknown> | string>('/auth/login', {
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
  return apiFetch<Record<string, unknown>>('/auth/register', {
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
  return apiFetch<Room>('/rooms', {
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
  return apiFetch<Room>(`/rooms/${roomId}/members`, {
    ...opts,
    init: {
      method: 'POST',
      body: JSON.stringify({
        password: payload.password ?? null,
      }),
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
  return apiFetch<Message>(`/rooms/${payload.room_id}/messages`, {
    ...opts,
    init: {
      method: 'POST',
      body: JSON.stringify({
        content: payload.content,
      }),
    },
  })
}

export async function getMessages(
  params: { room_id: string; page?: number; page_size?: number },
  opts: ApiOptions,
) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))

  const queryString = search.toString() ? `?${search.toString()}` : ''
  return apiFetch<Message[]>(`/rooms/${params.room_id}/messages${queryString}`, opts)
}

export function buildRoomWsUrl(roomId: string, baseUrl?: string, token?: string) {
  const base = normalizeBaseUrl(baseUrl)
  const wsBase = base.replace(/^https?/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'))
  const url = new URL(`/ws/rooms/${roomId}`, wsBase)
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

export function isAuthError(err: unknown) {
  return err instanceof HttpError && err.status === 401
}

export async function leaveRoom(roomId: string, opts: ApiOptions) {
  return apiFetch<void>(`/rooms/${roomId}/members/me`, {
    ...opts,
    init: { method: 'DELETE' },
  })
}

export async function getMe(opts: ApiOptions) {
  return apiFetch<User>('/me', opts)
}

export async function getRoomMembers(roomId: string, opts: ApiOptions) {
  return apiFetch<User[]>(`/rooms/${roomId}/members`, opts)
}

export async function subscribeWebPush(
  subscription: WebPushSubscription,
  opts: ApiOptions & { notificationBaseUrl?: string },
) {
  const base = opts.notificationBaseUrl || DEFAULT_NOTIFICATION_URL
  const url = `${normalizeBaseUrl(base)}/webpush/subscribe`
  const headers = new Headers(opts.init?.headers ?? {})
  headers.set('Content-Type', 'application/json')
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`)

  const res = await fetch(url, {
    ...opts.init,
    method: 'POST',
    headers,
    body: JSON.stringify({ subscription }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new HttpError(text || `Request failed with status ${res.status}`, res.status, text)
  }
  return (await res.json()) as Record<string, unknown>
}

export { DEFAULT_BASE_URL, DEFAULT_NOTIFICATION_URL }
