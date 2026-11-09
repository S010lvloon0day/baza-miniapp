import { API_BASE } from './client'

const tg = (window as any).Telegram?.WebApp

const headers = (): HeadersInit => ({
  'X-Init-Data': tg?.initData || '',
  'Content-Type': 'application/json',
})

export interface SkladHit {
  thread_id: number
  title: string
  label: string
  author: string
}

export interface SkladStatus {
  premium: boolean
  used_today: number
  limit: number
  active?: { title: string; status: 'queued' | 'processing'; position: number }
}

export interface SkladOrder {
  status: 'queued' | 'active' | 'limit'
  position?: number
  title?: string
  limit?: number
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { headers: headers() })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as T
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as T
}

export const sklad = {
  search: (q: string) =>
    get<{ results: SkladHit[] }>(`/api/sklad/search?q=${encodeURIComponent(q)}`),
  download: (thread_id: number) =>
    post<SkladOrder>('/api/sklad/download', { thread_id }),
  status: () => get<SkladStatus>('/api/sklad/status'),
}
