import Icon from './Icon'
import type { IconName } from './Icon'

type IconKey =
  | 'icon_book' | 'icon_card' | 'icon_search' | 'icon_unlock' | 'icon_cpu' | 'icon_coin' | 'icon_terminal' | 'icon_ai'
  | 'icon_shield' | 'icon_mask' | 'icon_tool' | 'icon_box' | 'icon_monitor'
  | 'icon_flame' | 'icon_puzzle' | 'icon_code' | 'icon_question' | 'icon_folder'

const MAP: Record<IconKey, IconName> = {
  icon_book: 'book', icon_card: 'card', icon_search: 'osint', icon_unlock: 'unlock', icon_cpu: 'ai', icon_coin: 'coin',
  icon_terminal: 'terminal', icon_ai: 'ai', icon_shield: 'shield', icon_mask: 'mask', icon_tool: 'tool', icon_box: 'box',
  icon_monitor: 'monitor', icon_flame: 'flame', icon_puzzle: 'puzzle', icon_code: 'code', icon_question: 'question', icon_folder: 'folder',
}

/** Совместимость со SectionPage: путь иконки по ключу. */
export const ICON_PATHS: Record<IconKey, React.ReactNode> = Object.fromEntries(
  (Object.keys(MAP) as IconKey[]).map(k => [k, null]),
) as Record<IconKey, React.ReactNode>

export function iconNameFor(title: string): IconName { return MAP[resolveIcon(title)] }

/** Индекс цвета обложки раздела — стабильный по id/названию. */
export function coverIndex(key: string | number): number {
  const s = String(key); let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 6
}

// Ключевые слова → иконка, первое совпадение.
const KEYWORD_TABLE: Array<[string[], IconKey]> = [
  [['код', 'code', 'скрипт', 'script', 'программ', 'python', 'разработ'], 'icon_code'],
  [['криптовал', 'крипта', 'bitcoin', 'defi', 'кошел'], 'icon_coin'],
  [['linux', 'линукс', 'терминал'], 'icon_terminal'],
  [['нейросет', 'ии ', 'ai', 'gpt'], 'icon_ai'],
  [['пентест', 'pentest'], 'icon_shield'],
  [['парол', 'crypt', 'шифр'], 'icon_unlock'],
  [['сеть', 'network', 'операционн'], 'icon_cpu'],
  [['анонимн', 'mask', 'обход'], 'icon_mask'],
  [['защита', 'безопасн', 'shield'], 'icon_shield'],
  [['поиск', 'search', 'osint'], 'icon_search'],
  [['инструмент', 'tool'], 'icon_tool'],
  [['монитор', 'видео', 'stream'], 'icon_monitor'],
  [['огонь', 'эксплойт', '0day', 'взлом', 'хак'], 'icon_flame'],
  [['головолом', 'puzzle', 'ctf'], 'icon_puzzle'],
  [['карт', 'оплата', 'card'], 'icon_card'],
  [['книга', 'гайд', 'теория', 'курс', 'урок', 'знани'], 'icon_book'],
  [['коробка', 'архив', 'сервис', 'бот', 'box'], 'icon_box'],
  [['вопрос', 'question', 'faq'], 'icon_question'],
]

export function resolveIcon(title: string): IconKey {
  const lower = title.toLowerCase()
  for (const [keywords, icon] of KEYWORD_TABLE) {
    if (keywords.some(kw => lower.includes(kw))) return icon
  }
  return 'icon_folder'
}

/** Иконка раздела на нейтральной плитке. */
export default function CategoryIcon({ title, icon: iconOverride, size = 20 }: { title: string; icon?: IconKey; size?: number }) {
  const name = MAP[iconOverride ?? resolveIcon(title)]
  return (
    <div className="w-full h-full rounded-[12px] bg-white/[.06] flex items-center justify-center text-[#CFDAD4]">
      <Icon name={name} size={size} />
    </div>
  )
}
