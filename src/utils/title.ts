/**
 * Эмодзи в названиях (из базы) заменяются фирменным оформлением:
 * сами эмодзи убираются, а цветовые маркеры уровня 🟢🟡🟠🔴 превращаются в поле `level`,
 * которое интерфейс рисует фирменным ромбом. Пользовательский текст (чат, комментарии) не трогается.
 */
export type Level = 'easy' | 'mid' | 'hard'

const LEVEL: Record<string, Level> = { '🟢': 'easy', '🟩': 'easy', '🟡': 'mid', '🟨': 'mid', '🟠': 'hard', '🟧': 'hard', '🔴': 'hard', '🟥': 'hard' }
const EMOJI_RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{1F3FB}-\u{1F3FF}]|[\u{FE0E}\u{FE0F}\u{200D}\u{20E3}])+/gu

export function levelOf(s: string): Level | undefined {
  for (const ch in LEVEL) if (s.includes(ch)) return LEVEL[ch]
  return undefined
}

export function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, ' ').replace(/\s{2,}/g, ' ').replace(/\s+([,.:;!?)])/g, '$1').replace(/([(«])\s+/g, '$1').trim()
}

const KEYS = new Set(['title', 'section_title', 'course_title', 'chapter_title', 'lesson_title', 'name_title', 'description', 'subtitle'])

/** Глубоко чистит поля-названия в ответе API; level кладётся рядом как `<key>_level`. */
export function cleanTitles<T>(data: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      for (const k of Object.keys(o)) {
        const val = o[k]
        if (KEYS.has(k) && typeof val === 'string') {
          const lv = levelOf(val)
          if (lv && o[`${k}_level`] === undefined) o[`${k}_level`] = lv
          o[k] = stripEmoji(val)
        } else if (val && typeof val === 'object') o[k] = walk(val)
      }
      return o
    }
    return v
  }
  return walk(data) as T
}

/** Пути, где названия только показываются (не редактируются и не являются пользовательским текстом). */
export function shouldClean(path: string): boolean {
  if (path.startsWith('/api/chat') || path.startsWith('/api/admin') || path.includes('/social') || path.startsWith('/api/feedback')) return false
  return true
}
