// Форматирование сообщений как в Telegram: **жирный**, __курсив__, ~~зачёркнутый~~, ||спойлер||,
// `код`, ```блок кода``` (с подсветкой и кнопкой «Копировать»), кликабельные ссылки, превью ссылок.
import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../../api/client'
import type { LinkPreview } from '../../api/client'
import Icon from '../../components/Icon'

const tg = (window as any).Telegram?.WebApp

export function openUrl(url: string) {
  try {
    if (/^https?:\/\/t\.me\//i.test(url) && tg?.openTelegramLink) tg.openTelegramLink(url)
    else if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank', 'noopener')
  } catch { window.open(url, '_blank', 'noopener') }
}

// ── подсветка кода (лёгкая, без библиотек): комментарии, строки, числа, ключевые слова ──
const KW = new Set(('if else elif for while do return function def class import from export const let var new try catch except finally ' +
  'raise throw async await yield in of is not and or None null undefined true false True False self this public private protected ' +
  'static void int float double char bool string str list dict set tuple struct enum interface type package func go defer chan map ' +
  'select case switch break continue default echo fi then esac done local sudo with as lambda pass global nonlocal assert del print ' +
  'SELECT FROM WHERE INSERT INTO VALUES UPDATE DELETE CREATE TABLE JOIN LEFT RIGHT ON GROUP BY ORDER LIMIT AND OR NOT NULL AS').split(' '))
const TOKEN = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|--[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g

function highlight(code: string, lang: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, k = 0
  const hashComment = !/^(c|cpp|c\+\+|cs|csharp|js|javascript|ts|typescript|java|go|rust|kotlin|php|css|json)$/i.test(lang)
  const re = new RegExp(TOKEN.source, 'g')
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    const [t, com, str, num, word] = m
    const isCom = !!com && (com[0] === '#' ? hashComment : com.startsWith('--') ? /^(sql|lua|haskell)$/i.test(lang) : true)
    if (isCom) out.push(<span key={k++} style={{ color: '#6E8A7C', fontStyle: 'italic' }}>{t}</span>)
    else if (com) out.push(t)
    else if (str) out.push(<span key={k++} style={{ color: '#9FE6B8' }}>{t}</span>)
    else if (num) out.push(<span key={k++} style={{ color: '#F5C25A' }}>{t}</span>)
    else if (word && KW.has(word)) out.push(<span key={k++} style={{ color: '#B9A8FF', fontWeight: 600 }}>{t}</span>)
    else if (word && code[re.lastIndex] === '(') out.push(<span key={k++} style={{ color: '#7FD3FF' }}>{t}</span>)
    else out.push(t)
    last = re.lastIndex
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* */ }
  }
  return (
    <span className="block my-1 rounded-[10px] overflow-hidden text-left" style={{ background: 'rgba(0,0,0,.32)', border: '1px solid rgba(255,255,255,.07)' }}
      onClick={(e) => e.stopPropagation()}>
      <span className="flex items-center justify-between px-2.5 py-1 text-[11px] text-gray" style={{ background: 'rgba(255,255,255,.04)' }}>
        <span className="font-mono uppercase tracking-wide">{lang || 'код'}</span>
        <button onClick={copy} className="flex items-center gap-1 active:opacity-60" style={{ color: copied ? '#17E584' : undefined }}>
          <Icon name={copied ? 'check' : 'copy'} size={12} accent="current" />{copied ? 'Скопировано' : 'Копировать'}
        </button>
      </span>
      <span className="block px-2.5 py-2 font-mono text-[12.5px] leading-[1.5] overflow-x-auto no-scrollbar" style={{ whiteSpace: 'pre', userSelect: 'text', WebkitUserSelect: 'text' }}>
        {highlight(code, lang)}
      </span>
    </span>
  )
}

function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span onClick={(e) => { if (!open) { e.stopPropagation(); setOpen(true) } }}
      className="rounded-[4px] transition-all duration-300"
      style={open ? {} : { background: 'rgba(255,255,255,.18)', color: 'transparent', filter: 'blur(0.5px)', cursor: 'pointer', textShadow: 'none' }}>
      <span style={open ? {} : { opacity: 0 }}>{children}</span>
    </span>
  )
}

const URL_RE = /(https?:\/\/[^\s<>"'«»]+[^\s<>"'«».,;:!?)\]])/
export const firstUrl = (t: string) => {
  if (!t || /```/.test(t)) { const m0 = t?.replace(/```[\s\S]*?```/g, '').match(URL_RE); return m0 ? m0[1] : '' }
  const m = t.match(URL_RE); return m ? m[1] : ''
}

type Leaf = (s: string, key: string) => ReactNode

// inline: `код`, **жирный**, __курсив__, ~~зачёркнутый~~, ||спойлер||, ссылки
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n][\s\S]*?\*\*)|(__[^_\n][\s\S]*?__)|(~~[^~\n][\s\S]*?~~)|(\|\|[^|\n][\s\S]*?\|\|)|(https?:\/\/[^\s<>"'«»]+[^\s<>"'«».,;:!?)\]])/g

function inline(text: string, leaf: Leaf, kp: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, k = 0
  const re = new RegExp(INLINE.source, 'g')
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(leaf(text.slice(last, m.index), `${kp}l${k++}`))
    const t = m[0], key = `${kp}i${k++}`
    // snake_case и **kwargs внутри слов — не разметка
    if ((m[2] || m[3]) && /[A-Za-z0-9_]/.test(text[m.index - 1] || '')) { out.push(leaf(t, key)); last = re.lastIndex; continue }
    if (m[1]) out.push(<code key={key} className="px-1 py-[1px] rounded-[5px] font-mono text-[13px]" style={{ background: 'rgba(0,0,0,.28)', color: '#C8F7DD', userSelect: 'text' }}>{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<b key={key} className="font-bold">{inline(t.slice(2, -2), leaf, key)}</b>)
    else if (m[3]) out.push(<i key={key}>{inline(t.slice(2, -2), leaf, key)}</i>)
    else if (m[4]) out.push(<s key={key} className="opacity-80">{inline(t.slice(2, -2), leaf, key)}</s>)
    else if (m[5]) out.push(<Spoiler key={key}>{inline(t.slice(2, -2), leaf, key)}</Spoiler>)
    else if (m[6]) out.push(
      <a key={key} href={t} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openUrl(t) }}
        className="underline decoration-white/30 underline-offset-2 break-all" style={{ color: '#7FD3FF' }}>{t.replace(/^https?:\/\//, '').slice(0, 64)}{t.replace(/^https?:\/\//, '').length > 64 ? '…' : ''}</a>)
    last = re.lastIndex
  }
  if (last < text.length) out.push(leaf(text.slice(last), `${kp}l${k++}`))
  return out
}

/** Текст сообщения с разметкой. leaf — отрисовка простого текста (эмодзи, @упоминания). */
export function renderRich(text: string, leaf: Leaf): ReactNode[] {
  const out: ReactNode[] = []
  const re = /```([A-Za-z0-9+#_-]{0,15})\n?([\s\S]*?)```/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...inline(text.slice(last, m.index).replace(/\n$/, ''), leaf, `b${k++}`))
    out.push(<CodeBlock key={`cb${k++}`} code={m[2].replace(/\n$/, '')} lang={m[1] || ''} />)
    last = re.lastIndex
    if (text[last] === '\n') last++
  }
  if (last < text.length) out.push(...inline(text.slice(last), leaf, `b${k++}`))
  return out
}

export const hasRich = (t: string) => /```|`[^`]+`|\*\*|__|~~|\|\||https?:\/\//.test(t || '')

// ── превью ссылки ──
const PCACHE = new Map<string, LinkPreview | null>()
const PWAIT = new Map<string, Promise<LinkPreview | null>>()
function loadPreview(url: string): Promise<LinkPreview | null> {
  if (PCACHE.has(url)) return Promise.resolve(PCACHE.get(url)!)
  if (!PWAIT.has(url)) PWAIT.set(url, api.chatPreview(url).then(p => { const v = p && (p.title || p.descr) ? p : null; PCACHE.set(url, v); return v }).catch(() => null))
  return PWAIT.get(url)!
}

export function LinkPreviewCard({ url, mine }: { url: string; mine: boolean }) {
  const [p, setP] = useState<LinkPreview | null>(PCACHE.get(url) ?? null)
  const [imgOk, setImgOk] = useState(true)
  useEffect(() => { let on = true; loadPreview(url).then(v => { if (on) setP(v) }); return () => { on = false } }, [url])
  if (!p) return null
  return (
    <button onClick={(e) => { e.stopPropagation(); openUrl(url) }}
      className="mx-2 mb-1.5 mt-0.5 flex flex-col text-left rounded-[10px] overflow-hidden max-w-[calc(100%-16px)] active:opacity-80"
      style={{ background: mine ? 'rgba(0,0,0,.2)' : 'rgba(127,211,255,.07)', borderLeft: '3px solid #7FD3FF' }}>
      {p.image && imgOk && (
        <img src={api.chatPreviewImg(url)} alt="" loading="lazy" onError={() => setImgOk(false)}
          className="w-full max-h-[160px] object-cover pointer-events-none" />
      )}
      <span className="block px-2.5 py-1.5">
        {p.site && <span className="block text-[12px] font-semibold" style={{ color: '#7FD3FF' }}>{p.site}</span>}
        {p.title && <span className="block text-[13px] font-semibold text-fg leading-snug line-clamp-2">{p.title}</span>}
        {p.descr && <span className="block text-[12px] text-gray leading-snug line-clamp-3 mt-0.5">{p.descr}</span>}
      </span>
    </button>
  )
}

// ── кнопки форматирования над полем ввода (появляются при выделении текста) ──
export const FORMATS: { label: ReactNode; wrap: [string, string]; title: string }[] = [
  { label: <b>Ж</b>, wrap: ['**', '**'], title: 'Жирный' },
  { label: <i>К</i>, wrap: ['__', '__'], title: 'Курсив' },
  { label: <s>З</s>, wrap: ['~~', '~~'], title: 'Зачёркнутый' },
  { label: <span className="font-mono text-[12px]">{'</>'}</span>, wrap: ['`', '`'], title: 'Моноширинный' },
  { label: <span className="font-mono text-[12px]">{'{ }'}</span>, wrap: ['```\n', '\n```'], title: 'Блок кода' },
  { label: <span className="tracking-[-1px]">░░</span>, wrap: ['||', '||'], title: 'Спойлер' },
]
