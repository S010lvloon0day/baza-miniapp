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

async function post<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { method: 'POST', headers: headers() })
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
  premium_required?: boolean
}

export interface Profile {
  user_id: number
  name: string
  is_premium: boolean
  premium_until?: string
}

export interface Plan {
  days: number
  label: string
  price: number
  stars?: number
}

export interface Config {
  plans: Plan[]
  currency: string
  bot_username?: string
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
  config:         ()             => get<Config>('/api/config'),
  documentText:   (id: number)   => get<{ title: string; text: string; extension: string; truncated?: boolean }>(`/api/document_text/${id}`),
  favorites:      ()             => get<{ ids: number[]; materials: Material[] }>('/api/favorites'),
  favorite:       (id: number)   => get<{ favorite: boolean }>(`/api/favorites/${id}`),
  addFavorite:    (id: number)   => post<{ ok: boolean; favorite: boolean }>(`/api/favorites/${id}`),
  removeFavorite: (id: number)   => del<{ ok: boolean; favorite: boolean }>(`/api/favorites/${id}`),
  sendFile:       (id: number)   => post<{ ok: boolean; error?: string }>(`/api/send_file/${id}`),
  starsInvoice:   (days: number) => post<{ invoice_link: string; stars: number }>(`/api/stars_invoice/${days}`),
  cryptoInvoice:  (days: number) => post<{ pay_url: string; invoice_id: string; days: number; price: number }>(`/api/crypto_invoice/${days}`),
  history:        ()             => get<{ materials: Material[] }>('/api/history'),
  clearHistory:   ()             => del<{ ok: boolean }>('/api/history'),
  banner:         ()             => get<{ banner: Banner | null }>('/api/banner'),
}
