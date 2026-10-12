import { API_BASE } from './client'

const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp

/** Комментарий к материалу. team — ответ от команды базы (админ). */
export interface MaterialComment {
  id: number
  author: string
  text: string
  created_at: string
  likes: number
  liked: boolean
  mine: boolean
  team: boolean
  /** null — корневой комментарий; иначе id корня, к которому это ответ. */
  parent_id: number | null
  /** Ответы (только у корневых комментариев). */
  replies?: MaterialComment[]
}

export interface SocialData {
  rating: number
  rating_count: number
  my_rating: number
  comments_count: number
  comments: MaterialComment[]
  has_more: boolean
  /** Можно оценивать/комментировать (Premium с доступом к материалу или админ). */
  can_interact: boolean
  /** Не-премиум видит только пару лучших комментариев, обрезанных. */
  preview: boolean
  is_admin: boolean
}

/** Ответ сервера. Ошибку не бросаем: message нужен, чтобы показать её человеку. */
export type Result<T> = ({ ok: true } & T) | { ok: false; error: string; message?: string; status: number }

async function call<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: { 'X-Init-Data': tg?.initData || '', 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, status: res.status, error: data.error || 'error', message: data.message }
    return { ok: true, ...data }
  } catch {
    return { ok: false, status: 0, error: 'network', message: 'Нет связи — попробуйте ещё раз.' }
  }
}

export const social = {
  get: (id: number, sort: 'top' | 'new' = 'top', offset = 0) =>
    call<SocialData>('GET', `/api/material/${id}/social?sort=${sort}&offset=${offset}`),
  rate: (id: number, rating: number) =>
    call<{ rating: number; rating_count: number; my_rating: number; comments_count: number }>(
      'POST', `/api/material/${id}/rate`, { rating }),
  comment: (id: number, text: string, parentId?: number) =>
    call<{ comment: MaterialComment; cut: boolean; comments_count: number }>(
      'POST', `/api/material/${id}/comments`, parentId ? { text, parent_id: parentId } : { text }),
  remove: (commentId: number) => call<Record<string, never>>('DELETE', `/api/comments/${commentId}`),
  like: (commentId: number) => call<{ liked: boolean; likes: number }>('POST', `/api/comments/${commentId}/like`),
  report: (commentId: number) =>
    call<{ hidden?: boolean; already?: boolean }>('POST', `/api/comments/${commentId}/report`),
  restore: (commentId: number) => call<Record<string, never>>('POST', `/api/comments/${commentId}/restore`),
}

/* ─── Лента «Обсуждения» для админа ─────────────────────────────────────── */

export interface FeedCounts {
  comments: number
  ratings: number
  total: number
  unanswered: number
  hidden: number
}

interface FeedBase {
  material_id: number
  material_title: string
  section_title: string | null
  user_id: number
  author: string
  /** Время события (UTC, формат SQLite). */
  at: string
  /** Появилось после последнего просмотра ленты. */
  new: boolean
}

export interface FeedComment extends FeedBase {
  type: 'comment'
  id: number
  text: string
  hidden: boolean
  reports: number
  parent_id: number | null
  parent_text: string | null
  parent_author: string | null
  replies: number
  /** Команда уже ответила на этот комментарий. */
  answered: boolean
}

export interface FeedRating extends FeedBase {
  type: 'rating'
  rating: number
}

export type FeedItem = FeedComment | FeedRating
export type FeedKind = 'all' | 'unanswered' | 'comments' | 'ratings' | 'hidden'

export const feedback = {
  list: (kind: FeedKind, offset = 0) =>
    call<{ items: FeedItem[]; has_more: boolean; seen: string; counts: FeedCounts }>(
      'GET', `/api/admin/feedback?kind=${kind}&offset=${offset}`),
  unread: () => call<FeedCounts>('GET', '/api/admin/feedback/unread'),
  seen: () => call<Record<string, never>>('POST', '/api/admin/feedback/seen'),
}

/** «1 оценка / 2 оценки / 5 оценок». */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** created_at из SQLite — UTC без зоны: «2026-10-12 19:31:04». */
export function timeAgo(s: string): string {
  const t = new Date(s.replace(' ', 'T') + 'Z').getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, (Date.now() - t) / 1000)
  if (sec < 60) return 'только что'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`
  return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
