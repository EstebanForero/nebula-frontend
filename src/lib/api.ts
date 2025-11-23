const BACKEND_PATH = '/api/backend'
const NOTIFICATIONS_PATH = '/api/notifications'
const FALLBACK_BACKEND_ORIGIN = ''
const FALLBACK_NOTIFICATION_ORIGIN = ''

const resolveOrigin = (fallback?: string) => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return fallback
}

const ensureServicePath = (
  inputUrl: string | undefined,
  requiredPath: string,
  fallback?: string,
) => {
  const base = (inputUrl && inputUrl.trim()) || resolveOrigin(fallback) || ''
  const normalizedBase = base.replace(/\/+$/, '')
  const normalizedPath = requiredPath.startsWith('/') ? requiredPath : `/${requiredPath}`

  if (normalizedBase.endsWith(normalizedPath) || normalizedBase.includes(`${normalizedPath}/`)) {
    return normalizedBase
  }

  return `${normalizedBase}${normalizedPath}`
}

const alignWithPageProtocol = (url: string) => {
  if (typeof window === 'undefined') return url
  try {
    const parsed = new URL(url)
    if (window.location.protocol === 'https:' && parsed.protocol === 'http:' && parsed.host === window.location.host) {
      parsed.protocol = 'https:'
      return parsed.toString()
    }
    return parsed.toString()
  } catch {
    return url
  }
}

function getBaseUrl() {
  const customUrl = typeof window !== 'undefined' ? (window as any).CUSTOM_API_URL : undefined
  const runtimeEnv =
    typeof window !== 'undefined' ? (window as any).ENV?.VITE_API_BASE_URL : undefined
  const buildEnv = import.meta.env.VITE_API_BASE_URL as string | undefined
  const windowOrigin = typeof window !== 'undefined' ? window.location?.origin : undefined
  const candidate = customUrl || runtimeEnv || buildEnv || windowOrigin
  return ensureServicePath(
    candidate,
    BACKEND_PATH,
    runtimeEnv || buildEnv || windowOrigin || FALLBACK_BACKEND_ORIGIN,
  )
}

function getNotificationBaseUrl() {
  const customUrl =
    typeof window !== 'undefined' ? (window as any).CUSTOM_NOTIFICATION_URL : undefined
  const runtimeEnv =
    typeof window !== 'undefined' ? (window as any).ENV?.VITE_NOTIFICATION_BASE_URL : undefined
  const buildEnv = import.meta.env.VITE_NOTIFICATION_BASE_URL as string | undefined
  const windowOrigin = typeof window !== 'undefined' ? window.location?.origin : undefined
  const candidate = customUrl || runtimeEnv || buildEnv || windowOrigin
  const base = ensureServicePath(
    candidate,
    NOTIFICATIONS_PATH,
    runtimeEnv || buildEnv || windowOrigin || FALLBACK_NOTIFICATION_ORIGIN,
  )
  return alignWithPageProtocol(base)
}

// Remove the constants - functions should be called dynamically

// Export functions to set custom URLs
export function setCustomApiUrl(url: string) {
  if (typeof window !== 'undefined') {
    (window as any).CUSTOM_API_URL = url
  }
}

export function setCustomNotificationUrl(url: string) {
  if (typeof window !== 'undefined') {
    (window as any).CUSTOM_NOTIFICATION_URL = url
  }
}

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

const normalizeBaseUrl = () => {
  const raw = getBaseUrl()
  const hasProtocol = /^https?:\/\//i.test(raw) || /^wss?:\/\//i.test(raw)
  const withProtocol = hasProtocol ? raw : `http://${raw}`
  return withProtocol.replace(/\/$/, '')
}

export async function apiFetch<T>(
  path: string,
  { token, init }: ApiOptions = {},
): Promise<T> {
  const url = `${normalizeBaseUrl()}${path}`

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

export function buildRoomWsUrl(roomId: string, token?: string) {
  // Convert to WebSocket origin by removing /api/backend path and converting protocol
  const httpBase = normalizeBaseUrl().replace(/\/api\/backend$/, '')
  const wsBase = httpBase.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')

  const url = new URL(`/api/backend/ws/rooms/${roomId}`, wsBase)
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
  const base = opts.notificationBaseUrl || getNotificationBaseUrl()
  const url = `${base}/webpush/subscribe`
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

export { getBaseUrl, getNotificationBaseUrl }
