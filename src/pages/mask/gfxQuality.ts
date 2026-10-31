/** Качество графики для забега и драки: экономное / среднее / высокое. Выбор запоминается на устройстве. */
export type GfxQ = 'low' | 'mid' | 'high'
export interface GfxCfg { pr: number; aa: boolean; shadows: boolean; shadowSize: number; soft: boolean; frameMs: number; decor: boolean; fx: boolean }

export const GFX: Record<GfxQ, GfxCfg> = {
  // экономное: без теней и сглаживания, 30 кадров, простые фигуры вместо моделей декораций — для слабых телефонов
  low: { pr: 1, aa: false, shadows: false, shadowSize: 512, soft: false, frameMs: 28, decor: false, fx: false },
  // среднее: лёгкие тени, 60 кадров, чуть меньше пикселей
  mid: { pr: 1.25, aa: true, shadows: true, shadowSize: 512, soft: false, frameMs: 12, decor: true, fx: true },
  // высокое: всё включено
  high: { pr: 2, aa: true, shadows: true, shadowSize: 1024, soft: true, frameMs: 12, decor: true, fx: true },
}
export const GFX_LABEL: Record<GfxQ, string> = { low: 'Экономное', mid: 'Среднее', high: 'Высокое' }
export const GFX_HINT: Record<GfxQ, string> = {
  low: 'для слабых телефонов: без теней, 30 кадров',
  mid: 'баланс качества и нагрева',
  high: 'максимум красоты, сильнее греет телефон',
}

const KEY = 'gfx_q'
/** по умолчанию: телефон — среднее, компьютер — высокое */
let cached: GfxQ | null = null
export function getGfx(): GfxQ {
  if (cached) return cached
  try { const v = localStorage.getItem(KEY); if (v === 'low' || v === 'mid' || v === 'high') return (cached = v) } catch { /* */ }
  return (cached = window.matchMedia?.('(pointer: coarse)').matches ? 'mid' : 'high')
}
export function setGfx(q: GfxQ) { cached = q; try { localStorage.setItem(KEY, q) } catch { /* */ } }
export const pixelRatioFor = (q: GfxQ) => Math.min(GFX[q].pr, window.devicePixelRatio || 1)
