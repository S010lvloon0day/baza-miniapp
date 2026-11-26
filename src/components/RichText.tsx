const tg = (window as any).Telegram?.WebApp

/** Ссылка на материал самой Базы (t.me/<бот>?startapp=m123 или ?m=123) → id материала. */
export function baseMaterialId(url: string): number | null {
  const m = url.match(/t\.me\/[A-Za-z0-9_]+\/?(?:[A-Za-z0-9_]+)?\?startapp=m(\d+)/) || url.match(/[?&]m=(\d+)(?:&|$)/)
  return m ? Number(m[1]) : null
}

/** Ссылка на раздел самой Базы (t.me/<бот>?startapp=s45) → id раздела. */
export function baseSectionId(url: string): number | null {
  const m = url.match(/t\.me\/[A-Za-z0-9_]+\/?(?:[A-Za-z0-9_]+)?\?startapp=s(\d+)/)
  return m ? Number(m[1]) : null
}

/** Открыть ссылку: материал Базы — здесь же, внутри приложения; внешняя — через Telegram. */
export function openUrl(url: string) {
  const id = baseMaterialId(url)
  if (id) { window.dispatchEvent(new CustomEvent('baza:open-material', { detail: id })); return }
  const sid = baseSectionId(url)
  if (sid) { window.dispatchEvent(new CustomEvent('baza:open-section', { detail: sid })); return }
  if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank')
}

const LINK_RE = /\[([^\]\n]{1,300})\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"]+)/g

/** Превращает ссылки в тексте в кликабельные: и «[текст](ссылка)», и голые ссылки.
 *  Общая для страницы материала и для текстовых вложений. */
export function renderWithLinks(text: string) {
  const out: React.ReactNode[] = []
  let last = 0, k = 0, m: RegExpExecArray | null
  LINK_RE.lastIndex = 0
  while ((m = LINK_RE.exec(text))) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>)
    const url = m[2] || m[3]
    const label = m[1] || m[3]
    const inside = baseMaterialId(url) !== null || baseSectionId(url) !== null
    out.push(
      <span key={k++} role="link"
        className={`underline underline-offset-2 cursor-pointer ${inside ? 'text-green decoration-green/50' : 'text-green break-all'}`}
        onClick={e => { e.stopPropagation(); openUrl(url) }}>
        {label}
      </span>
    )
    last = LINK_RE.lastIndex
  }
  if (last < text.length) out.push(<span key={k++}>{text.slice(last)}</span>)
  return out
}
