import { iconNameFor, coverIndex } from './CategoryIcon'

/** Цвет обложки раздела: по теме (иконке), чтобы соседние разделы не совпадали по цвету
 *  и цвет был одинаковым на главной, в каталоге и в шапке раздела. */
const BY_ICON: Partial<Record<ReturnType<typeof iconNameFor>, number>> = {
  osint: 0, terminal: 1, shield: 5, code: 3, coin: 2, ai: 4, book: 0, mask: 3, unlock: 2, tool: 1, monitor: 4, flame: 5,
}
export function coverClass(s: { id: number; title: string }): string {
  const byIcon = BY_ICON[iconNameFor(s.title)]
  return `cover-${byIcon ?? coverIndex(s.id)}`
}
