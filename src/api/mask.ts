export const MODEL_V = 'mx5'
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
  tasks?: {
    run: { done: boolean; best: number; target: number }
    fight?: { open: boolean; done: boolean }
    cipher: { open: boolean; done: boolean; cipher?: string; reward?: string }
    osint: { open: boolean; soon?: boolean }
  }
  secret?: string | null
  teaser?: boolean
  run_model?: { v0: number; a: number; vmax: number }
}
export interface GuessResult {
  ok: boolean; test?: boolean; solved?: boolean; kind?: string; tries_left?: number; cooldown?: number
  reset_in?: number; react?: MaskReact; error?: string; days?: number; secret?: string | null
}

export interface RunTop { top: { rank: number; name: string; score: number; is_me: boolean }[]; my_best: number; my_pos: number | null; my_runs: number }

export const maskApi = {
  state: () => req<MaskState>('GET', '/api/mask/state'),
  guess: (text: string) => req<GuessResult>('POST', '/api/mask/guess', { text }).catch((e: any) => (e.data || { ok: false, error: e.message }) as GuessResult),
  clue: (id: number, answer: string) => req<{ ok: boolean; reward?: string; points?: number; tries_left?: number }>('POST', `/api/mask/clue/${id}`, { answer }),
  runStart: () => req<{ run_id: number; seed: number; target: number }>('POST', '/api/mask/run/start', {}),
  runFinish: (run_id: number, score: number) => req<{ ok: boolean; done: boolean; score: number; flag: string | null }>('POST', '/api/mask/run/finish', { run_id, score }),
  runTop: () => req<RunTop>('GET', '/api/mask/run/top'),
  fightStart: (lv?: number) => req<{ fight_id: number; seed: number; lv?: number }>('POST', '/api/mask/fight/start', lv ? { lv } : {}),
  fightFinish: (fight_id: number, log: [number, number][], ticks: number) => req<{ ok: boolean; done: boolean; win: boolean; flag: string | null }>('POST', '/api/mask/fight/finish', { fight_id, log, ticks }),
  cipher: (answer: string) => req<{ ok: boolean; reward?: string | null; error?: string }>('POST', '/api/mask/cipher', { answer }),
  revealUrl: () => API_BASE + '/api/mask/reveal.glb?v=' + MODEL_V,
  initData: () => tg?.initData || '',
}

/* ── админка ── */
export interface AMaskRound {
  id: number; title: string; intro: string; prize: string; status: string; created_at: string
  started_at: string | null; solved_at: string | null; winner_id: number | null; winner_guess: string | null
  answers_count: number; guesses: number; players: number
  secret_set?: boolean; osint_hint?: string; run_target?: number
  progress?: { players: number; run_done: number; cipher_done: number; run_best: number }
}
export interface AMaskClue { id: number; round_id: number; pos: number; kind: string; question: string; options: string[]; reward: string; points: number; opens_at: string }
export interface AMask { rounds: AMaskRound[]; clues: AMaskClue[]; visible: string; min_days: number; feed_text: boolean; reveal_uploaded: boolean; teaser?: boolean }

export const maskAdmin = {
  get: () => req<AMask>('GET', '/api/admin/mask'),
  round: (b: Record<string, unknown>) => req<{ ok: boolean; id: number }>('POST', '/api/admin/mask/round', b),
  test: (id: number, text: string) => req<{ ok: boolean }>('POST', '/api/admin/mask/test', { id, text }),
  clue: (b: Record<string, unknown>) => req<{ ok: boolean; id: number }>('POST', '/api/admin/mask/clue', b),
  delClue: (id: number) => req<{ ok: boolean }>('DELETE', `/api/admin/mask/clue/${id}`),
  settings: (b: Record<string, unknown>) => req<{ ok: boolean }>('POST', '/api/admin/mask/settings', b),
}
