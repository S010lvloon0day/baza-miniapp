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
  where?: 'title' | 'text'
  ready?: boolean            // ссылки уже есть — выдача мгновенно
  wants?: number             // столько человек уже ждут этот курс в очереди
}

export interface SkladQueueItem {
  thread_id: number
  title: string
  position: number
  eta: number
  wants: number
  joined: boolean
}

export interface SkladStatus {
  premium: boolean
  used_today: number
  limit: number
  new_used?: number
  new_limit?: number
  cached_used?: number
  cached_limit?: number      // 0 — без ограничений
  new_free?: number
  new_prem?: number
  cached_free?: number
  queue?: SkladQueueItem[]
  queue_total?: number
  forum_busy?: boolean
  tokens_left?: number
  tokens_total?: number
}

export interface SkladLink {
  url: string
  host: string
  label: string
  title: string
}

export interface SkladCourse {
  status: 'ok' | 'limit' | 'nolinks' | 'queued'
  kind?: 'new' | 'cached' | 'join'
  instant?: boolean
  reason?: 'fair' | 'forum'
  already?: boolean
  joined?: boolean
  position?: number
  eta?: number
  wants?: number
  premium?: boolean
  thread_id?: number
  title?: string
  label?: string
  description?: string
  links?: SkladLink[]
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
    get<{ results: SkladHit[]; total?: number; more?: boolean }>(`/api/sklad/search?q=${encodeURIComponent(q)}`),
  course: (thread_id: number) =>
    post<SkladCourse>('/api/sklad/course', { thread_id }),
  status: () => get<SkladStatus>('/api/sklad/status'),
  unqueue: (thread_id: number) => post<{ ok: boolean; refunded?: boolean }>('/api/sklad/unqueue', { thread_id }),
}
