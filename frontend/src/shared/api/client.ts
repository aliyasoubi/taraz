import { t, tMaybe } from '@/shared/lib/i18n'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

type Json = Record<string, unknown> | unknown[]

/** The API sends error codes (`patient_not_found`); the message comes from the locale file. */
function detailOf(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('detail' in body)) return null
  const detail = (body as { detail: unknown }).detail
  if (typeof detail === 'string') return tMaybe(`errors.${detail}`)
  // FastAPI validation errors: [{loc, msg}, …]
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]) {
    return t('errors.invalid')
  }
  return null
}

async function request<T>(method: string, path: string, body?: Json): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      // The backend refuses writes without it: a cross-site form cannot set custom headers.
      'X-Requested-With': 'fetch',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, detailOf(data) ?? t(res.status >= 500 ? 'errors.server' : 'errors.request'))
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: Json) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: Json) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/** Downloads an authenticated file (the session cookie rides along on a same-origin link). */
export function download(path: string): void {
  const a = document.createElement('a')
  a.href = `/api${path}`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
