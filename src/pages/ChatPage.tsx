import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import lottie from 'lottie-web'
import { inflate as pakoInflate } from 'pako'
import { api } from '../api/client'
import type { ChatMsg, ChatUserCard } from '../api/client'

// ── контурные иконки в стиле приложения (вместо обычных эмодзи в UI) ──
type IcP = { s?: number }
const _ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function IcEye({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg> }
function IcTimer({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><circle cx="12" cy="13" r="8" /><path d="M12 9.5V13l2.5 2" /><path d="M9 2.5h6" /></svg> }
function IcPhoto({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="9" r="1.6" /><path d="M21 15l-5-5L5 21" /></svg> }
function IcVideo({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><rect x="2.5" y="6" width="13" height="12" rx="3" /><path d="M15.5 10l6-3v10l-6-3" /></svg> }
function IcReply({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><polyline points="9 14 4 9 9 4" /><path d="M4 9h11a5 5 0 0 1 5 5v2" /></svg> }
function IcUser({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg> }
function IcEdit({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></svg> }
function IcPin({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z" /></svg> }
function IcTrash({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg> }
function IcHide({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19C5 19 1 12 1 12a18 18 0 0 1 5-5.9M9.9 4.2A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a18 18 0 0 1-2.2 3.2M1 1l22 22" /></svg> }
function IcCamera({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg> }
function IcBook({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M5 4a1 1 0 0 1 1-1h12v16H6a2 2 0 0 0-2 2V5z" /><path d="M4 19a2 2 0 0 1 2-2h12" /></svg> }
function IcFlame({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.3-2-1-3 2 1 4 3 4 7a7 7 0 1 1-14 0c0-5 5-6 7-11z" /></svg> }
function IcCert({ s = 16 }: IcP) { return <svg width={s} height={s} viewBox="0 0 24 24" {..._ic}><circle cx="12" cy="9" r="5" /><path d="M9 13l-1 8 4-2 4 2-1-8" /></svg> }

/** Анимированный стикер .tgs (gzip-Lottie): качаем, распаковываем, крутим. */
function LottieSticker({ url, size = 120, play = true }: { url: string; size?: number; play?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null
    let cancelled = false
    fetch(url).then(r => r.arrayBuffer()).then(buf => {
      if (cancelled || !ref.current) return
      try {
        const bytes = new Uint8Array(buf)
        const gz = bytes[0] === 0x1f && bytes[1] === 0x8b
        const raw = gz ? pakoInflate(bytes) : bytes
        const text = new TextDecoder().decode(raw)
        const data = JSON.parse(text)
        anim = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: play, autoplay: play, animationData: data })
      } catch { /* битый tgs — ничего */ }
    }).catch(() => {})
    return () => { cancelled = true; try { anim?.destroy() } catch { /* */ } }
  }, [url])
  return <div ref={ref} style={{ width: size, height: size }} />
}

/** Монтирует тяжёлый контент (видео/Lottie) только когда ячейка в зоне видимости —
 *  иначе webview захлёбывается на сотнях стикеров/эмодзи и ничего не рисует. */
function InView({ children, rootRef }: { children: any; rootRef: React.RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (es) => { if (es[0]) setVis(es[0].isIntersecting) },
      { root: rootRef?.current || null, rootMargin: '250px' })
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div ref={ref} className="w-full h-full flex items-center justify-center">{vis ? children : null}</div>
}

const tg = (window as any).Telegram?.WebApp
const ME = tg?.initDataUnsafe?.user
const MY_UN = (ME?.username || '').toLowerCase()

/** Цвета пузырей — как в тёмной теме Telegram. */
const BUB_IN = '#18222d'        // входящие (чужие)
const BUB_OUT = '#1f6f43'       // исходящие (свои) — в фирменном зелёном
const WALL = 'radial-gradient(1100px 560px at 50% -8%, #16261e 0%, #0e1612 42%, #0a0d0b 100%)'

const QUICK = ['❤️', '🔥', '👍', '😁', '👏', '🎉']
const PICKER = ['😀', '😂', '😍', '😎', '🤔', '😮', '😢', '😡', '👍', '👎', '🔥', '❤️', '🎉', '👏', '🙏', '💯', '🚀', '⚡', '✅', '❌', '👀', '💀', '🤝', '🤯']
const STICKERS = ['😂', '🤣', '😍', '🥰', '😎', '🤨', '😏', '🫠', '😭', '🥺', '😡', '🤬', '🤯', '🥳', '🤩', '😴', '🤤', '🤫', '🙈', '🙉', '🙊', '💀', '👻', '🔥', '💯', '👑', '💪', '🫡', '🤝', '👏', '🙏', '🎉', '🚀', '⚡', '❤️', '💔', '✨', '🌟', '🏆', '🥇', '🎯', '💸', '🧠', '👀', '🫣', '😇', '🤡']
const FILTERS: { name: string; css: string }[] = [
  { name: 'Ориг.', css: 'none' },
  { name: 'Ярко', css: 'brightness(1.15) saturate(1.3) contrast(1.05)' },
  { name: 'Ч/Б', css: 'grayscale(1) contrast(1.1)' },
  { name: 'Винтаж', css: 'sepia(0.5) contrast(1.1) brightness(1.05) saturate(1.2)' },
  { name: 'Тёплый', css: 'sepia(0.3) saturate(1.4) brightness(1.08) hue-rotate(-10deg)' },
  { name: 'Холод', css: 'saturate(1.2) brightness(1.05) hue-rotate(15deg) contrast(1.05)' },
  { name: 'Контраст', css: 'contrast(1.4) brightness(0.98)' },
  { name: 'Мягко', css: 'brightness(1.1) saturate(0.85) contrast(0.95)' },
  { name: 'Неон', css: 'saturate(1.8) contrast(1.2) brightness(1.05)' },
]

const TTL_STEPS = [0, 10, 60, 3600, 86400]
function ttlLabel(s: number) { return s === 0 ? 'выкл' : s < 60 ? `${s}с` : s < 3600 ? `${s / 60}м` : s < 86400 ? `${s / 3600}ч` : '24ч' }

function timeOf(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtDur(s: number) { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
function dayLabel(iso: string) {
  try {
    const d = new Date(iso); const now = new Date()
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
    const y = new Date(now); y.setDate(now.getDate() - 1)
    if (same(d, now)) return 'Сегодня'
    if (same(d, y)) return 'Вчера'
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  } catch { return '' }
}
const PAL = ['#4AE885', '#38E1FF', '#FFB648', '#FF6B9D', '#A78BFA', '#60D394', '#F97316', '#22D3EE']
function colorFor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PAL[h % PAL.length]
}

async function uploadMedia(type: string, file: Blob, mime: string, dur: number, caption: string, ttl = 0, once = false) {
  const fd = new FormData()
  fd.append('file', file, (file as File).name || `${type}.bin`)
  if (caption) fd.append('caption', caption)
  const url = api.chatUploadUrl(type, dur, ttl, once) + (mime ? `&mime=${encodeURIComponent(mime)}` : '')
  const res = await fetch(url, { method: 'POST', headers: { 'X-Init-Data': tg?.initData || '' }, body: fd })
  return res.json().catch(() => ({ error: 'bad' }))
}

function Avatar({ name, src, size = 34, anim, onClick }: { name: string; src?: string; size?: number; anim?: boolean; onClick?: () => void }) {
  const [ok, setOk] = useState(true)
  useEffect(() => { setOk(true) }, [src])
  const initials = (name || '?').replace('@', '').slice(0, 2).toUpperCase()
  const show = !!src && ok
  return (
    <div onClick={onClick} className="shrink-0 rounded-full overflow-hidden flex items-center justify-center font-extrabold"
      style={{ width: size, height: size, background: show ? '#000' : colorFor(name), color: '#fff', fontSize: size * 0.4 }}>
      {show
        ? (anim
          ? <video src={src} autoPlay loop muted playsInline className="w-full h-full object-cover" onError={() => setOk(false)} />
          : <img src={src} alt="" draggable={false} className="w-full h-full object-cover" onError={() => setOk(false)} />)
        : initials}
    </div>
  )
}

// кэш паков для разрешения инлайн-эмодзи в тексте (name -> pack)
const PACKCACHE: Record<string, import('../api/client').StickerPack> = {}
const EMOJI_TOKEN = /\{e:([avi]):([A-Za-z0-9_#-]+)\}/g

/** Кастом-эмодзи внутри текста. Новый формат — сам file_id (рисуется всегда),
 *  старый формат name#idx — через кэш паков (обратная совместимость). */
function InlineEmoji({ kind, eref, size }: { kind: string; eref: string; size: number }) {
  let fid = eref
  const h = eref.indexOf('#')
  if (h >= 0) {
    const nm = eref.slice(0, h), ix = parseInt(eref.slice(h + 1), 10)
    fid = PACKCACHE[nm]?.stickers[ix]?.fid || ''
  }
  if (!fid) return <span className="inline-block" style={{ width: size, height: size, verticalAlign: '-0.3em' }} />
  const url = api.chatStickerUrl(fid, kind === 'v' ? 'video' : kind === 'a' ? 'animated' : 'image')
  return (
    <span className="inline-block" style={{ width: size, height: size, verticalAlign: '-0.3em' }}>
      {kind === 'a' ? <LottieSticker url={url} size={size} />
        : kind === 'v' ? <video src={url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
          : <img src={url} alt="" loading="lazy" className="w-full h-full object-contain" />}
    </span>
  )
}

/** В превью (ответы/закреп) эмодзи-токены заменяем на 🙂, чтобы не светить код. */
function stripTokens(text: string) {
  return (text || '').replace(/\{e:[avi]:[A-Za-z0-9_#-]+\}/g, '🙂')
}

function renderText(text: string, big = false) {
  const out: any[] = []
  const re = new RegExp(EMOJI_TOKEN.source, 'g')
  let last = 0, mm: RegExpExecArray | null, key = 0
  const pushText = (s: string) => {
    if (!s) return
    s.split(/(@[A-Za-z0-9_]{3,32})/g).forEach((p) => {
      if (!p) return
      out.push(p.startsWith('@')
        ? <span key={key++} className="font-bold" style={{ color: '#7fe0ff' }}>{p}</span>
        : <span key={key++}>{p}</span>)
    })
  }
  while ((mm = re.exec(text))) {
    pushText(text.slice(last, mm.index))
    out.push(<InlineEmoji key={key++} kind={mm[1]} eref={mm[2]} size={big ? 44 : 20} />)
    last = mm.index + mm[0].length
  }
  pushText(text.slice(last))
  return out
}

// ── rich-поле ввода (contenteditable): эмодзи рисуются прямо в строке, как в Telegram ──
function buildEmojiSpan(kind: string, fid: string): HTMLElement {
  const span = document.createElement('span')
  span.setAttribute('contenteditable', 'false')
  span.setAttribute('data-e', `${kind}:${fid}`)
  span.style.display = 'inline-block'
  span.style.width = '20px'; span.style.height = '20px'; span.style.verticalAlign = '-0.35em'; span.style.margin = '0 1px'
  const url = api.chatStickerUrl(fid, kind === 'v' ? 'video' : kind === 'a' ? 'animated' : 'image')
  if (kind === 'v') {
    const v = document.createElement('video'); v.src = url; v.autoplay = true; v.loop = true; v.muted = true
    v.setAttribute('playsinline', ''); v.style.width = '100%'; v.style.height = '100%'; v.style.objectFit = 'contain'; span.appendChild(v)
  } else if (kind === 'a') {
    const d = document.createElement('div'); d.style.width = '20px'; d.style.height = '20px'; span.appendChild(d)
    fetch(url).then(r => r.arrayBuffer()).then(buf => {
      try { const b = new Uint8Array(buf); const raw = (b[0] === 0x1f && b[1] === 0x8b) ? pakoInflate(b) : b; const data = JSON.parse(new TextDecoder().decode(raw)); lottie.loadAnimation({ container: d, renderer: 'svg', loop: true, autoplay: true, animationData: data }) } catch { /* */ }
    }).catch(() => {})
  } else {
    const img = document.createElement('img'); img.src = url; img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain'; span.appendChild(img)
  }
  return span
}

function serializeEditor(root: HTMLElement): string {
  let out = ''
  root.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += n.textContent || ''
    else if (n.nodeType === 1) {
      const el = n as HTMLElement
      if (el.tagName === 'BR') out += '\n'
      else if (el.hasAttribute('data-e')) { const d = el.getAttribute('data-e') || ''; out += `{e:${d.slice(0, 1)}:${d.slice(2)}}` }
      else { if (el.tagName === 'DIV' && out && !out.endsWith('\n')) out += '\n'; out += serializeEditor(el) }
    }
  })
  return out
}

function fillEditor(root: HTMLElement, text: string) {
  root.innerHTML = ''
  const re = new RegExp(EMOJI_TOKEN.source, 'g')
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) root.appendChild(document.createTextNode(text.slice(last, m.index)))
    let fid = m[2]; const k = m[1]; const h = fid.indexOf('#')
    if (h >= 0) { const nm = fid.slice(0, h); fid = PACKCACHE[nm]?.stickers[parseInt(fid.slice(h + 1), 10)]?.fid || '' }
    if (fid) root.appendChild(buildEmojiSpan(k, fid))
    last = m.index + m[0].length
  }
  if (last < text.length) root.appendChild(document.createTextNode(text.slice(last)))
}

function insertAtCaret(root: HTMLElement, node: Node) {
  const sel = window.getSelection()
  if (sel && sel.rangeCount && root.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(node)
    range.setStartAfter(node); range.collapse(true); sel.removeAllRanges(); sel.addRange(range)
  } else {
    root.appendChild(node)
  }
}

/** Голосовое сообщение: play/pause + «волна» + таймер, как в Telegram. */
function VoiceMsg({ url, mine }: { url: string; mine?: boolean }) {
  const aRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const bars = useMemo(() => {
    let h = 0; for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0
    const a: number[] = []
    for (let i = 0; i < 32; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; a.push(0.22 + (h % 100) / 100 * 0.78) }
    return a
  }, [url])
  const toggle = () => { const a = aRef.current; if (!a) return; if (a.paused) { a.play().catch(() => {}); setPlaying(true) } else { a.pause(); setPlaying(false) } }
  const onMeta = () => {
    const a = aRef.current; if (!a) return
    if (!isFinite(a.duration)) { a.currentTime = 1e101; a.ontimeupdate = () => { a.ontimeupdate = null; a.currentTime = 0; setDur(a.duration) } }
    else setDur(a.duration)
  }
  const frac = dur > 0 ? Math.min(1, cur / dur) : 0
  const accent = mine ? '#d6ffe8' : '#4AE885'
  const dim = mine ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.2)'
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2" style={{ minWidth: 190, maxWidth: 260 }}>
      <button onClick={toggle} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: accent, color: '#06281a' }}>
        {playing
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
      </button>
      <div className="flex items-center gap-[2px] h-7 flex-1 cursor-pointer" onClick={(e) => { const a = aRef.current; if (!a || !dur) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * dur; setCur(a.currentTime) }}>
        {bars.map((b, i) => (
          <span key={i} style={{ width: 3, borderRadius: 3, height: `${Math.round(b * 100)}%`, background: (i / bars.length) <= frac ? accent : dim }} />
        ))}
      </div>
      <span className="text-[11px] tabular-nums shrink-0" style={{ color: mine ? 'rgba(255,255,255,.8)' : '#9a9aa2' }}>{fmtDur((playing || cur) ? cur : dur)}</span>
      <audio ref={aRef} src={url} preload="metadata" onLoadedMetadata={onMeta}
        onTimeUpdate={() => setCur(aRef.current?.currentTime || 0)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0) }} />
    </div>
  )
}

/** Время + «изменено» + галочки, как в Telegram (встроено в хвост последней строки). */
function MsgMeta({ m, light }: { m: ChatMsg; light?: boolean }) {
  return (
    <span className="select-none whitespace-nowrap" style={{ fontSize: 11, color: light ? 'rgba(255,255,255,.95)' : m.mine ? 'rgba(215,255,232,.65)' : '#7a8893' }}>
      {m.edited && <span className="italic mr-1">ред.</span>}
      {m.once && <span className="mr-1">👁</span>}
      {!!m.ttl && <span className="mr-1">⏱</span>}
      {timeOf(m.created_at)}
      {m.mine && <span className="ml-1" style={{ color: light ? '#fff' : '#8fe6c0' }}>✓✓</span>}
    </span>
  )
}

function Reactions({ m, onToggle }: { m: ChatMsg; onToggle: (id: number, e: string) => void }) {
  if (!m.reactions?.length) return null
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${m.mine ? 'justify-end' : 'justify-start'}`}>
      {m.reactions.map(r => (
        <button key={r.emoji} onClick={(e) => { e.stopPropagation(); onToggle(m.id, r.emoji) }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] active:scale-95 transition-transform"
          style={{ background: r.mine ? 'rgba(74,232,133,.22)' : 'rgba(255,255,255,.08)', border: `1px solid ${r.mine ? 'rgba(74,232,133,.55)' : 'transparent'}` }}>
          <span>{r.emoji}</span><span className="text-[12px] font-bold" style={{ color: r.mine ? '#4AE885' : '#cfcfd4' }}>{r.count}</span>
        </button>
      ))}
    </div>
  )
}

function ProfileCard({ uid, onClose, onMention }: { uid: number; onClose: () => void; onMention: (un: string) => void }) {
  const [c, setC] = useState<ChatUserCard | null>(null)
  const [ver, setVer] = useState(0)
  const [busy, setBusy] = useState('')
  const avInput = useRef<HTMLInputElement>(null)
  const isMe = (ME?.id || 0) === uid
  const reload = () => api.chatUser(uid).then(setC).catch(() => {})
  useEffect(() => { api.chatUser(uid).then(setC).catch(() => onClose()) }, [uid])

  const uploadAvatar = async (f: File) => {
    setBusy('Загружаю…')
    try {
      const fd = new FormData(); fd.append('file', f)
      await fetch(api.chatAvatarUploadUrl(), { method: 'POST', headers: { 'X-Init-Data': tg?.initData || '' }, body: fd })
      setVer(Date.now()); await reload()
    } catch { /* */ } finally { setBusy('') }
  }
  const setMode = async (m: string) => {
    setBusy('…')
    try { await api.chatAvatarMode(m); setVer(Date.now()); await reload() } catch { /* */ } finally { setBusy('') }
  }

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.6)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full max-w-[460px] rounded-t-[26px] p-5 pb-8" style={{ background: '#0d0e12', border: '1px solid rgba(74,232,133,.14)', boxShadow: '0 -8px 40px rgba(0,0,0,.5)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,.14)' }} />
        {!c ? (
          <div className="py-8 text-center text-[13px] text-[#8a8a93]">Загрузка…</div>
        ) : (
          <>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="shrink-0 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg,#39FF9A,#0f8a3e)' }}>
                <Avatar name={c.name} src={api.chatAvatarUrl(c.user_id, ver || undefined)} anim={c.avatar_anim} size={60} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[18px] font-extrabold text-white truncate flex items-center gap-2">
                  {c.name}
                  {c.is_premium && <span className="text-[9px] font-extrabold px-1.5 py-[3px] rounded-md tracking-wider shrink-0" style={{ background: 'linear-gradient(135deg,#39FF9A,#22C55E)', color: '#06281a' }}>PREMIUM</span>}
                </div>
                {c.username && <div className="text-[13px] text-[#8a8a93]">@{c.username}</div>}
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-bold" style={{ background: 'rgba(74,232,133,.1)', border: '1px solid rgba(74,232,133,.28)', color: '#4AE885' }}>
                  <span>{c.rank_emoji}</span>{c.rank}<span className="text-[#cfcfd4] font-semibold">· {c.xp} XP</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[['book', c.materials_done, 'пройдено'], ['flame', c.streak, 'дней подряд'], ['cert', c.certificates, 'сертификатов']].map(([ic, val, lab], i) => (
                <div key={i} className="rounded-2xl py-3 text-center" style={{ background: 'linear-gradient(180deg,rgba(74,232,133,.08),rgba(255,255,255,.015))', border: '1px solid rgba(74,232,133,.16)' }}>
                  <div className="flex justify-center" style={{ color: '#4AE885' }}>{ic === 'book' ? <IcBook s={18} /> : ic === 'flame' ? <IcFlame s={18} /> : <IcCert s={18} />}</div>
                  <div className="text-[20px] font-extrabold text-green leading-none mt-1">{val as number}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#9a9aa2] mt-1">{lab as string}</div>
                </div>
              ))}
            </div>

            {isMe && (
              <div className="mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#9a9aa2] mb-2">Аватар в чате {busy && <span className="text-green normal-case">· {busy}</span>}</div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => avInput.current?.click()} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#17171d' }}><IcCamera s={15} /> Поставить своё фото / анимацию</button>
                  <div className="flex gap-2">
                    <button onClick={() => setMode('tg')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold text-white" style={{ background: '#17171d' }}><IcReply s={14} /> Из Telegram</button>
                    <button onClick={() => setMode('hidden')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold text-[#ff8a8a]" style={{ background: 'rgba(255,80,80,.1)' }}><IcHide s={14} /> Скрыть</button>
                  </div>
                </div>
                <div className="text-[10.5px] text-[#6a6a75] mt-2">Анимация — загрузи короткое видео/GIF (до 12 МБ). Все увидят его живым в чате.</div>
                <input ref={avInput} type="file" accept="image/*,video/*,image/gif" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadAvatar(f) }} />
              </div>
            )}

            <div className="flex gap-2">
              {!isMe && c.username && (
                <button onClick={() => { onMention(c.username); onClose() }}
                  className="flex-1 py-3 rounded-xl font-extrabold text-[13px] text-white" style={{ background: 'linear-gradient(135deg,#17a34a,#0f8a3e 55%,#0a6a2f)', border: '1px solid rgba(120,255,170,.3)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14)' }}>
                  Упомянуть @{c.username}
                </button>
              )}
              <button onClick={onClose} className={`${isMe || !c.username ? 'flex-1' : 'px-5'} py-3 rounded-xl font-bold text-[13px]`} style={{ background: '#1d1d24', color: '#cfcfd4' }}>Закрыть</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function Bubble({ m, prev, next, byId, onAction, onReact, onProfile, onMedia }: {
  m: ChatMsg; prev: ChatMsg | null; next: ChatMsg | null; byId: Map<number, ChatMsg>
  onAction: (m: ChatMsg) => void; onReact: (id: number, e: string) => void
  onProfile: (uid: number) => void; onMedia: (url: string, video: boolean, msg?: ChatMsg) => void
}) {
  const mine = m.mine
  const near = (a: ChatMsg, b: ChatMsg) => Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 5 * 60000
  const grouped = !!prev && prev.user_id === m.user_id && !prev.deleted && near(prev, m)   // есть сообщение выше от того же
  const groupedNext = !!next && next.user_id === m.user_id && !next.deleted && near(next, m) // есть сообщение ниже от того же
  const tail = !groupedNext // последний в своей серии — рисуем «хвост»
  const mentionsMe = !!MY_UN && !m.mine && (m.text || '').toLowerCase().includes('@' + MY_UN)
  const quoted = m.reply_to ? byId.get(m.reply_to) : null
  const src = m.has_media ? api.chatMediaUrl(m.id) : ''
  const onlyEmoji = !!m.text && /\{e:[avi]:[A-Za-z0-9_#-]+\}/.test(m.text) && m.text.replace(/\{e:[avi]:[A-Za-z0-9_#-]+\}/g, '').trim() === ''
  // долгое нажатие на медиа → меню (ответить/удалить), обычный тап → просмотр
  const lpTimer = useRef<number | null>(null)
  const lpFired = useRef(false)
  const lpStart = () => { lpFired.current = false; lpTimer.current = window.setTimeout(() => { lpFired.current = true; onAction(m) }, 450) }
  const lpEnd = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null } }

  if (m.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} px-3 my-0.5`}>
        <div className="px-3 py-1.5 rounded-2xl text-[12px] italic" style={{ background: 'rgba(255,255,255,.05)', color: '#6a6a75' }}>сообщение удалено</div>
      </div>
    )
  }

  // радиусы углов — хвост у края снизу делаем острым, как в Telegram
  const radius = mine
    ? { borderRadius: 18, borderBottomRightRadius: tail ? 5 : 18 }
    : { borderRadius: 18, borderBottomLeftRadius: tail ? 5 : 18 }

  if (m.type === 'sticker') {
    return (
      <div className={`flex gap-2 px-2 ${grouped ? 'mt-0.5' : 'mt-2'} ${mine ? 'flex-row-reverse' : ''}`}>
        {mine ? null : (tail ? <Avatar name={m.name} src={api.chatAvatarUrl(m.user_id)} anim={m.anim} onClick={() => onProfile(m.user_id)} /> : <div className="w-[34px] shrink-0" />)}
        <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
          {!grouped && !mine && <div className="text-[12px] font-semibold mb-0.5 ml-1" style={{ color: colorFor(m.name) }} onClick={() => onProfile(m.user_id)}>{m.name}</div>}
          <div onClick={() => onAction(m)} className="relative px-1 active:scale-105 transition-transform cursor-pointer">
            {m.has_media
              ? ((m.mime || '').includes('tgs')
                ? <LottieSticker url={api.chatMediaUrl(m.id)} size={128} />
                : (m.mime || '').startsWith('video')
                  ? <video src={api.chatMediaUrl(m.id)} autoPlay loop muted playsInline className="w-[128px] h-[128px] object-contain" />
                  : <img src={api.chatMediaUrl(m.id)} alt="" draggable={false} className="w-[128px] h-[128px] object-contain" />)
              : <span className="text-[62px] leading-none">{m.text}</span>}
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full flex items-center" style={{ background: 'rgba(0,0,0,.45)' }}><MsgMeta m={m} light /></span>
          </div>
          <Reactions m={m} onToggle={onReact} />
        </div>
      </div>
    )
  }

  const onlyMedia = m.has_media && !m.text && !(m.once && !mine)

  return (
    <div className={`flex gap-2 px-2 ${grouped ? 'mt-0.5' : 'mt-2'} ${mine ? 'flex-row-reverse' : ''}`} style={{ overflow: 'hidden' }}>
      {mine ? null : (tail ? <Avatar name={m.name} src={api.chatAvatarUrl(m.user_id)} anim={m.anim} onClick={() => onProfile(m.user_id)} /> : <div className="w-[34px] shrink-0" />)}
      <div className={`max-w-[80%] min-w-0 ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div onClick={() => onAction(m)} className="relative overflow-hidden active:opacity-90 max-w-full shadow-sm"
          style={{
            ...radius,
            background: mine ? BUB_OUT : BUB_IN,
            border: mentionsMe ? '1.5px solid #4AE885' : 'none',
            boxShadow: mentionsMe ? '0 0 14px rgba(74,232,133,.25)' : '0 1px 1px rgba(0,0,0,.25)',
          }}>
          {!grouped && !mine && (
            <div className="px-2.5 pt-1.5 text-[13px] font-semibold flex items-center gap-1.5 leading-none" style={{ color: colorFor(m.name) }} onClick={(e) => { e.stopPropagation(); onProfile(m.user_id) }}>
              {m.name}{m.username ? <span className="text-[#6a7582] font-normal text-[11px]">@{m.username}</span> : null}
            </div>
          )}
          {quoted && (
            <div className="mx-1.5 mt-1.5 px-2 py-1 rounded-md text-[12px]" style={{ background: mine ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.06)', borderLeft: '2px solid rgba(127,224,255,.7)' }}>
              <span className="font-semibold" style={{ color: '#7fe0ff' }}>{quoted.name}</span>
              <div className="truncate" style={{ color: mine ? 'rgba(255,255,255,.75)' : '#b9b9c2' }}>{quoted.deleted ? 'удалено' : (stripTokens(quoted.text) || '📎 вложение')}</div>
            </div>
          )}

          {m.has_media && m.once && !mine ? (
            <button onClick={(e) => { e.stopPropagation(); onMedia(src, m.type === 'video' || m.type === 'gif', m) }}
              className="flex items-center gap-2.5 px-4 py-4 text-left">
              <span className="text-[22px]">👁</span>
              <div>
                <div className="text-[13px] font-bold text-white">Посмотреть 1 раз</div>
                <div className="text-[11px] text-[#9a9aa2]">Нажми, чтобы открыть</div>
              </div>
            </button>
          ) : (
            <div className="relative">
              {m.type === 'photo' && src && (
                <img src={src} draggable={false} alt=""
                  onClick={(e) => { e.stopPropagation(); if (lpFired.current) { lpFired.current = false; return } onMedia(src, false, m) }}
                  onTouchStart={lpStart} onTouchEnd={lpEnd} onTouchMove={lpEnd}
                  onMouseDown={lpStart} onMouseUp={lpEnd} onMouseLeave={lpEnd}
                  onContextMenu={(e) => e.preventDefault()}
                  className="block max-h-[230px] max-w-[66vw] w-auto object-cover select-none"
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }} />
              )}
              {m.type === 'gif' && (m.media_url || src) && (
                /\.(mp4|webm)(\?|$)/i.test(m.media_url || src)
                  ? <video src={m.media_url || src} autoPlay loop muted playsInline className="block max-h-[210px] max-w-[66vw] w-auto object-cover select-none" />
                  : <img src={m.media_url || src} alt="" draggable={false} className="block max-h-[210px] max-w-[66vw] w-auto object-cover select-none" />
              )}
              {m.type === 'video' && src && (
                <video src={src} controls controlsList="nodownload noplaybackrate" disablePictureInPicture className="block max-h-[260px] max-w-[66vw] w-auto select-none" />
              )}
              {m.type === 'voice' && src && <VoiceMsg url={src} mine={mine} />}
              {/* на медиа без подписи — время поверх картинки в тёмной плашке */}
              {onlyMedia && (m.type === 'photo' || m.type === 'gif' || m.type === 'video') && (
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full flex items-center" style={{ background: 'rgba(0,0,0,.5)' }}><MsgMeta m={m} light /></span>
              )}
            </div>
          )}

          {m.text && (
            <div className="px-2.5 py-1.5 text-[15px] leading-[1.32] text-white break-words" style={{ wordBreak: 'break-word' }}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{renderText(m.text, onlyEmoji)}</span>
              {/* метаданные встроены в конец последней строки — текст обтекает, как в Telegram */}
              <span className="inline-block align-bottom ml-2" style={{ transform: 'translateY(2px)' }}><MsgMeta m={m} /></span>
            </div>
          )}

          {/* если текста нет и это не только-медиа (напр. голос) — метаданные отдельной строкой */}
          {!m.text && !onlyMedia && m.type !== 'photo' && m.type !== 'gif' && m.type !== 'video' && (
            <div className={`px-2.5 pb-1 flex ${mine ? 'justify-end' : 'justify-start'}`}><MsgMeta m={m} /></div>
          )}
        </div>
        <Reactions m={m} onToggle={onReact} />
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [ready, setReady] = useState(false)   // показываем ленту только когда она уже внизу
  const [online, setOnline] = useState(0)
  const [typing, setTyping] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [pinned, setPinned] = useState<ChatMsg | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [reply, setReply] = useState<ChatMsg | null>(null)
  const [editing, setEditing] = useState<ChatMsg | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [photoEdit, setPhotoEdit] = useState<{ url: string; file: File } | null>(null)
  const [filterIdx, setFilterIdx] = useState(0)
  const [rec, setRec] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  const [recCancel, setRecCancel] = useState(false)
  const recTimer = useRef<number | null>(null)
  const recCancelRef = useRef(false)
  const touchStartX = useRef(0)
  const micStream = useRef<MediaStream | null>(null)
  const wantRec = useRef(false)
  const [ttlSec, setTtlSec] = useState(0)
  const [onceOn, setOnceOn] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [gifEnabled, setGifEnabled] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifs, setGifs] = useState<import('../api/client').GifItem[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const [packs, setPacks] = useState<import('../api/client').StickerPack[]>([])
  const [stickerTab, setStickerTab] = useState<string>(() => { try { return localStorage.getItem('chat_sttab') || 'emoji' } catch { return 'emoji' } })
  const [addPackLink, setAddPackLink] = useState('')
  const [packBusy, setPackBusy] = useState(false)
  const [menuFor, setMenuFor] = useState<ChatMsg | null>(null)
  const [profileFor, setProfileFor] = useState<number | null>(null)
  const [viewer, setViewer] = useState<{ url: string; video: boolean; id?: number; mine?: boolean } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastId = useRef(0)
  const atBottom = useRef(true)
  const lastTyping = useRef(0)
  const mediaRec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const recStart = useRef(0)
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLDivElement>(null)   // rich-поле ввода (contenteditable)
  const stScrollRef = useRef<HTMLDivElement>(null)

  const byId = new Map(msgs.map(m => [m.id, m]))
  const emojiPacks = packs.filter(p => p.emoji)          // custom_emoji паки → вставка в текст
  const stickerPacks = packs.filter(p => !p.emoji)       // обычные стикеры → отдельным сообщением
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    })
  }
  const jumpBottom = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }

  const merge = useCallback((incoming: ChatMsg[]) => {
    if (!incoming.length) return
    setMsgs(prev => {
      const map = new Map(prev.map(m => [m.id, m]))
      for (const m of incoming) map.set(m.id, m)
      const arr = [...map.values()].sort((a, b) => a.id - b.id)
      lastId.current = arr.length ? arr[arr.length - 1].id : 0
      return arr
    })
  }, [])

  useEffect(() => {
    let alive = true
    const pull = async (first = false) => {
      try {
        const r = await api.chat()
        if (!alive) return
        setOnline(r.online); setIsAdmin(!!r.is_admin); setPinned(r.pinned ?? null); setTyping(r.typing ?? []); setGifEnabled(!!r.gif)
        const wasBottom = atBottom.current
        setMsgs(r.messages); lastId.current = r.messages.length ? r.messages[r.messages.length - 1].id : 0
        if (first) {
          // открываем сразу на последнем сообщении, без видимой прокрутки
          requestAnimationFrame(() => { jumpBottom(); requestAnimationFrame(() => { jumpBottom(); setReady(true) }) })
          setTimeout(jumpBottom, 120); setTimeout(jumpBottom, 350); setTimeout(jumpBottom, 700)
        } else if (wasBottom) scrollToBottom(true)
      } catch { /* тихо */ }
    }
    pull(true)
    loadPacks()  // чтобы инлайн-эмодзи в сообщениях сразу находили свой пак
    const t = window.setInterval(() => pull(false), 2200)
    return () => { alive = false; window.clearInterval(t) }
  }, [])

  // запоминаем последнюю выбранную вкладку панели
  useEffect(() => { try { localStorage.setItem('chat_sttab', stickerTab) } catch { /* */ } }, [stickerTab])

  // при закрытии чата — гарантированно выключаем микрофон и таймер
  useEffect(() => () => {
    wantRec.current = false
    if (recTimer.current) clearInterval(recTimer.current)
    if (micStream.current) { micStream.current.getTracks().forEach(t => t.stop()); micStream.current = null }
  }, [])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (el.scrollTop < 60 && msgs.length) loadOlder()
  }

  const loadingOlder = useRef(false)
  const loadOlder = async () => {
    if (loadingOlder.current || !msgs.length) return
    loadingOlder.current = true
    const before = msgs[0].id
    try {
      const r = await api.chatOlder(before)
      if (r.messages.length) {
        const el = scrollRef.current
        const prevH = el?.scrollHeight || 0
        merge(r.messages)
        requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH })
      }
    } catch { /* */ }
    finally { setTimeout(() => { loadingOlder.current = false }, 400) }
  }

  // синхронизация rich-поля: читаем контент редактора в text (с токенами эмодзи)
  const refreshFromEditor = () => { const el = taRef.current; if (el) setText(serializeEditor(el)) }
  const setComposer = (t: string) => { setText(t); const el = taRef.current; if (el) fillEditor(el, t) }
  const onEditorInput = () => {
    refreshFromEditor()
    const now = Date.now()
    if (now - lastTyping.current > 2500) { lastTyping.current = now; api.chatTyping().catch(() => {}) }
  }
  const insertEmojiNode = (fid: string, kind: string) => {
    const el = taRef.current; if (!el) return
    const k = kind === 'video' ? 'v' : kind === 'animated' ? 'a' : 'i'
    insertAtCaret(el, buildEmojiSpan(k, fid)); refreshFromEditor()
  }
  const insertTextAtCaret = (s: string) => {
    const el = taRef.current; if (!el) return
    insertAtCaret(el, document.createTextNode(s)); refreshFromEditor()
  }

  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      if (editing) {
        const r = await api.chatEdit(editing.id, t)
        if (r.error) flash('Не удалось изменить')
        setEditing(null); setComposer('')
      } else {
        const r = await api.chatSend(t, reply?.id, ttlSec || undefined)
        if (r.error === 'slow') { flash(r.message || 'Не так быстро'); setSending(false); return }
        setComposer(''); setReply(null)
      }
      const fresh = await api.chat()
      setMsgs(fresh.messages); lastId.current = fresh.messages.at(-1)?.id || 0; scrollToBottom()
    } catch { flash('Не удалось отправить') }
    finally { setSending(false) }
  }

  const doUpload = async (type: string, file: Blob, mime: string, dur = 0) => {
    flash('Загружаю…')
    const r = await uploadMedia(type, file, mime, dur, '', ttlSec, onceOn)
    if (onceOn) setOnceOn(false)
    if (r?.error) { flash(r.message || 'Не удалось загрузить'); return }
    const fresh = await api.chat()
    setMsgs(fresh.messages); lastId.current = fresh.messages.at(-1)?.id || 0; scrollToBottom(); setToast('')
  }

  const onPick = (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; setAttachOpen(false)
    if (!f) return
    if (type === 'photo') { setFilterIdx(0); setPhotoEdit({ url: URL.createObjectURL(f), file: f }) }
    else doUpload(type, f, f.type || '')
  }

  const loadPacks = () => api.chatStickers().then(r => { const ps = r.packs || []; setPacks(ps); for (const p of ps) PACKCACHE[p.name] = p }).catch(() => {})
  const openSticker = () => { setAttachOpen(false); setStickerOpen(true); loadPacks() }
  const sendStickerFile = async (fid: string, kind: string) => {
    setStickerOpen(false)
    try {
      await api.chatStickerFile(fid, kind, ttlSec || undefined)
      const fresh = await api.chat(); setMsgs(fresh.messages); lastId.current = fresh.messages.at(-1)?.id || 0; scrollToBottom()
    } catch { flash('Не удалось отправить') }
  }
  const addPack = async () => {
    const l = addPackLink.trim(); if (!l) return
    setPackBusy(true)
    try {
      const r = await api.chatStickersAdd(l)
      if (r.error) flash(r.message || 'Пак не найден')
      else { setAddPackLink(''); await loadPacks(); if (r.pack) setStickerTab(r.pack.emoji ? 'emoji' : r.pack.name) }
    } catch { flash('Ошибка') } finally { setPackBusy(false) }
  }
  const removePack = async (name: string) => {
    try {
      await api.chatStickersRemove(name)
      if (stickerTab === name) setStickerTab('emoji')
      await loadPacks()
      flash('Набор удалён')
    } catch { flash('Не удалось удалить') }
  }


  const loadGifs = (q: string) => {
    setGifLoading(true)
    api.chatGif(q).then(r => setGifs(r.gifs || [])).catch(() => setGifs([])).finally(() => setGifLoading(false))
  }
  const openGif = () => { setAttachOpen(false); setGifOpen(true); if (!gifs.length) loadGifs('') }
  const sendGif = async (url: string) => {
    setGifOpen(false)
    try {
      await api.chatGifSend(url, ttlSec || undefined)
      const fresh = await api.chat(); setMsgs(fresh.messages); lastId.current = fresh.messages.at(-1)?.id || 0; scrollToBottom()
    } catch { flash('Не удалось отправить') }
  }

  // поиск гифок с задержкой
  useEffect(() => {
    if (!gifOpen) return
    const t = setTimeout(() => loadGifs(gifQuery.trim()), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifQuery, gifOpen])

  const sendEditedPhoto = async () => {
    if (!photoEdit) return
    const css = FILTERS[filterIdx].css
    try {
      const img = new Image()
      img.src = photoEdit.url
      await img.decode().catch(() => {})
      const maxW = 1280
      const nw = img.naturalWidth || maxW, nh = img.naturalHeight || maxW
      const scale = Math.min(1, maxW / nw)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(nw * scale); canvas.height = Math.round(nh * scale)
      const ctx = canvas.getContext('2d')!
      ctx.filter = css === 'none' ? 'none' : css
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b as Blob), 'image/jpeg', 0.9))
      URL.revokeObjectURL(photoEdit.url)
      setPhotoEdit(null)
      await doUpload('photo', blob, 'image/jpeg')
    } catch {
      // если фильтр не применился — шлём как есть
      const f = photoEdit.file; URL.revokeObjectURL(photoEdit.url); setPhotoEdit(null)
      await doUpload('photo', f, f.type || 'image/jpeg')
    }
  }

  const del = async (id: number) => {
    setMsgs(prev => prev.map(m => m.id === id ? { ...m, deleted: true, text: '', has_media: false } : m))
    try { await api.chatDelete(id) } catch { /* */ }
  }
  const pin = async (id: number) => { try { await api.chatPin(id); const r = await api.chat(); setPinned(r.pinned ?? null); setMenuFor(null); flash('Закреплено') } catch { /* */ } }
  const unpin = async () => { try { await api.chatUnpin(); setPinned(null) } catch { /* */ } }

  const react = async (id: number, emoji: string) => {
    setMsgs(prev => prev.map(m => {
      if (m.id !== id) return m
      const rs = [...(m.reactions || [])]; const i = rs.findIndex(r => r.emoji === emoji)
      if (i >= 0) {
        const r = rs[i]; const nc = r.count + (r.mine ? -1 : 1)
        if (nc <= 0) rs.splice(i, 1); else rs[i] = { ...r, count: nc, mine: !r.mine }
      } else rs.push({ emoji, count: 1, mine: true })
      return { ...m, reactions: rs }
    }))
    try { await api.chatReact(id, emoji) } catch { /* */ }
    setMenuFor(null)
  }

  const startEdit = (m: ChatMsg) => { setEditing(m); setReply(null); setComposer(m.text); setMenuFor(null); taRef.current?.focus() }
  const startReply = (m: ChatMsg) => { setReply(m); setEditing(null); setMenuFor(null); taRef.current?.focus() }
  const insertMention = (un: string) => { insertTextAtCaret('@' + un + ' ') }

  const stopMic = () => {
    const s = micStream.current
    if (s) { s.getTracks().forEach(t => { try { t.enabled = false } catch { /* */ } try { t.stop() } catch { /* */ } }); micStream.current = null }
  }
  const startRec = async () => {
    if (rec || micStream.current || wantRec.current) return   // уже идёт/готовится
    wantRec.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!wantRec.current) { stream.getTracks().forEach(t => t.stop()); return }   // палец отпустили до выдачи доступа
      micStream.current = stream
      const mr = new MediaRecorder(stream); chunks.current = []
      mr.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data) }
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' })
        stopMic()   // микрофон выключаем сразу
        const dur = (Date.now() - recStart.current) / 1000
        if (recCancelRef.current) { recCancelRef.current = false; return }   // отменено
        if (blob.size > 1200 && dur > 0.5) doUpload('voice', blob, mr.mimeType || 'audio/webm', dur)
        else flash('Слишком коротко — держи дольше')
      }
      mediaRec.current = mr; recStart.current = Date.now()
      recCancelRef.current = false; setRecCancel(false); setRecElapsed(0)
      mr.start(); setRec(true)
      recTimer.current = window.setInterval(() => setRecElapsed(Math.floor((Date.now() - recStart.current) / 1000)), 250)
    } catch { wantRec.current = false; stopMic(); flash('Нет доступа к микрофону') }
  }
  const stopRec = () => {
    wantRec.current = false
    setRec(false); setRecCancel(false)
    if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null }
    const s = micStream.current
    const mr = mediaRec.current
    if (mr && mr.state !== 'inactive') { try { mr.stop() } catch { /* */ } }   // onstop выключит микрофон
    else { stopMic() }   // рекордер ещё не стартовал — глушим поток напрямую
    // страховка: если onstop не выключил этот конкретный поток — глушим его принудительно
    if (s) setTimeout(() => { s.getTracks().forEach(t => { try { t.stop() } catch { /* */ } }); if (micStream.current === s) micStream.current = null }, 600)
  }
  const cancelRec = () => { recCancelRef.current = true; stopRec() }

  let lastDay = ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden max-w-full" style={{ WebkitUserSelect: 'none', userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>

      <div className="flex items-center justify-center gap-1.5 px-4 py-1 shrink-0" style={{ background: '#0c0c10' }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green" />
        </span>
        <span className="text-[11px]"><b className="text-green">{online}</b> <span className="text-[#8a8a93]">в сети</span></span>
      </div>

      {pinned && !pinned.deleted && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(74,232,133,.22)', background: 'rgba(34,197,94,.06)' }}>
          <span className="text-green"><IcPin s={14} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-green">Закреплено · {pinned.name}</div>
            <div className="text-[12px] text-white truncate">{stripTokens(pinned.text) || '📎 вложение'}</div>
          </div>
          {isAdmin && <button onClick={unpin} className="text-[11px] font-bold text-[#8a8a93] px-2 py-1">Открепить</button>}
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ overscrollBehavior: 'contain', background: WALL, opacity: ready ? 1 : 0, transition: 'opacity .12s' }}>
        {msgs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[#8a8a93] px-8 text-center">Пока тихо. Напиши первым — поздоровайся с базой 👋</div>
        ) : msgs.map((m, i) => {
          const d = dayLabel(m.created_at); const sep = d !== lastDay; lastDay = d
          return (
            <div key={m.id}>
              {sep && (
                <div className="flex justify-center my-2.5">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(0,0,0,.35)', color: '#d7d7dc', backdropFilter: 'blur(2px)' }}>{d}</span>
                </div>
              )}
              <Bubble m={m} prev={i > 0 ? msgs[i - 1] : null} next={i < msgs.length - 1 ? msgs[i + 1] : null} byId={byId} onAction={setMenuFor} onReact={react} onProfile={setProfileFor} onMedia={(url, video, mm) => setViewer({ url, video, id: mm?.id, mine: mm?.mine })} />
            </div>
          )
        })}
        {typing.length > 0 && (
          <div className="px-4 py-1.5 text-[12px] text-[#9fe9c0] italic">{typing.join(', ')} печата{typing.length > 1 ? 'ют' : 'ет'}…</div>
        )}
      </div>

      {toast && <div className="mx-auto mb-1 px-3 py-1.5 rounded-full text-[12px]" style={{ background: '#1d1d24', color: '#e4e4e8' }}>{toast}</div>}

      {(reply || editing) && (
        <div className="flex items-center gap-2 px-4 py-1.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: '#0c0c10' }}>
          <div className="flex-1 min-w-0 text-[12px]">
            <span className="text-green font-bold">{editing ? 'Редактирование' : `Ответ ${reply!.name}`}</span>
            <span className="text-[#8a8a93] truncate"> · {stripTokens((editing || reply)!.text) || '📎 вложение'}</span>
          </div>
          <button onClick={() => { setReply(null); setEditing(null); setComposer('') }} className="text-[#8a8a93] text-[16px] px-1">✕</button>
        </div>
      )}

      {emojiOpen && (
        <div className="grid grid-cols-8 gap-1 px-3 py-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: '#0c0c10' }}>
          {PICKER.map(e => <button key={e} onClick={() => insertTextAtCaret(e)} className="text-[22px] py-1 active:scale-125 transition-transform">{e}</button>)}
        </div>
      )}

      {attachOpen && (
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: '#0c0c10' }}>
          <div className="flex gap-2 px-4 pt-2">
            <button onClick={() => setOnceOn(v => !v)} className="flex-1 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: onceOn ? 'rgba(34,197,94,.18)' : '#17171d', color: onceOn ? '#4AE885' : '#9a9aa2', border: onceOn ? '1px solid rgba(74,232,133,.5)' : '1px solid transparent' }}>
              <span className="inline-flex items-center gap-1.5"><IcEye s={15} /> 1 раз {onceOn ? '✓' : ''}</span>
            </button>
            <button onClick={() => setTtlSec(s => { const i = TTL_STEPS.indexOf(s); return TTL_STEPS[(i + 1) % TTL_STEPS.length] })}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: ttlSec ? 'rgba(34,197,94,.18)' : '#17171d', color: ttlSec ? '#4AE885' : '#9a9aa2', border: ttlSec ? '1px solid rgba(74,232,133,.5)' : '1px solid transparent' }}>
              <span className="inline-flex items-center gap-1.5"><IcTimer s={15} /> Таймер: {ttlLabel(ttlSec)}</span>
            </button>
          </div>
          <div className="flex gap-2 px-4 py-2">
            <button onClick={() => photoInput.current?.click()} className="flex-1 py-2 rounded-xl text-[12px] font-bold" style={{ background: '#17171d', color: '#cfcfd4' }}><span className="inline-flex items-center gap-1.5"><IcPhoto s={15} /> Фото</span></button>
            <button onClick={() => videoInput.current?.click()} className="flex-1 py-2 rounded-xl text-[12px] font-bold" style={{ background: '#17171d', color: '#cfcfd4' }}><span className="inline-flex items-center gap-1.5"><IcVideo s={15} /> Видео</span></button>
          </div>
        </div>
      )}

      {stickerOpen && (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: '#0c0c10', height: '48vh' }}>
          {/* верхние вкладки: Эмодзи / Стикеры / GIF — как в Telegram */}
          <div className="flex items-center gap-5 px-4 pt-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            {([['emoji', 'Эмодзи'], ['stickers', 'Стикеры'], ['gif', 'GIF']] as const).map(([k, lab]) => {
              const active = k === 'emoji' ? stickerTab === 'emoji' : k === 'stickers' ? stickerTab !== 'emoji' : false
              return (
                <button key={k} onClick={() => {
                  if (k === 'emoji') setStickerTab('emoji')
                  else if (k === 'stickers') setStickerTab(stickerPacks[0]?.name || '__st__')
                  else { setStickerOpen(false); if (gifEnabled) openGif() }
                }} className="relative pb-2 text-[14px] font-bold" style={{ color: active ? '#fff' : '#7a7a85' }}>
                  {lab}
                  {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full" style={{ background: '#4AE885' }} />}
                </button>
              )
            })}
            <button onClick={() => setStickerOpen(false)} className="ml-auto text-[#8a8a93] text-[16px]">✕</button>
          </div>

          {/* строка добавления своего пака */}
          <div className="flex gap-2 px-2 py-1.5 shrink-0">
            <input value={addPackLink} onChange={e => setAddPackLink(e.target.value)} placeholder="🔍 Пак или эмодзи: t.me/addstickers/… · t.me/addemoji/…"
              className="flex-1 px-3 py-1.5 rounded-full text-[16px] text-white outline-none"
              style={{ background: '#17171d', border: '1px solid rgba(255,255,255,.08)', WebkitUserSelect: 'text', userSelect: 'text' }} />
            <button onClick={addPack} disabled={packBusy} className="px-3.5 py-1.5 rounded-full text-[13px] font-bold disabled:opacity-50" style={{ background: 'rgba(34,197,94,.18)', color: '#4AE885' }}>
              {packBusy ? '…' : '＋'}
            </button>
          </div>

          {/* контент */}
          <div ref={stScrollRef} className="flex-1 overflow-y-auto px-2 pb-2" style={{ overscrollBehavior: 'contain' }}>
            {stickerTab === 'emoji' ? (
              emojiPacks.length ? (
                emojiPacks.map(p => (
                  <div key={p.name} id={`pk_${p.name}`} className="mb-3">
                    <div className="flex items-center gap-2 px-1 py-1.5 sticky top-0 z-10" style={{ background: '#0c0c10' }}>
                      <span className="text-[12px] font-bold text-[#cfcfd4] truncate flex-1">{p.title}</span>
                      <button onClick={() => removePack(p.name)} className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md text-[#ff8a8a]" style={{ background: 'rgba(255,80,80,.1)' }}>Удалить</button>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {p.stickers.map((st, i) => (
                        <button key={i} onClick={() => insertEmojiNode(st.fid, st.kind)} className="aspect-square flex items-center justify-center active:scale-110 transition-transform overflow-hidden">
                          <InView rootRef={stScrollRef}>
                            {st.kind === 'video'
                              ? <video src={api.chatStickerUrl(st.fid, 'video')} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                              : st.kind === 'animated'
                                ? <LottieSticker url={api.chatStickerUrl(st.fid, 'animated')} size={48} />
                                : <img src={api.chatStickerUrl(st.fid, 'image')} alt={st.emoji} loading="lazy" className="w-full h-full object-contain" />}
                          </InView>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {STICKERS.map(s => (
                    <button key={s} onClick={() => insertTextAtCaret(s)} className="text-[28px] py-1 active:scale-125 transition-transform">{s}</button>
                  ))}
                </div>
              )
            ) : stickerPacks.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[#8a8a93] px-6">Пока нет паков. Вставь ссылку <b className="text-green">t.me/addstickers/…</b> или <b className="text-green">t.me/addemoji/…</b> сверху и жми ＋ — добавится твой стикерпак или анимированные эмодзи из Telegram.</div>
            ) : (
              stickerPacks.map(p => (
                <div key={p.name} id={`pk_${p.name}`} className="mb-3">
                  <div className="flex items-center gap-2 px-1 py-1.5 sticky top-0 z-10" style={{ background: '#0c0c10' }}>
                    <span className="text-[12px] font-bold text-[#cfcfd4] truncate flex-1">{p.title}</span>
                    <button onClick={() => removePack(p.name)} className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md text-[#ff8a8a]" style={{ background: 'rgba(255,80,80,.1)' }}>Удалить</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {p.stickers.map((st, i) => (
                      <button key={i} onClick={() => sendStickerFile(st.fid, st.kind)} className="aspect-square flex items-center justify-center active:scale-110 transition-transform overflow-hidden">
                        <InView rootRef={stScrollRef}>
                          {st.kind === 'video'
                            ? <video src={api.chatStickerUrl(st.fid, 'video')} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                            : st.kind === 'animated'
                              ? <LottieSticker url={api.chatStickerUrl(st.fid, 'animated')} size={76} />
                              : <img src={api.chatStickerUrl(st.fid, 'image')} alt={st.emoji} loading="lazy" className="w-full h-full object-contain" />}
                        </InView>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* нижний ряд иконок-паков, как в Telegram */}
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <button onClick={() => setStickerTab('emoji')} className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[18px]"
              style={{ background: stickerTab === 'emoji' ? 'rgba(74,232,133,.16)' : 'transparent' }}>😀</button>
            {packs.map(p => {
              const th = p.stickers[0]   // первый стикер пака как иконка — понятно, что это
              const on = p.emoji ? false : stickerTab === p.name
              return (
                <button key={p.name} onClick={() => { setStickerTab(p.emoji ? 'emoji' : p.name); setTimeout(() => document.getElementById(`pk_${p.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: on ? 'rgba(74,232,133,.16)' : 'transparent', border: '1px solid rgba(255,255,255,.05)' }}>
                  {th
                    ? (th.kind === 'video'
                      ? <video src={api.chatStickerUrl(th.fid, 'video')} autoPlay loop muted playsInline className="w-7 h-7 object-contain" />
                      : th.kind === 'animated'
                        ? <LottieSticker url={api.chatStickerUrl(th.fid, 'animated')} size={28} />
                        : <img src={api.chatStickerUrl(th.fid, 'image')} alt="" loading="lazy" className="w-7 h-7 object-contain" />)
                    : <span className="text-[11px] font-bold text-[#cfcfd4]">{p.title.replace('@', '').slice(0, 2).toUpperCase()}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {gifOpen && (
        <div className="px-3 py-2 shrink-0 max-h-60 overflow-y-auto" style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: '#0c0c10' }}>
          <div className="flex items-center gap-2 mb-2">
            <input value={gifQuery} onChange={e => setGifQuery(e.target.value)} placeholder="Поиск GIF…" autoFocus
              className="flex-1 px-3 py-2 rounded-xl text-[16px] text-white outline-none"
              style={{ background: '#17171d', border: '1px solid rgba(255,255,255,.1)', WebkitUserSelect: 'text', userSelect: 'text' }} />
            <button onClick={() => setGifOpen(false)} className="text-[#8a8a93] text-[14px] px-2">✕</button>
          </div>
          {gifLoading && gifs.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-[#8a8a93]">Загрузка…</div>
          ) : gifs.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-[#8a8a93]">Ничего не найдено</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {gifs.map(g => (
                <button key={g.id} onClick={() => sendGif(g.send)} className="rounded-lg overflow-hidden active:opacity-70" style={{ background: '#17171d' }}>
                  <img src={g.preview} alt="" className="w-full h-24 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <div className="text-[9px] text-[#5a5a63] text-center mt-2">Powered by GIPHY</div>
        </div>
      )}

      <div className="flex items-end gap-2 px-2 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: '#0c0c10', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 22px)' }}>
        {rec ? (
          /* индикатор записи голосового */
          <div className="flex-1 flex items-center gap-2.5 rounded-[22px] px-3.5" style={{ background: '#17171d', border: '1px solid rgba(255,80,80,.3)', height: 44 }}>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: '#ff5050', opacity: .55 }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#ff5050' }} />
            </span>
            <span className="text-[15px] text-white tabular-nums shrink-0">{fmtDur(recElapsed)}</span>
            <span className="text-[12px] ml-1 truncate" style={{ color: recCancel ? '#ff8a8a' : '#8a8a93' }}>{recCancel ? 'отпусти — отмена' : '‹ смахни влево для отмены'}</span>
            <button onClick={cancelRec} className="ml-auto text-[12px] font-bold text-[#ff8a8a] px-2 py-1 shrink-0">Отмена</button>
          </div>
        ) : (
          /* единое поле: 📎 слева, текст, справа 😊 — как в Telegram */
          <div className="flex-1 flex items-end rounded-[22px] min-w-0" style={{ background: '#17171d', border: '1px solid rgba(255,255,255,.08)' }}>
            <button onClick={() => { setAttachOpen(v => !v); setEmojiOpen(false) }} className="shrink-0 w-10 h-10 flex items-center justify-center" style={{ color: attachOpen ? '#4AE885' : '#8a8a93' }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            </button>
            <div className="flex-1 relative min-w-0">
              {!text && <div className="absolute left-0 top-2.5 text-[16px] text-[#8a8a93] pointer-events-none select-none">Сообщение…</div>}
              <div ref={taRef} contentEditable suppressContentEditableWarning
                onInput={onEditorInput}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                onPaste={e => { e.preventDefault(); insertTextAtCaret(e.clipboardData.getData('text/plain')) }}
                className="text-[16px] text-white outline-none max-h-28 overflow-y-auto leading-[1.4] whitespace-pre-wrap break-words"
                style={{ WebkitUserSelect: 'text', userSelect: 'text', wordBreak: 'break-word', paddingTop: 10, paddingBottom: 10, minHeight: 24 }} />
            </div>
            <button onClick={() => { setAttachOpen(false); setEmojiOpen(false); if (stickerOpen) setStickerOpen(false); else openSticker() }} className="shrink-0 w-10 h-10 flex items-center justify-center active:scale-90 transition-transform" style={{ color: stickerOpen ? '#2bd47d' : '#4AE885' }} aria-label="Эмодзи и стикеры">
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8" /><line x1="9" y1="9.5" x2="9.01" y2="9.5" /><line x1="15" y1="9.5" x2="15.01" y2="9.5" /></svg>
            </button>
          </div>
        )}
        {text.trim() && !rec ? (
          <button onClick={send} disabled={sending} className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 active:scale-90 transition-transform" style={{ background: 'linear-gradient(180deg,#39FF9A,#22C55E)', color: '#06281a' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z" /></svg>
          </button>
        ) : (
          <button onMouseDown={startRec} onMouseUp={stopRec} onMouseLeave={() => rec && stopRec()}
            onTouchStart={(e) => { e.preventDefault(); touchStartX.current = e.touches[0].clientX; startRec() }}
            onTouchMove={(e) => { const dx = e.touches[0].clientX - touchStartX.current; const c = dx < -70; recCancelRef.current = c; setRecCancel(c) }}
            onTouchEnd={(e) => { e.preventDefault(); stopRec() }}
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: rec ? '#ff5050' : 'linear-gradient(180deg,#39FF9A,#22C55E)', color: rec ? '#fff' : '#06281a' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" /><path d="M5 11a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5zm6 7h2v3h-2z" /></svg>
          </button>
        )}
      </div>

      <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPick('photo')} />
      <input ref={videoInput} type="file" accept="video/*" hidden onChange={onPick('video')} />

      <AnimatePresence>
        {menuFor && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center px-4 pb-6" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuFor(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 24, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: .97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="w-full max-w-[290px] flex flex-col gap-2">
              {/* реакции — плавающая пилюля */}
              <div className="flex justify-around items-center px-1 py-1 rounded-full" style={{ background: '#1a1b21', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}>
                {QUICK.map(e => <button key={e} onClick={() => react(menuFor.id, e)} className="text-[23px] w-9 h-9 flex items-center justify-center rounded-full active:scale-125 transition-transform">{e}</button>)}
              </div>
              {/* действия — компактная карточка */}
              <div className="rounded-[16px] overflow-hidden" style={{ background: '#15161b', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 16px 40px rgba(0,0,0,.55)' }}>
                <button onClick={() => startReply(menuFor)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-white active:opacity-70"><IcReply s={16} />Ответить</button>
                {!menuFor.mine && (<><div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} /><button onClick={() => { setProfileFor(menuFor.user_id); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-white active:opacity-70"><IcUser s={16} />Профиль автора</button></>)}
                {menuFor.mine && menuFor.type === 'text' && (<><div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} /><button onClick={() => startEdit(menuFor)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-white active:opacity-70"><IcEdit s={16} />Редактировать</button></>)}
                {isAdmin && (<><div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} /><button onClick={() => pin(menuFor.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-green active:opacity-70"><IcPin s={16} />Закрепить</button></>)}
                {(menuFor.mine || isAdmin) && (<><div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} /><button onClick={() => { del(menuFor.id); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold active:opacity-70" style={{ color: '#ff6b6b' }}><IcTrash s={16} />Удалить</button></>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileFor != null && <ProfileCard uid={profileFor} onClose={() => setProfileFor(null)} onMention={insertMention} />}
      </AnimatePresence>

      <AnimatePresence>
        {viewer && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.94)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewer(null)}>
            {/* верхняя панель: закрыть + удалить (для своих/админа) */}
            <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewer(null)} className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] text-white" style={{ background: 'rgba(255,255,255,.12)' }}>✕</button>
              {(viewer.mine || isAdmin) && viewer.id != null && (
                <button onClick={() => { del(viewer.id!); setViewer(null) }} className="ml-auto px-4 h-10 rounded-full flex items-center gap-2 text-[13px] font-bold text-white" style={{ background: 'rgba(255,80,80,.9)' }}>🗑 Удалить</button>
              )}
            </div>
            {viewer.video
              ? <video src={viewer.url} autoPlay loop controls playsInline className="max-w-full max-h-full" onClick={e => e.stopPropagation()}
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div style="color:#9a9aa2;font-size:14px">Уже просмотрено</div>' }} />
              : <img src={viewer.url} alt="" draggable={false} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()}
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div style="color:#9a9aa2;font-size:14px">Уже просмотрено</div>' }} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* редактор фото с фильтрами */}
      <AnimatePresence>
        {photoEdit && (
          <motion.div className="fixed inset-0 z-[95] flex flex-col" style={{ background: 'rgba(0,0,0,.96)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <img src={photoEdit.url} alt="" draggable={false}
                style={{ filter: FILTERS[filterIdx].css === 'none' ? undefined : FILTERS[filterIdx].css, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
            </div>
            <div className="px-3 py-2 flex gap-2 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
              {FILTERS.map((f, i) => (
                <button key={f.name} onClick={() => setFilterIdx(i)} className="shrink-0 px-3 py-2 rounded-xl text-[12px] font-bold"
                  style={{ background: filterIdx === i ? 'linear-gradient(180deg,rgba(34,197,94,.24),rgba(34,197,94,.08))' : '#17171d', color: filterIdx === i ? '#4AE885' : '#cfcfd4', border: filterIdx === i ? '1px solid rgba(74,232,133,.5)' : '1px solid transparent' }}>
                  {f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-3 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,10px) + 12px)' }}>
              <button onClick={() => { URL.revokeObjectURL(photoEdit.url); setPhotoEdit(null) }} className="px-5 py-3 rounded-xl font-bold text-[14px]" style={{ background: '#1d1d24', color: '#cfcfd4' }}>Отмена</button>
              <button onClick={sendEditedPhoto} className="flex-1 py-3 rounded-xl font-extrabold text-[14px]" style={{ background: 'linear-gradient(180deg,#39FF9A,#22C55E)', color: '#06281a' }}>Отправить</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
