import { API_BASE } from './client'

const tg = (window as any).Telegram?.WebApp

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: { 'X-Init-Data': tg?.initData || '', 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  return data as T
}
const get = <T,>(p: string) => req<T>('GET', p)
const post = <T,>(p: string, b: unknown = {}) => req<T>('POST', p, b)
const del = <T,>(p: string) => req<T>('DELETE', p)
const qs = (o: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()

export interface Overview {
  users: number; premium: number; new_1d: number; new_7d: number; active_1d: number; active_7d: number; banned: number
  sections: number; materials: number; pending_submissions: number; reported_comments: number
  rub_30d: number; rub_30d_count: number; pay_30d: number; pay_30d_count: number
  signups: { d: string; n: number }[]
  top_materials: { id: number; title: string; views: number }[]
  recent_users: { id: number; username: string; name: string; joined_at: string; premium: boolean }[]
  revenue: { d: string; sum: number }[]
}
export interface AUser { id: number; username: string; name: string; joined_at: string; premium_until: string | null; premium: boolean; banned: boolean; last_seen?: string | null }
export interface AUserFull extends AUser {
  ban_reason: string; banned_at: string | null
  xp: { xp: number; streak: number; best: number; last: string } | null
  views: number; favorites: number; last_seen: string | null
  payments: { src: string; amount: number; days: number; at: string; status: string }[]
  courses: { section_id: number; title: string; at: string }[]
  logs: { action: string; detail: string; at: string }[]
  limits: Record<string, number> | null
  history: { id: number; title: string | null; at: string }[]
}
export interface ASection {
  id: number; parent_id: number | null; title: string; emoji: string; description: string; is_premium: boolean
  position: number; is_active: boolean; price: number; type: string; materials: number; children: number
}
export interface AMaterialRow { id: number; title: string; media_type: string; is_premium: boolean; position: number; created_at: string; files: number; section_id?: number; section_title?: string }
export interface AFile { id: number; position: number; kind: string; name: string; caption: string; text: string }
export interface AMaterial { id: number; section_id: number; title: string; content: string; media_type: string; is_premium: boolean; created_at: string; files: AFile[] }
export interface ASubmission { id: number; user_id: number; username: string; title: string; content: string; media_type: string; status: string; created_at: string; section_id: number | null; section_title: string; files: number; reject_reason: string }
export interface AComment { id: number; material_id: number; material_title: string; user_id: number; author: string; text: string; created_at: string; hidden: boolean; reports: number }
export interface ABanner { emoji: string; title: string; text: string; link: string; file_id: string }
export interface APinned { type: 'text' | 'photo' | 'animation' | 'sticker'; content: string; caption: string }
export interface ABroadcast { running: boolean; sent: number; failed: number; total: number; started: string | null; finished: string | null; target: string }
export interface APayment { src: string; user_id: number; username: string; amount: number; days: number | null; at: string; status: string; kind: string }
export interface ALog { id: number; user_id: number; action: string; detail: string; at: string }

export interface ALimitUser { id: number; username: string; name: string; hour: number; day: number; month: number; blocked_24h: number; last: string | null; paused: '' | 'hour' | 'day'; autoban: boolean; ban_reason: string; unlock_at: string | null; load: number }
export interface ALimits { limits: { hour: number; day: number; month: number }; users: ALimitUser[]; counts: { paused: number; banned: number } }

export interface AQuestion { variant?: number; q: string; options: string[]; correct: number; source?: string }
export interface AQuestions { kind: string; seconds: number; xp: number; questions: AQuestion[] }
export interface AWeek {
  prizes: number[]; week_end: string; week_start: string; rules_from: string; rules_active: boolean; daily_cap: number
  rows: { id: number; name: string; username: string; xp: number; issues: string[] }[]
  history: { id: number; week_start: string; place: number; user_id: number; name: string; xp: number; days: number; status: string }[]
}

export const adminApi = {
  questions: (mid: number) => get<AQuestions>(`/api/admin/material/${mid}/questions`),
  saveQuestions: (mid: number, questions: AQuestion[]) => post<AQuestions>(`/api/admin/material/${mid}/questions`, { questions }),
  regenQuestions: (mid: number) => post<AQuestions>(`/api/admin/material/${mid}/questions`, { regenerate: true }),
  week: () => get<AWeek>('/api/admin/week'),
  revokePrize: (id: number) => post(`/api/admin/week/${id}/revoke`),
  limits: (filter: string) => get<ALimits>(`/api/admin/limits?${qs({ filter })}`),
  limitReset: (id: number, scope: 'hour' | 'day' | 'all') => post(`/api/admin/limits/${id}/reset`, { scope }),
  overview: () => get<Overview>('/api/admin/overview'),
  users: (q: string, filter: string, offset = 0, sort = 'new') => get<{ total: number; users: AUser[] }>(`/api/admin/users?${qs({ q, filter, offset, sort })}`),
  user: (id: number) => get<AUserFull>(`/api/admin/users/${id}`),
  premium: (id: number, days: number, notify: boolean) => post<{ premium_until: string }>(`/api/admin/users/${id}/premium`, { days, notify }),
  revokePremium: (id: number) => post(`/api/admin/users/${id}/premium`, { action: 'revoke' }),
  ban: (id: number, reason: string) => post(`/api/admin/users/${id}/ban`, { reason }),
  unban: (id: number) => post(`/api/admin/users/${id}/ban`, { action: 'unban' }),
  resetLimit: (id: number) => post(`/api/admin/users/${id}/resetlimit`),
  message: (id: number, text: string) => post(`/api/admin/users/${id}/message`, { text }),

  tree: () => get<{ sections: ASection[] }>('/api/admin/tree'),
  createSection: (b: Partial<ASection>) => post<{ id: number }>('/api/admin/section', b),
  updateSection: (id: number, b: Partial<ASection>) => post(`/api/admin/section/${id}`, b),
  deleteSection: (id: number) => del(`/api/admin/section/${id}`),
  reorderSections: (ids: number[]) => post('/api/admin/sections/reorder', { ids }),

  materials: (sid: number) => get<{ materials: AMaterialRow[] }>(`/api/admin/section/${sid}/materials`),
  searchMaterials: (q: string) => get<{ materials: AMaterialRow[] }>(`/api/admin/materials/search?${qs({ q })}`),
  material: (id: number) => get<AMaterial>(`/api/admin/material/${id}`),
  updateMaterial: (id: number, b: Partial<AMaterial>) => post(`/api/admin/material/${id}`, b),
  deleteMaterial: (id: number) => del(`/api/admin/material/${id}`),
  reorderMaterials: (ids: number[]) => post('/api/admin/materials/reorder', { ids }),
  addFile: (mid: number, f: Record<string, unknown>) => post<{ id: number }>(`/api/admin/material/${mid}/files`, f),
  updateFile: (fid: number, b: Record<string, unknown>) => post(`/api/admin/file/${fid}`, b),
  deleteFile: (fid: number) => del(`/api/admin/file/${fid}`),

  submissions: (status: string) => get<{ submissions: ASubmission[] }>(`/api/admin/submissions?${qs({ status })}`),
  approve: (id: number, section_id: number, is_premium: boolean) => post(`/api/admin/submissions/${id}/approve`, { section_id, is_premium }),
  reject: (id: number, reason: string) => post(`/api/admin/submissions/${id}/reject`, { reason }),

  comments: (filter: string) => get<{ comments: AComment[] }>(`/api/admin/comments?${qs({ filter })}`),
  comment: (id: number, action: 'hide' | 'show' | 'delete') => post(`/api/admin/comments/${id}`, { action }),

  banners: () => get<{ banners: ABanner[] }>('/api/admin/banners'),
  saveBanners: (banners: ABanner[]) => post<{ banners: ABanner[] }>('/api/admin/banners', { banners }),
  pinned: () => get<APinned>('/api/admin/pinned'),
  savePinned: (p: APinned) => post('/api/admin/pinned', p),
  broadcast: (text: string, target: string, test: boolean, photo?: string) => post('/api/admin/broadcast', { text, target, test, photo }),
  broadcastStatus: () => get<ABroadcast>('/api/admin/broadcast'),
  payments: () => get<{ payments: APayment[]; total_rub: number; total_other: number; count_other: number }>('/api/admin/payments'),
  logs: (o: { action?: string; user?: string; admin?: string }) => get<{ logs: ALog[] }>(`/api/admin/logs?${qs(o)}`),
}
