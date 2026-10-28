import { API_BASE } from './client'

const tg = (window as any).Telegram?.WebApp

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: { 'X-Init-Data': tg?.initData || '', 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const e = new Error(data?.error || `HTTP ${res.status}`) as Error & { data?: unknown; status?: number }
    e.data = data; e.status = res.status
    throw e
  }
  return data as T
}

export interface MaskReact { kind: string; variant: number; line: string; anim: string }
export interface MaskClue {
  id: number; pos: number; kind: 'text' | 'choice'; points: number; open: boolean; solved: boolean
  question?: string; options?: string[]; tries_left?: number; opens_in?: number; reward?: string
}
export interface MaskBoardRow { rank: number; name: string; pts: number; is_me: boolean }
export interface MaskState {
  round: null | {
    id: number; title: string; intro: string; prize: string; status: 'live' | 'solved'
    started_at: string | null; solved_at: string | null; winner: null | { name: string; is_me: boolean }
  }
  tries_left: number; tries_per_day: number; cooldown: number; reset_in: number
  stats: { guesses: number; players: number; today: number }
  feed: { name: string; text: string; kind: string; at: string }[]
  clues: MaskClue[]; board: MaskBoardRow[]; my_pts: number; my_pos: number | null
  hello: MaskReact; reveal: boolean; is_admin: boolean
}
export interface GuessResult {
  ok: boolean; test?: boolean; solved?: boolean; kind?: string; tries_left?: number; cooldown?: number
  reset_in?: number; react?: MaskReact; error?: string; days?: number
}

export const maskApi = {
  state: () => req<MaskState>('GET', '/api/mask/state'),
  guess: (text: string) => req<GuessResult>('POST', '/api/mask/guess', { text }).catch((e: any) => (e.data || { ok: false, error: e.message }) as GuessResult),
  clue: (id: number, answer: string) => req<{ ok: boolean; reward?: string; points?: number; tries_left?: number }>('POST', `/api/mask/clue/${id}`, { answer }),
  revealUrl: () => API_BASE + '/api/mask/reveal.glb',
  initData: () => tg?.initData || '',
}

/* ── админка ── */
export interface AMaskRound {
  id: number; title: string; intro: string; prize: string; status: string; created_at: string
  started_at: string | null; solved_at: string | null; winner_id: number | null; winner_guess: string | null
  answers_count: number; guesses: number; players: number
}
export interface AMaskClue { id: number; round_id: number; pos: number; kind: string; question: string; options: string[]; reward: string; points: number; opens_at: string }
export interface AMask { rounds: AMaskRound[]; clues: AMaskClue[]; visible: string; min_days: number; feed_text: boolean; reveal_uploaded: boolean }

export const maskAdmin = {
  get: () => req<AMask>('GET', '/api/admin/mask'),
  round: (b: Record<string, unknown>) => req<{ ok: boolean; id: number }>('POST', '/api/admin/mask/round', b),
  test: (id: number, text: string) => req<{ ok: boolean }>('POST', '/api/admin/mask/test', { id, text }),
  clue: (b: Record<string, unknown>) => req<{ ok: boolean; id: number }>('POST', '/api/admin/mask/clue', b),
  delClue: (id: number) => req<{ ok: boolean }>('DELETE', `/api/admin/mask/clue/${id}`),
  settings: (b: Record<string, unknown>) => req<{ ok: boolean }>('POST', '/api/admin/mask/settings', b),
}
