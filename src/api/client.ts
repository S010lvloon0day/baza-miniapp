const tg = (window as any).Telegram?.WebApp

export const API_BASE =
  location.hostname === 'localhost' || location.protocol === 'file:'
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_BASE_URL

const headers = (): HeadersInit => ({
  'X-Init-Data': tg?.initData || '',
  'Content-Type': 'application/json',
})

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { headers: headers() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: body !== undefined ? { ...headers(), 'Content-Type': 'application/json' } : headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface Section {
  id: number
  parent_id: number | null
  title: string
  emoji: string
  description: string
  is_premium: number
  price?: number
  owned?: boolean
  locked?: boolean
}

export interface Material {
  id: number
  section_id: number
  title: string
  content: string
  media_type: 'photo' | 'video' | 'document' | 'text'
  is_premium: number
  locked?: boolean
  file_url?: string
  can_send?: boolean
  section_title?: string
  section_emoji?: string
  created_at?: string
  premium_required?: boolean
}

export interface TodaySection {
  id: number
  title: string
  emoji: string
}

export interface Profile {
  user_id: number
  name: string
  is_premium: boolean
  premium_until?: string
  contributions_total?: number
  contributions_approved?: number
}

export interface Contributor {
  user_id: number
  username: string
  approved: number
}

export interface Plan {
  days: number
  label: string
  price: number
}

export interface Config {
  plans: Plan[]
  currency: string
  bot_username?: string
  giveaway_visible?: boolean
}

export interface Banner {
  emoji: string
  title: string
  text: string
  link: string
  file_id?: string
  media_type?: 'photo' | 'animation'
}

export const api = {
  sections:       ()             => get<{ sections: Section[] }>('/api/sections'),
  subsections:    (id: number)   => get<{ sections: Section[] }>(`/api/sections?parent_id=${id}`),
  materials:      (id: number, page = 0) =>
    get<{ materials: Material[]; total: number }>(`/api/sections/${id}/materials?page=${page}`),
  material:       (id: number)   => get<Material>(`/api/material/${id}`),
  profile:        ()             => get<Profile>('/api/profile'),
  contributors:   ()             => get<{ contributors: Contributor[]; total: number; my_rank: number | null; my_approved: number }>('/api/contributors'),
  config:         ()             => get<Config>('/api/config'),
  documentText:   (id: number)   => get<{ title: string; text: string; extension: string; truncated?: boolean }>(`/api/document_text/${id}`),
  favorites:      ()             => get<{ ids: number[]; materials: Material[] }>('/api/favorites'),
  favorite:       (id: number)   => get<{ favorite: boolean }>(`/api/favorites/${id}`),
  addFavorite:    (id: number)   => post<{ ok: boolean; favorite: boolean }>(`/api/favorites/${id}`),
  removeFavorite: (id: number)   => del<{ ok: boolean; favorite: boolean }>(`/api/favorites/${id}`),
  sendFile:       (id: number)   => post<{ ok: boolean; error?: string }>(`/api/send_file/${id}`),
  cryptoInvoice:  (days: number) => post<{ pay_url: string; invoice_id: string; days: number; price: number }>(`/api/crypto_invoice/${days}`),
  recent:         ()             => get<{ materials: Material[]; today_count: number; today_sections: TodaySection[]; total_count: number }>('/api/recent'),
  history:        ()             => get<{ materials: Material[] }>('/api/history'),
  clearHistory:   ()             => del<{ ok: boolean }>('/api/history'),
  banner:         ()             => get<{ banners: Banner[] }>('/api/banner'),
  notifyGet:      ()             => get<{ enabled: boolean }>('/api/notify'),
  notifySet:      (enabled: boolean) => post<{ enabled: boolean }>('/api/notify', { enabled }),
  search:         (q: string)    => get<{ materials: Material[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  giveawayCheck:  (level: number, code: string) => post<{ ok: boolean; error?: string; winner?: string }>('/api/giveaway/check', { level, code }),
  giveawayWinner: () => get<{ winner: { username: string; won_at: string } | null }>('/api/giveaway/winner'),
  giveawayProgress: () => get<{ level: number }>('/api/giveaway/progress'),
  giveawayHints: (stage: number) =>
    get<{ hints: { idx: number; unlocked: boolean; price: number; text: string | null }[] }>(`/api/giveaway/hints/${stage}`),
  giveawayHintInvoice: (stage: number, hintIdx: number) =>
    post<{ pay_url?: string; invoice_id?: string; stage?: number; hint_idx?: number; price?: number; error?: string }>('/api/giveaway/hint_invoice', { stage, hint_idx: hintIdx }),
  giveawayHintConfirm: (invoiceId: string) =>
    post<{ ok?: boolean; status?: string; stage?: number; hint_idx?: number; text?: string; error?: string }>('/api/giveaway/hint_confirm', { invoice_id: invoiceId }),
  courseInvoice: (sectionId: number) =>
    post<{ pay_url?: string; invoice_id?: string; section_id?: number; price?: number; error?: string }>('/api/course/invoice', { section_id: sectionId }),
  courseConfirm: (invoiceId: string) =>
    post<{ ok?: boolean; status?: string; section_id?: number; error?: string }>('/api/course/confirm', { invoice_id: invoiceId }),
}

// URL медиа-ассета этапа. init_data в query — <video>/<img> не умеют слать заголовки.
export function giveawayAssetUrl(stage: number, file: string): string {
  const init = encodeURIComponent(tg?.initData || '')
  return `${API_BASE}/api/giveaway/asset/${stage}/${file}?init_data=${init}`
}
