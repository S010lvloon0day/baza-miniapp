import type { ReactNode } from 'react'

type IconKey =
  | 'icon_book' | 'icon_card' | 'icon_search' | 'icon_unlock' | 'icon_cpu'
  | 'icon_shield' | 'icon_mask' | 'icon_tool' | 'icon_box' | 'icon_monitor'
  | 'icon_flame' | 'icon_puzzle' | 'icon_code' | 'icon_question' | 'icon_folder'

const SVG_PROPS = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style: { filter: 'drop-shadow(0 0 4px rgba(34,197,94,.9))' },
}

export const ICON_PATHS: Record<IconKey, ReactNode> = {
  icon_book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
      <path d="M8 7h8M8 11h8" />
    </>
  ),
  icon_card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  icon_search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.6" y2="16.6" />
    </>
  ),
  icon_unlock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.4-2" />
    </>
  ),
  icon_cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  icon_shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  icon_mask: (
    <>
      <path d="M2 10c3-2 5-2 6 0s3 2 4 0 3-2 4 0 3 2 6 0" />
      <path d="M4 10v2a8 8 0 0 0 16 0v-2" />
    </>
  ),
  icon_tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />,
  icon_box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  icon_monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  icon_flame: <path d="M12 22c4 0 6-2.7 6-6 0-3-2-4.5-3-6-.2 1.6-1 2.4-2 2-1.3-.5-1-3-1-4-3 2-5 5.3-5 8 0 3.3 2 6 5 6z" />,
  icon_puzzle: <path d="M9 4h4a1.5 1.5 0 0 1 0 3 1.5 1.5 0 0 0 0 3h4v4a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 0-3 0v4H7a1.5 1.5 0 0 1 0-3 1.5 1.5 0 0 0 0-3H3V8a1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 0 3 0V4z" />,
  icon_code: (
    <>
      <polyline points="8 6 3 12 8 18" />
      <polyline points="16 6 21 12 16 18" />
    </>
  ),
  icon_question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7" />
      <line x1="12" y1="17" x2="12" y2="17.1" />
    </>
  ),
  icon_folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
}

// Ordered, first-match-wins. Derived from the live category titles in production
// (fetched from `sections` where parent_id IS NULL during Task 4 implementation) —
// every current top-level title maps to a specific icon below, none fall through
// to the icon_question fallback. New categories added later may hit the fallback
// until their keyword is added here.
const KEYWORD_TABLE: Array<[string[], IconKey]> = [
  [['код', 'code', 'скрипт', 'script'], 'icon_code'],
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
  return 'icon_question'
}

export default function CategoryIcon({ title, icon: iconOverride }: { title: string; icon?: IconKey }) {
  const icon = iconOverride ?? resolveIcon(title)
  return (
    <div
      className="w-full h-full rounded-full flex items-center justify-center"
      style={{
        border: '1px solid rgba(34,197,94,.4)',
        background: 'radial-gradient(circle, rgba(34,197,94,.35), rgba(34,197,94,.06) 68%, transparent)',
        boxShadow: '0 0 16px rgba(34,197,94,.5), inset 0 0 8px rgba(34,197,94,.25)',
        color: '#4AE885',
      }}
    >
      <svg {...SVG_PROPS}>{ICON_PATHS[icon]}</svg>
    </div>
  )
}
