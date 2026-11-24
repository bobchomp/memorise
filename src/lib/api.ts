export interface TextDto {
  id: string
  title: string
  lang: number
  split: number
  body: string
  ver: number
  updated: number
  canUndo: boolean
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public data: Record<string, unknown> = {}) {
    super(message)
  }
}

let tokenGetter: (() => Promise<string | null>) | null = null
export function setTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn
}
export const isSignedIn = () => tokenGetter !== null

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('content-type', 'application/json')
  const token = tokenGetter ? await tokenGetter() : null
  if (token) headers.set('authorization', `Bearer ${token}`)
  let res: Response
  try {
    res = await fetch(path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'You appear to be offline')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data)
  return data as T
}

type TextInput = Pick<TextDto, 'title' | 'lang' | 'split' | 'body'>

export const api = {
  create: (t: TextInput) => call<TextDto>('/api/texts', { method: 'POST', body: JSON.stringify(t) }),
  get: (id: string) => call<TextDto>(`/api/texts/${encodeURIComponent(id)}`),
  update: (id: string, t: TextInput, ver: number) =>
    call<TextDto>(`/api/texts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ ...t, ver }) }),
  undo: (id: string, ver: number) =>
    call<TextDto>(`/api/texts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ ver, undo: true }) }),
  library: () =>
    call<{
      items: { id: string; title: string; lang: number; ver: number; textUpdated: number; progress: unknown; updated: number }[]
    }>('/api/library'),
  saveLibrary: (items: { id: string; progress: unknown; updated: number }[]) =>
    call('/api/library', { method: 'PUT', body: JSON.stringify({ items }) }),
  removeFromLibrary: (id: string) => call(`/api/library?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deleteAccount: () => call('/api/account', { method: 'DELETE' }),
}
