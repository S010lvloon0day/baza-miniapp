const tg = (window as any).Telegram?.WebApp

const URL_RE = /(https?:\/\/[^\s<>"]+)/g

/** Превращает ссылки в тексте в кликабельные. Общая для страницы материала
 *  и для текстовых вложений — раньше жила только внутри MaterialPage. */
export function renderWithLinks(text: string) {
  const parts = text.split(URL_RE)
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0
      return (
        <span
          key={i}
          className="text-green underline break-all cursor-pointer"
          onClick={e => {
            e.stopPropagation()
            if (tg?.openLink) tg.openLink(part)
            else window.open(part, '_blank')
          }}
        >
          {part}
        </span>
      )
    }
    URL_RE.lastIndex = 0
    return <span key={i}>{part}</span>
  })
}
