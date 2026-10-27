import type { CourseSummary } from './courses'
import { cleanTitles, shouldClean } from '../utils/title'

const tg = (window as any).Telegram?.WebApp

// короткоживущий токен для загрузки медиа чата (вместо initData в URL)
let _mtok = ''

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
  const data = await res.json()
  return shouldClean(path) ? cleanTitles(data) : data
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
  /** 'courses' — раздел показывает курсы конструктора вместо списка материалов */
  section_type?: 'materials' | 'courses'
}

/** Ответ /api/favorites: материалы + целые разделы и курсы в избранном. */
export interface FavoritesResponse {
  ids: number[]
  materials: Material[]
  section_ids?: number[]
  sections?: Section[]
  course_ids?: number[]
  courses?: CourseSummary[]
}

/** Вложение материала: файл либо текстовый блок. Материал может содержать
 *  несколько тех и других вперемешку, порядок задаётся полем position. */
export interface Attachment {
  id: number
  position: number
  kind: 'photo' | 'video' | 'document' | 'text'
  name?: string | null
  caption?: string | null
  /** Заполнен только у kind === 'text'. */
  text?: string | null
  /** Ссылка на файл; у текстового вложения null. */
  url?: string | null
}

export interface Material {
  id: number
  section_id: number
  title: string
  content: string
  media_type: 'photo' | 'video' | 'document' | 'text' | 'quiz' | 'task' | 'doc'
  is_premium: number
  locked?: boolean
  file_url?: string
  can_send?: boolean
  section_title?: string
  section_emoji?: string
  created_at?: string
  premium_required?: boolean
  /** Приходит только из /api/material/:id. Пусто у закрытых материалов. */
  attachments?: Attachment[]
  files_count?: number
  /** Материал пройден (засчитан). */
  viewed?: boolean
  /** Открывал, но ещё не прошёл. */
  opened?: boolean
  /** Условия зачёта (только в /api/material/:id). */
  progress?: MaterialProgress
  /** Средняя оценка, число оценок и комментариев (в списке раздела; нет — значит ещё не было). */
  rating?: number
  rating_count?: number
  comments_count?: number
  /** Файл материала — архив (.zip/.rar/...). */
  is_archive?: boolean
}

export interface ProgressQuestion { variant: number; text: string; options: string[] }
export interface MaterialProgress {
  active: boolean; done: boolean; kind?: 'lesson' | 'video' | 'quiz' | 'task' | 'tasks' | 'glance'
  seconds?: number; elapsed?: number; xp?: number; question?: ProgressQuestion | null; retry_in?: number
  video?: { duration: number; watched: number }
}
export interface CompleteResp { ok?: boolean; done?: boolean; xp?: number; error?: string; wait?: number; retry_in?: number; message?: string; question?: ProgressQuestion; watched?: number }

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
  photo_url?: string
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
  stars?: number
  /** Цена в рублях (СБП через SecretPay); нет — рублёвая оплата выключена. */
  rub?: number
}

export interface Config {
  plans: Plan[]
  currency: string
  bot_username?: string
  giveaway_visible?: boolean
  is_admin?: boolean
}

export interface Banner {
  emoji: string
  title: string
  text: string
  link: string
  file_id?: string
  media_type?: 'photo' | 'animation'
}

export interface CertInfo {
  eligible: boolean
  username: string
  language: string
  modules: string[]
  lessons_total: number
  tasks_total: number
  done: number
  total: number
  date: string
  cert_id: string
  code?: string
}

export interface CertVerify {
  valid: boolean
  revoked?: boolean
  reason?: string
  cert_id?: string
  username?: string
  language?: string
  lessons_total?: number
  tasks_total?: number
  date?: string
  code?: string
}

export interface CompeteRank {
  name: string
  emoji: string
  next_name: string | null
  next_at: number | null
  to_next: number
  progress: number
}
export interface BoardRow { rank: number; name: string; xp: number; is_me: boolean }
export interface FeedRow { name: string; kind: string; amount: number; text: string; ago: string }
export interface Compete {
  xp: number
  rank: CompeteRank
  streak: number
  best_streak: number
  pos_all: number | null
  pos_week: number | null
  week_xp: number
  today_active: number
  board_all: BoardRow[]
  board_week: BoardRow[]
  feed: FeedRow[]
  week?: { prizes: number[]; week_end: string; rules_from: string; daily_cap: number }
}

export interface ChatReaction { emoji: string; count: number; mine: boolean }
export interface ChatMsg {
  id: number
  user_id: number
  name: string
  username: string
  avatar: string
  mine: boolean
  type: 'text' | 'photo' | 'video' | 'voice' | 'gif' | 'sticker'
  text: string
  has_media: boolean
  media_url: string
  mime: string
  dur: number
  reply_to: number | null
  created_at: string
  deleted: boolean
  edited: boolean
  reactions: ChatReaction[]
  anim: boolean
  once: boolean
  ttl: boolean
  /** Автор с активной подпиской Premium (корона у имени). */
  premium?: boolean
}
export interface ChatMember { user_id: number; name: string; username: string; avatar: string; premium?: boolean }
export interface ChatResp { messages: ChatMsg[]; online: number; slow: number; is_admin?: boolean; pinned?: ChatMsg | null; typing?: string[]; gif?: boolean; gated?: boolean; channel?: string; retention_days?: number; last_read?: number }
export interface GifItem { id: string; preview: string; send: string }
export interface StickerDef { fid: string; emoji: string; kind: string }
export interface StickerPack { name: string; title: string; emoji?: boolean; stickers: StickerDef[] }
export interface ChatUserCard {
  user_id: number
  name: string
  username: string
  avatar: string
  is_premium: boolean
  materials_done: number
  certificates: number
  xp: number
  streak: number
  rank: string
  rank_emoji: string
  avatar_mode: string
  avatar_anim: boolean
}

export const api = {
  sections:       ()             => get<{ sections: Section[] }>('/api/sections'),
  subsections:    (id: number)   => get<{ sections: Section[] }>(`/api/sections?parent_id=${id}`),
  materials:      (id: number, page = 0) =>
    get<{ materials: Material[]; total: number }>(`/api/sections/${id}/materials?page=${page}`),
  material:       (id: number)   => get<Material>(`/api/material/${id}`),
  profile:        ()             => get<Profile>('/api/profile'),
  compete:        ()             => get<Compete>('/api/compete'),
  chat:           (after?: number) => get<ChatResp>(`/api/chat${after ? `?after=${after}` : ''}`),
  chatRecheck:    ()             => get<ChatResp>('/api/chat?recheck=1'),
  chatMtoken:     ()             => get<{ token: string; ttl: number }>('/api/chat/mtoken'),
  setMediaToken:  (t: string)    => { _mtok = t },
  chatSetRetention: (days: number) => post<{ ok?: boolean; days?: number; error?: string }>('/api/chat/retention', { days }),
  chatOlder:      (before: number) => get<{ messages: ChatMsg[] }>(`/api/chat/older?before=${before}`),
  chatAround:     (id: number)    => get<{ messages: ChatMsg[] }>(`/api/chat/around?id=${id}`),
  chatSend:       (text: string, reply_to?: number, ttl?: number) => post<{ ok?: boolean; id?: number; error?: string; message?: string }>('/api/chat/send', { text, reply_to, ttl }),
  chatSticker:    (sticker: string, ttl?: number) => post<{ ok?: boolean; id?: number; error?: string; message?: string }>('/api/chat/send', { sticker, ttl }),
  chatGif:        (q: string)    => get<{ gifs: GifItem[] }>(`/api/chat/gif${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  chatGifSend:    (url: string, ttl?: number) => post<{ ok?: boolean; id?: number; error?: string }>('/api/chat/gif/send', { url, ttl }),
  chatStickers:   ()             => get<{ packs: StickerPack[]; is_admin: boolean }>('/api/chat/stickers'),
  chatStickerUrl: (fid: string, kind: string) => `${API_BASE}/api/chat/sticker?fid=${encodeURIComponent(fid)}&k=${kind}&${_mtok ? `t=${_mtok}` : `init_data=${encodeURIComponent(tg?.initData || '')}`}`,
  chatStickerFile: (fid: string, kind: string, ttl?: number) => post<{ ok?: boolean; id?: number }>('/api/chat/send', { sticker_fid: fid, sticker_kind: kind, ttl }),
  chatPackOf:     (q: { fid?: string; name?: string; msg?: number }) => get<{ pack: StickerPack; added: boolean }>(`/api/chat/pack_of?${new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()}`),
  chatStickersAdd: (link: string) => post<{ ok?: boolean; pack?: StickerPack; error?: string; message?: string }>('/api/chat/stickers/add', { link }),
  chatStickersRemove: (name: string) => post<{ ok?: boolean }>('/api/chat/stickers/remove', { name }),
  chatDelete:     (id: number)   => del<{ ok?: boolean }>(`/api/chat/${id}`),
  chatPin:        (id: number)   => post<{ ok?: boolean }>(`/api/chat/${id}/pin`),
  chatUnpin:      ()             => post<{ ok?: boolean }>('/api/chat/unpin'),
  chatReact:      (id: number, emoji: string) => post<{ ok?: boolean; on?: boolean }>(`/api/chat/${id}/react`, { emoji }),
  chatEdit:       (id: number, text: string) => post<{ ok?: boolean; error?: string }>(`/api/chat/${id}/edit`, { text }),
  chatTyping:     ()             => post<{ ok?: boolean }>('/api/chat/typing'),
  chatUnread:     ()             => get<{ count: number; mentions: number; last_read: number }>('/api/chat/unread'),
  chatRead:       (id: number)   => post<{ ok?: boolean }>('/api/chat/read', { id }),
  chatMembers:    (q: string)    => get<{ members: ChatMember[] }>(`/api/chat/members?q=${encodeURIComponent(q)}`),
  chatSearch:     (q: string)    => get<{ messages: ChatMsg[] }>(`/api/chat/search?q=${encodeURIComponent(q)}`),
  chatUser:       (uid: number) => get<ChatUserCard>(`/api/chat/user/${uid}`),
  chatMediaUrl:   (id: number)   => `${API_BASE}/api/chat/media/${id}?${_mtok ? `t=${_mtok}` : `init_data=${encodeURIComponent(tg?.initData || '')}`}`,
  chatAvatarUrl:  (uid: number, v?: string | number) => `${API_BASE}/api/chat/avatar/${uid}?${_mtok ? `t=${_mtok}` : `init_data=${encodeURIComponent(tg?.initData || '')}`}${v != null ? `&v=${v}` : ''}`,
  chatAvatarUploadUrl: ()        => `${API_BASE}/api/chat/avatar/upload`,
  chatAvatarMode: (mode: string) => post<{ ok?: boolean; mode?: string }>('/api/chat/avatar/mode', { mode }),
  chatUploadUrl:  (type: string, dur = 0, ttl = 0, once = false) => `${API_BASE}/api/chat/upload?type=${type}&dur=${dur}${ttl ? `&ttl=${ttl}` : ''}${once ? '&once=1' : ''}`,
  contributors:   ()             => get<{ contributors: Contributor[]; total: number; my_rank: number | null; my_approved: number }>('/api/contributors'),
  config:         ()             => get<Config>('/api/config'),
  documentText:   (id: number)   => get<{ title: string; text: string; extension: string; truncated?: boolean }>(`/api/document_text/${id}`),
  /** Текст конкретного вложения-документа. */
  attachmentText: (id: number, attachmentId: number) =>
    get<{ title: string; text: string; extension: string; truncated?: boolean }>(`/api/document_text/${id}/${attachmentId}`),
  /** Избранное пользователя: материалы, а также целые разделы и курсы.
   *  section_ids/course_ids — id для локального кэша закладок; sections/courses — для показа на вкладке. */
  favorites:      ()             => get<FavoritesResponse>('/api/favorites'),
  favorite:       (id: number)   => get<{ favorite: boolean }>(`/api/favorites/${id}`),
  addFavorite:    (id: number)   => post<{ ok: boolean; favorite: boolean }>(`/api/favorites/${id}`),
  removeFavorite: (id: number)   => del<{ ok: boolean; favorite: boolean }>(`/api/favorites/${id}`),
  // Избранное для целого раздела
  sectionFavorite:       (id: number) => get<{ favorite: boolean }>(`/api/sections/${id}/favorite`),
  addSectionFavorite:    (id: number) => post<{ ok: boolean; favorite: boolean }>(`/api/sections/${id}/favorite`),
  removeSectionFavorite: (id: number) => del<{ ok: boolean; favorite: boolean }>(`/api/sections/${id}/favorite`),
  /** Без attachmentId шлёт материал целиком — все вложения по порядку. */
  sendFile:       (id: number)   => post<{ ok: boolean; sent?: number; error?: string }>(`/api/send_file/${id}`),
  completeMaterial: async (id: number, body: { answer?: number } = {}): Promise<CompleteResp> => {
    const res = await fetch(API_BASE + `/api/material/${id}/complete`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  },
  sendAttachment: (id: number, attachmentId: number) =>
    post<{ ok: boolean; sent?: number; error?: string }>(`/api/send_file/${id}/${attachmentId}`),
  cryptoInvoice:  (days: number) => post<{ pay_url: string; invoice_id: string; days: number; price: number }>(`/api/crypto_invoice/${days}`),
  starsInvoice:   (days: number) => post<{ link: string; stars: number; days: number; error?: string }>(`/api/stars_invoice/${days}`),
  /** Рублёвый счёт SecretPay (СБП) на Premium. */
  rubInvoice:     (days: number) => post<{ payment_url: string; transaction_id: string; amount: number }>(`/api/rub_invoice/${days}`),
  /** Статус рублёвого платежа: pending | paid | failed | cancelled. */
  rubStatus:      (txId: string) => get<{ status: string; kind?: string; premium_until?: string | null; course_id?: number }>(`/api/rub_invoice/${encodeURIComponent(txId)}`),
  cryptoInvoiceConfirm: (invoiceId: string) =>
    post<{ ok?: boolean; status?: string; premium_until?: string; error?: string }>('/api/crypto_invoice/confirm', { invoice_id: invoiceId }),
  recent:         ()             => get<{ materials: Material[]; today_count: number; today_sections: TodaySection[]; total_count: number }>('/api/recent'),
  history:        ()             => get<{ materials: Material[] }>('/api/history'),
  clearHistory:   ()             => del<{ ok: boolean }>('/api/history'),
  watchGet:       (id: number)   => get<{ items: Record<string, { position: number; duration: number }> }>(`/api/watch/${id}`),
  watchContinue:  ()             => get<{ items: ContinueItem[] }>('/api/watch_continue'),
  sectionSub:     (id: number)   => get<{ subscribed: boolean }>(`/api/section_sub/${id}`),
  setSectionSub:  (id: number, on: boolean) => post<{ subscribed: boolean }>(`/api/section_sub/${id}`, { subscribed: on }),
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
  certificate:     (parentId: number) => get<CertInfo>(`/api/certificate/${parentId}`),
  certificateSend: (parentId: number, image: string) =>
    post<{ ok?: boolean; error?: string }>(`/api/certificate/${parentId}/send`, { image }),
  certificateVerify: (certId: string) =>
    get<CertVerify>(`/api/certificate/verify/${encodeURIComponent(certId)}`),
}

export interface ContinueItem {
  id: number
  title: string
  section_id: number
  section_title: string
  position: number
  duration: number
}

/** Сохранить позицию просмотра. keepalive — чтобы запрос ушёл и при закрытии мини-аппа. */
export function watchSave(body: { material_id: number; attachment_id: number; position: number; duration: number }) {
  try {
    fetch(API_BASE + '/api/watch', {
      method: 'POST', headers: headers(), body: JSON.stringify(body), keepalive: true,
    }).catch(() => {})
  } catch { /* не критично */ }
}

// URL медиа-ассета этапа. init_data в query — <video>/<img> не умеют слать заголовки.
export function giveawayAssetUrl(stage: number, file: string): string {
  const init = encodeURIComponent(tg?.initData || '')
  return `${API_BASE}/api/giveaway/asset/${stage}/${file}?init_data=${init}`
}
