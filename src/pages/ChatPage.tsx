import { useEffect, useRef, useState, useCallback, useMemo, memo, Fragment } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import lottie from 'lottie-web'
import { inflate as pakoInflate } from 'pako'
import { api, setChatTopic, getChatTopic } from '../api/client'
import type { ChatMsg, ChatUserCard, ChatMember, ChatTopic, ChatOnline } from '../api/client'
import { renderRich, firstUrl, LinkPreviewCard, FORMATS } from './chat/rich'
import MediaViewer, { type ViewItem } from './chat/MediaViewer'
import { PollMsg, PollComposer } from './chat/Poll'
import MediaGallery, { downloadFile } from './chat/MediaGallery'
import Icon from '../components/Icon'
import PremiumBadge from '../components/PremiumBadge'
import { EMOJI_CATS, EMOJI_CDN, EMOJI_SEQ, codeToChar, emojiUrl } from '../utils/emojiData'

// ── иконки — только фирменный набор «База» ──
type IcP = { s?: number }
function IcEye({ s = 16 }: IcP) { return <Icon name="eye" size={s} accent="current" /> }
function IcTimer({ s = 16 }: IcP) { return <Icon name="clock" size={s} /> }
function IcPhoto({ s = 16 }: IcP) { return <Icon name="photo" size={s} /> }
function IcReply({ s = 16 }: IcP) { return <Icon name="reply" size={s} /> }
function IcUser({ s = 16 }: IcP) { return <Icon name="user" size={s} /> }
function IcEdit({ s = 16 }: IcP) { return <Icon name="edit" size={s} /> }
function IcPin({ s = 16 }: IcP) { return <Icon name="pin" size={s} /> }
function IcTrash({ s = 16 }: IcP) { return <Icon name="trash" size={s} /> }
function IcHide({ s = 16 }: IcP) { return <Icon name="close" size={s} /> }
function IcCamera({ s = 16 }: IcP) { return <Icon name="photo" size={s} /> }
function IcBook({ s = 16 }: IcP) { return <Icon name="book" size={s} /> }
function IcFlame({ s = 16 }: IcP) { return <Icon name="streak" size={s} accent="current" /> }
function IcCert({ s = 16 }: IcP) { return <Icon name="cert" size={s} /> }

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
const MY_ID = Number(ME?.id || 0)

/** Цвета пузырей — как в тёмной теме Telegram. */
const BUB_IN = '#16211C'                                          // входящие (чужие)
const BUB_OUT = 'linear-gradient(180deg,#127A49,#0D5C37)'          // исходящие (свои) — изумруд
const BUB_SHADOW = 'inset 0 1px 0 rgba(255,255,255,.05)'
const BUB_SHADOW_OUT = 'inset 0 1px 0 rgba(255,255,255,.12)'
// обои ленты: мягкий фиолетовый и изумрудный свет + едва заметный узор фирменных ромбов
const WALL = [
  'radial-gradient(70% 40% at 100% 10%, rgba(118,87,255,.14), transparent 70%)',
  'radial-gradient(60% 40% at 0% 70%, rgba(23,229,132,.08), transparent 70%)',
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cpath d='M28 22l4 4-4 4-4-4z' fill='%23ffffff' fill-opacity='.035'/%3E%3C/svg%3E")`,
  '#08100D',
].join(',')
const VIOLET = '#B9A8FF'

const QUICK = ['❤️', '🔥', '👍', '😂', '🥳', '🤩']
const PICKER = ['😀', '😂', '😍', '😎', '🤔', '😮', '😢', '😡', '👍', '👎', '🔥', '❤️', '🎉', '👏', '🙏', '💯', '🚀', '⚡', '✅', '❌', '👀', '💀', '🤝', '🤯']
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
// приглушённая палитра имён и подложек аватаров: [цвет имени, фон аватара, цвет инициалов]
const PAL = ['#7EE0AE', '#AE9BFF', '#F5C25A', '#7FD3F5', '#FF9DB7', '#F0A868', '#9BE3D0', '#C9B6FF']
const PAL_BG = ['#1F4A37', '#2A2170', '#5A4630', '#123F52', '#4A1F2E', '#4F3318', '#174641', '#33285E']
function palIdx(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % PAL.length
}
function colorFor(name: string) { return PAL[palIdx(name)] }

async function uploadMedia(type: string, file: Blob, mime: string, dur: number, caption: string, ttl = 0, once = false, album = '') {
  const fd = new FormData()
  fd.append('file', file, (file as File).name || `${type}.bin`)
  if (caption) fd.append('caption', caption)
  const url = api.chatUploadUrl(type, dur, ttl, once) + (mime ? `&mime=${encodeURIComponent(mime)}` : '') + (album ? `&album=${album}` : '')
  const res = await fetch(url, { method: 'POST', headers: { 'X-Init-Data': tg?.initData || '' }, body: fd })
  return res.json().catch(() => ({ error: 'bad' }))
}

function Avatar({ name, src, size = 32, anim, onClick }: { name: string; src?: string; size?: number; anim?: boolean; onClick?: () => void }) {
  const [ok, setOk] = useState(true)
  useEffect(() => { setOk(true) }, [src])
  const initials = (name || '?').replace('@', '').slice(0, size < 28 ? 1 : 2).toUpperCase()
  const show = !!src && ok
  return (
    <div onClick={onClick} className="shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold"
      style={{ width: size, height: size, background: show ? '#000' : PAL_BG[palIdx(name)], color: PAL[palIdx(name)], fontSize: size * 0.36 }}>
      {show
        ? (anim
          ? <video src={src} autoPlay loop muted playsInline className="w-full h-full object-cover" onError={() => setOk(false)} />
          : <img src={src} alt="" draggable={false} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={() => setOk(false)} />)
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
  // нажатие на эмодзи в сообщении → показать его набор (скопировать эмодзи / добавить набор себе)
  const open = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('chat:emoji', { detail: h >= 0 ? { name: eref.slice(0, h) } : { fid } }))
  }
  return (
    <span className="inline-block cursor-pointer" onClick={open} style={{ width: size, height: size, verticalAlign: '-0.3em' }}>
      {kind === 'a' ? <LottieSticker url={url} size={size} />
        : kind === 'v' ? <video src={url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
          : <img src={url} alt="" loading="lazy" className="w-full h-full object-contain" />}
    </span>
  )
}

/** В превью (ответы/закреп) эмодзи-токены заменяем на 🙂, чтобы не светить код. */
function attachLabel(m: ChatMsg) {
  return ({ round: 'Видеосообщение', voice: 'Голосовое', video: 'Видео', photo: 'Фото', gif: 'GIF', sticker: 'Стикер' } as Record<string, string>)[m.type] || 'Вложение'
}

/** Видеокружок: тап — играть со звуком / пауза, долгое нажатие — меню. */
function RoundMsg({ m, src, bind }: { m: ChatMsg; src: string; bind: (open: () => void) => Record<string, any> }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [prog, setProg] = useState(0)
  const toggle = () => {
    const v = ref.current; if (!v) return
    if (v.paused) {
      // останавливаем другие кружки и голосовые
      document.querySelectorAll('video[data-round], audio').forEach(el => { if (el !== v) (el as HTMLMediaElement).pause() })
      if (v.ended || prog >= 0.99) v.currentTime = 0
      v.muted = false; v.play().then(() => setPlaying(true)).catch(() => {})
    } else { v.pause(); setPlaying(false) }
  }
  const size = playing ? 252 : 208
  const R = size / 2 - 3, C = 2 * Math.PI * R
  return (
    <div className="relative rounded-full transition-[width,height] duration-200" {...(() => { const b = bind(toggle); return { ...b, style: { ...(b.style || {}), width: size, height: size } } })()}>
      <video ref={ref} data-round src={src + '#t=0.1'} preload="metadata" playsInline disablePictureInPicture
        onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProg(0) }}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProg(v.currentTime / v.duration) }}
        className="w-full h-full rounded-full object-cover bg-black/40 pointer-events-none select-none" />
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3" />
        {playing && <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#17E584" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - prog)} />}
      </svg>
      {!playing && (
        <span className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="w-11 h-11 rounded-full grid place-items-center text-white" style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)' }}>
            <Icon name="play" size={20} accent="#fff" />
          </span>
        </span>
      )}
      {m.dur > 0 && (
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] font-medium text-white tabular-nums pointer-events-none" style={{ background: 'rgba(0,0,0,.5)' }}>
          {(() => { const t = playing ? Math.max(0, m.dur * (1 - prog)) : m.dur; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` })()}
        </span>
      )}
    </div>
  )
}

function stripTokens(text: string) {
  const t = (text || '').replace(/\{e:[avi]:[A-Za-z0-9_#-]+\}/g, '🙂')
  const noMat = t.replace(/#m\d{1,7}\b/g, '').trim()
  return noMat || (t !== noMat ? 'Материал' : t)
}

function renderText(text: string, big = false) {
  const out: any[] = []
  const re = new RegExp(EMOJI_TOKEN.source, 'g')
  let last = 0, mm: RegExpExecArray | null, key = 0
  const pushPlain = (s: string) => {
    // обычные эмодзи в тексте — картинками Apple
    let li = 0; let em: RegExpExecArray | null
    const rx = new RegExp(EMOJI_SEQ.source, 'gu')
    while ((em = rx.exec(s))) {
      if (em.index > li) out.push(<span key={key++}>{s.slice(li, em.index)}</span>)
      out.push(<Emo key={key++} e={em[0]} size={big ? 44 : 20} />)
      li = em.index + em[0].length
    }
    if (li < s.length) out.push(<span key={key++}>{s.slice(li)}</span>)
  }
  const pushText = (s: string) => {
    if (!s) return
    s.split(/(@[A-Za-z0-9_]{3,32})/g).forEach((p) => {
      if (!p) return
      if (p.startsWith('@')) out.push(<span key={key++} className="font-semibold" style={{ color: VIOLET }}>{p}</span>)
      else pushPlain(p)
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
      else if (el.hasAttribute('data-u')) out += el.getAttribute('data-u') || ''
      else if (el.hasAttribute('data-e')) { const d = el.getAttribute('data-e') || ''; out += `{e:${d.slice(0, 1)}:${d.slice(2)}}` }
      else { if (el.tagName === 'DIV' && out && !out.endsWith('\n')) out += '\n'; out += serializeEditor(el) }
    }
  })
  return out
}

/** Обычное эмодзи в поле ввода — картинкой Apple (в текст уходит сам символ). */
function buildUniEmoji(ch: string): Node {
  const url = emojiUrl(ch)
  if (!url) return document.createTextNode(ch)
  const span = document.createElement('span')
  span.setAttribute('contenteditable', 'false')
  span.setAttribute('data-u', ch)
  span.style.display = 'inline-block'; span.style.width = '20px'; span.style.height = '20px'
  span.style.verticalAlign = '-0.3em'; span.style.margin = '0 1px'
  const img = document.createElement('img'); img.src = url; img.alt = ch
  img.style.width = '100%'; img.style.height = '100%'; img.draggable = false
  span.appendChild(img)
  return span
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
// голосовые: общая скорость и «шина» событий для мини-плеера и автопроигрывания следующего
const SPEEDS = [1, 1.5, 2]
let voiceSpeed = (() => { try { const v = Number(localStorage.getItem('chat_voice_speed')); return SPEEDS.includes(v) ? v : 1 } catch { return 1 } })()
export const voiceBus = {
  emit: (type: string, detail: any) => window.dispatchEvent(new CustomEvent('cv:' + type, { detail })),
}

function VoiceMsg({ url, mine, id, name }: { url: string; mine?: boolean; id: number; name: string }) {
  const aRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [speed, setSpeed] = useState(voiceSpeed)
  const bars = useMemo(() => {
    let h = 0; for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0
    const a: number[] = []
    for (let i = 0; i < 32; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; a.push(0.22 + (h % 100) / 100 * 0.78) }
    return a
  }, [url])
  const play = () => {
    const a = aRef.current; if (!a) return
    document.querySelectorAll('audio, video[data-round]').forEach(el => { if (el !== a) (el as HTMLMediaElement).pause() })
    a.playbackRate = voiceSpeed; a.play().catch(() => {})
  }
  const toggle = () => { const a = aRef.current; if (!a) return; if (a.paused) play(); else a.pause() }
  const cycleSpeed = () => {
    voiceSpeed = SPEEDS[(SPEEDS.indexOf(voiceSpeed) + 1) % SPEEDS.length]
    try { localStorage.setItem('chat_voice_speed', String(voiceSpeed)) } catch { /* */ }
    window.dispatchEvent(new CustomEvent('cv:speed'))
  }
  useEffect(() => {
    const onCmd = (e: Event) => {
      const d = (e as CustomEvent).detail || {}; if (d.id !== id) return
      const a = aRef.current; if (!a) return
      if (d.cmd === 'toggle') toggle()
      else if (d.cmd === 'play') { a.currentTime = 0; play() }
      else if (d.cmd === 'stop') { a.pause(); a.currentTime = 0; setCur(0) }
      else if (d.cmd === 'speed') cycleSpeed()
    }
    const onSpeed = () => { setSpeed(voiceSpeed); if (aRef.current) aRef.current.playbackRate = voiceSpeed }
    window.addEventListener('cv:cmd', onCmd); window.addEventListener('cv:speed', onSpeed)
    return () => { window.removeEventListener('cv:cmd', onCmd); window.removeEventListener('cv:speed', onSpeed) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  const report = (pl: boolean, c = cur) => voiceBus.emit('state', { id, name, playing: pl, cur: c, dur })
  const onMeta = () => {
    const a = aRef.current; if (!a) return
    if (!isFinite(a.duration)) { a.currentTime = 1e101; a.ontimeupdate = () => { a.ontimeupdate = null; a.currentTime = 0; setDur(a.duration) } }
    else setDur(a.duration)
  }
  const frac = dur > 0 ? Math.min(1, cur / dur) : 0
  const accent = mine ? '#C8F7DD' : '#17E584'
  const dim = mine ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.18)'
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2" style={{ minWidth: 200, maxWidth: 270 }} onClick={(e) => e.stopPropagation()}>
      <button onClick={toggle} aria-label={playing ? 'Пауза' : 'Слушать'} className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ background: accent, color: '#03200F' }}>
        <Icon name={playing ? 'pause' : 'play'} size={15} accent="current" style={playing ? undefined : { marginLeft: 2 }} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[2px] h-7 cursor-pointer" onClick={(e) => { const a = aRef.current; if (!a || !dur) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * dur; setCur(a.currentTime) }}>
          {bars.map((b, i) => (
            <span key={i} style={{ width: 3, borderRadius: 2, height: `${Math.round(b * 100)}%`, background: (i / bars.length) <= frac ? accent : dim }} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11.5px] tabular-nums" style={{ color: mine ? 'rgba(220,255,236,.8)' : '#A6B8AE' }}>{fmtDur((playing || cur) ? cur : dur)}</span>
          {(playing || cur > 0) && (
            <button onClick={cycleSpeed} className="px-1.5 rounded-full text-[10.5px] font-bold tabular-nums" style={{ background: dim, color: mine ? '#fff' : '#CFDAD4' }}>{speed}×</button>
          )}
        </div>
      </div>
      <audio ref={aRef} src={url} preload="metadata" onLoadedMetadata={onMeta}
        onTimeUpdate={() => { const c = aRef.current?.currentTime || 0; setCur(c); report(!aRef.current?.paused, c) }}
        onPlay={() => { setPlaying(true); if (aRef.current) aRef.current.playbackRate = voiceSpeed; report(true) }}
        onPause={() => { setPlaying(false); report(false) }}
        onEnded={() => { setPlaying(false); setCur(0); report(false, 0); voiceBus.emit('ended', { id }) }} />
    </div>
  )
}

/** Время + «изменено» + галочки, как в Telegram (встроено в хвост последней строки). */
function MsgMeta({ m, light }: { m: ChatMsg; light?: boolean }) {
  return (
    <span className="select-none whitespace-nowrap inline-flex items-center gap-1 tabular-nums" style={{ fontSize: 11, color: light ? 'rgba(255,255,255,.95)' : m.mine ? '#A5EBC6' : '#7E978A' }}>
      {m.edited && <span>ред.</span>}
      {m.once && <Icon name="eye" size={11} accent="current" />}
      {!!m.ttl && <Icon name="clock" size={11} />}
      {timeOf(m.created_at)}
      {m.mine && ((m as any).pending
        ? <span className="opacity-70"><Icon name="clock" size={11} /></span>
        : <span className="inline-flex" style={{ color: light ? '#fff' : '#A5EBC6' }}><Icon name="check" size={12} strokeWidth={2} /><Icon name="check" size={12} strokeWidth={2} style={{ marginLeft: -7 }} /></span>)}
    </span>
  )
}

// Эмодзи картинкой — набор Apple, как в Telegram; одинаково на всех устройствах.
// Если картинки нет — обычный символ.
function Emo({ e, size = 20 }: { e: string; size?: number }) {
  const [ok, setOk] = useState(true)
  const url = emojiUrl(e)
  if (!ok || !url) return <span style={{ fontSize: size * 0.95, lineHeight: 1 }}>{e}</span>
  return <img src={url} alt={e} width={size} height={size} draggable={false}
    loading="lazy" decoding="async" onError={() => setOk(false)}
    style={{ display: 'inline-block', verticalAlign: '-0.2em', width: size, height: size }} />
}

function Reactions({ m, onToggle }: { m: ChatMsg; onToggle: (id: number, e: string) => void }) {
  if (!m.reactions?.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 mt-1 ${m.mine ? 'justify-end' : 'justify-start'}`}>
      {m.reactions.map(r => (
        <button key={r.emoji} onClick={(e) => { e.stopPropagation(); onToggle(m.id, r.emoji) }}
          className="flex items-center gap-1 h-[26px] px-2.5 rounded-full active:scale-95 transition-transform"
          style={{ background: r.mine ? 'rgba(23,229,132,.18)' : 'rgba(255,255,255,.08)' }}>
          <Emo e={r.emoji} size={15} /><span className="text-[12.5px] font-semibold tabular-nums" style={{ color: r.mine ? '#7DF0B6' : '#CFDAD4' }}>{r.count}</span>
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
      const res = await fetch(api.chatAvatarUploadUrl(), { method: 'POST', headers: { 'X-Init-Data': tg?.initData || '' }, body: fd })
      const j: any = await res.json().catch(() => ({}))
      if (!res.ok || j?.error) { setBusy(j?.message || `Не удалось загрузить (${res.status})`); setTimeout(() => setBusy(''), 3500); return }
      setVer(Date.now()); await reload(); setBusy('')
    } catch { setBusy('Ошибка сети — попробуй ещё раз'); setTimeout(() => setBusy(''), 3500) }
  }
  const setMode = async (m: string) => {
    setBusy('…')
    try { await api.chatAvatarMode(m); setVer(Date.now()); await reload() } catch { /* */ } finally { setBusy('') }
  }

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full max-w-[460px] rounded-t-[28px] p-5 pb-8 bg-s1 border-t border-white/[.08]"
        style={{ background: 'radial-gradient(80% 60% at 50% 0%, rgba(118,87,255,.14), transparent 70%), #111C17', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 28px)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-white/15" />
        {!c ? (
          <div className="py-8 text-center text-[13px] text-gray">Загрузка…</div>
        ) : (
          <>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="shrink-0 rounded-full p-[3px]" style={{ background: c.is_premium ? 'conic-gradient(from 200deg,#FFF0BE,#F5C25A,#C8912B,#FFE08A,#FFF0BE)' : 'rgba(255,255,255,.12)' }}>
                <div className="rounded-full p-[2px] bg-s1"><Avatar name={c.name} src={api.chatAvatarUrl(c.user_id, ver || undefined)} anim={c.avatar_anim} size={60} /></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[18px] text-fg truncate">{c.name}</div>
                {c.username && <div className="text-[13px] text-gray">@{c.username}</div>}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {c.is_premium && <PremiumBadge small />}
                  <span className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11.5px] font-semibold" style={{ background: 'rgba(118,87,255,.18)', color: VIOLET }}>
                    {c.rank}<span className="text-gray font-medium tabular-nums">· {c.xp} XP</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[['book', c.materials_done, 'пройдено'], ['flame', c.streak, 'дней подряд'], ['cert', c.certificates, 'сертификатов']].map(([ic, val, lab], i) => (
                <div key={i} className="rounded-[16px] py-3 text-center bg-white/[.05] border border-white/[.06]">
                  <div className="flex justify-center" style={{ color: ic === 'flame' ? '#FFB25B' : ic === 'cert' ? '#F5C25A' : '#CFDAD4' }}>{ic === 'book' ? <IcBook s={18} /> : ic === 'flame' ? <IcFlame s={18} /> : <IcCert s={18} />}</div>
                  <div className="font-display font-semibold text-[18px] text-fg leading-none mt-1.5 tabular-nums">{val as number}</div>
                  <div className="text-[11px] text-gray mt-1">{lab as string}</div>
                </div>
              ))}
            </div>

            {isMe && (
              <div className="mb-4">
                <div className="text-[13px] font-semibold text-fg mb-2">Аватар в чате {busy && <span className="text-green font-normal">· {busy}</span>}</div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => avInput.current?.click()} className="btn-secondary w-full !justify-start px-4 text-[13.5px]"><IcCamera s={17} /> Поставить своё фото или анимацию</button>
                  <div className="flex gap-2">
                    <button onClick={() => setMode('tg')} className="btn-secondary flex-1 text-[13px]"><IcUser s={15} /> Из Telegram</button>
                    <button onClick={() => setMode('hidden')} className="btn-secondary flex-1 text-[13px] !text-[#FF8A8A]"><IcHide s={15} /> Скрыть</button>
                  </div>
                </div>
                <div className="text-[11.5px] text-gray2 mt-2">Анимация — загрузи короткое видео/GIF (до 20 МБ). Все увидят его живым в чате.</div>
                <input ref={avInput} type="file" accept="image/*,video/*,image/gif" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadAvatar(f) }} />
              </div>
            )}

            <div className="flex gap-2">
              {!isMe && c.username && (
                <button onClick={() => { onMention(c.username); onClose() }}
                  className="btn-violet flex-1 text-[13.5px]">
                  Упомянуть @{c.username}
                </button>
              )}
              <button onClick={onClose} className={`btn-secondary ${isMe || !c.username ? 'flex-1' : 'px-5'} text-[13.5px]`}>Закрыть</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

const WK_COLORS = ['', '#F5C25A', '#C9D3DC', '#D08A57']
/** Значки у ника: место в рейтинге недели (1–3) и ранг по опыту. */
function NameBadges({ m }: { m: { premium?: boolean; wk?: number; lvl?: number; rank?: string } }) {
  return (
    <>
      {m.premium && <Icon name="crown" size={12} accent="#FFD873" className="inline-block ml-1 align-[-1px] text-gold" />}
      {!!m.wk && <span title={`${m.wk} место недели`} className="inline-flex align-[-2px] ml-1" style={{ color: WK_COLORS[m.wk] }}><Icon name="trophy" size={12} accent="current" /></span>}
      {!!m.lvl && m.rank && <span className="ml-1.5 text-[10.5px] font-medium align-[1px] px-1.5 py-[1px] rounded-full bg-white/[.07] text-gray">{m.rank}</span>}
    </>
  )
}

const MAT_TOKEN = /#m\d{1,7}\b/g

function MatCard({ mat, mine, onOpen }: { mat: NonNullable<ChatMsg['mat']>; mine: boolean; onOpen: (id: number) => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onOpen(mat.id) }}
      className="mx-2 mt-2 flex items-center gap-2.5 px-2.5 py-2 rounded-[12px] text-left active:opacity-80 max-w-[calc(100%-16px)]"
      style={{ background: mine ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)' }}>
      <span className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0" style={{ background: 'rgba(23,229,132,.14)', color: '#17E584' }}>
        <Icon name={mat.kind === 'video' ? 'video' : 'book'} size={18} accent="current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-fg leading-tight line-clamp-2">{mat.title}</span>
        <span className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-gray truncate">
          {mat.premium && <span className="text-gold font-semibold">Premium</span>}
          <span className="truncate">{mat.section || 'Материал'}</span>
        </span>
      </span>
      <Icon name="chevR" size={16} className="text-gray shrink-0" />
    </button>
  )
}

/** Стабильные обработчики ленты (одни на всю ленту — строки не перерисовываются зря). */
export interface FeedCtx {
  view: (msgs: ChatMsg[], id: number) => void
  jump: (id: number) => void
  pollUpdate: (m: ChatMsg) => void
  toggleSelect: (id: number) => void
}

function HeartBurst() {
  return (
    <motion.span className="absolute inset-0 grid place-items-center pointer-events-none z-10"
      initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 1, 1.1] }} transition={{ duration: 0.75 }}>
      <Emo e="❤️" size={52} />
    </motion.span>
  )
}

const fileExt = (n?: string) => { const e = (n || '').split('.').pop() || ''; return e && e !== n ? e.slice(0, 4).toUpperCase() : 'FILE' }

function FileCard({ m, mine, bind }: { m: ChatMsg; mine: boolean; bind: (open: () => void) => Record<string, any> }) {
  return (
    <div className="flex items-center gap-3 px-3 pt-2.5 pb-1 min-w-[210px] max-w-[290px]" {...bind(() => downloadFile(m))}>
      <span className="w-11 h-11 rounded-[12px] grid place-items-center shrink-0 font-bold text-[11px] tracking-wide"
        style={{ background: mine ? 'rgba(0,0,0,.25)' : 'rgba(23,229,132,.14)', color: mine ? '#fff' : '#17E584' }}>{fileExt(m.fname)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-fg truncate">{m.fname || 'Файл'}</span>
        <span className="flex items-center gap-1 text-[12px]" style={{ color: mine ? 'rgba(255,255,255,.7)' : '#A6B8AE' }}>
          <Icon name="download" size={12} accent="current" /> Скачать · проверен антивирусом
        </span>
      </span>
    </div>
  )
}

function AlbumGrid({ items, bind, ctx }: { items: ChatMsg[]; bind: (open: () => void) => Record<string, any>; ctx: FeedCtx }) {
  const n = items.length
  const cols = n === 2 || n === 4 ? 2 : 3
  return (
    <div className="grid gap-[2px] w-[min(72vw,300px)]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((it, i) => {
        const big = n === 3 && i === 0 || n === 5 && i < 2 || n === 7 && i === 0
        return (
          <div key={it.id} className="relative overflow-hidden bg-black/30" style={{ gridColumn: big ? (n === 5 ? 'span 1' : `span ${cols}`) : undefined, aspectRatio: big && n !== 5 ? '16/10' : '1' }}
            {...bind(() => ctx.view(items, it.id))}>
            {it.type === 'photo'
              ? <img src={api.chatMediaUrl(it.id)} alt="" loading="lazy" className="w-full h-full object-cover pointer-events-none" />
              : <>
                  <video src={api.chatMediaUrl(it.id) + '#t=0.1'} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
                  <span className="absolute inset-0 grid place-items-center pointer-events-none"><span className="w-8 h-8 rounded-full grid place-items-center text-white" style={{ background: 'rgba(0,0,0,.5)' }}><Icon name="play" size={14} accent="#fff" /></span></span>
                </>}
          </div>
        )
      })}
    </div>
  )
}

function Bubble({ m, prev, next, quoted, onAction, onReact, onProfile, onMedia, onReply, onOpenMat, ctx, album, selectMode, selected }: {
  m: ChatMsg; prev: ChatMsg | null; next: ChatMsg | null; quoted: ChatMsg | null
  onAction: (m: ChatMsg) => void; onReact: (id: number, e: string) => void
  onProfile: (uid: number) => void; onMedia: (url: string, video: boolean, msg?: ChatMsg) => void
  onReply: (m: ChatMsg) => void; onOpenMat: (id: number) => void
  ctx: FeedCtx; album?: ChatMsg[]; selectMode?: boolean; selected?: boolean
}) {
  // тап по сообщению: в режиме выбора — отметить; двойной тап — ❤️; одиночный — меню (с задержкой, как в Telegram)
  const tapT = useRef<number | null>(null)
  const [burst, setBurst] = useState(0)
  const bubbleTap = () => {
    if (selectMode) { ctx.toggleSelect(m.id); return }
    if (tapT.current) {
      clearTimeout(tapT.current); tapT.current = null
      if (!(m.reactions || []).some(r => r.emoji === '❤️' && r.mine)) onReact(m.id, '❤️')
      setBurst(Date.now()); try { tg?.HapticFeedback?.impactOccurred?.('light') } catch { /* */ }
      return
    }
    tapT.current = window.setTimeout(() => { tapT.current = null; onAction(m) }, 260)
  }
  // свайп влево по сообщению — ответить (как в Telegram)
  const rowRef = useRef<HTMLDivElement>(null)
  const sw = useRef<{ x: number; y: number; dx: number; on: boolean | null } | null>(null)
  const swStart = (e: React.TouchEvent) => { const t = e.touches[0]; sw.current = { x: t.clientX, y: t.clientY, dx: 0, on: null } }
  const swMove = (e: React.TouchEvent) => {
    const s0 = sw.current; if (!s0) return
    const t = e.touches[0]; const dx = t.clientX - s0.x, dy = t.clientY - s0.y
    if (s0.on === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s0.on = Math.abs(dx) > Math.abs(dy) * 1.3 && dx < 0
    if (!s0.on) return
    s0.dx = Math.max(-72, Math.min(0, dx))
    if (rowRef.current) { rowRef.current.style.transition = 'none'; rowRef.current.style.transform = `translateX(${s0.dx}px)` }
  }
  const swEnd = () => {
    const s0 = sw.current; sw.current = null
    if (rowRef.current) { rowRef.current.style.transition = 'transform .2s ease'; rowRef.current.style.transform = '' }
    if (s0?.on && s0.dx <= -52 && !selectMode) { try { tg?.HapticFeedback?.impactOccurred?.('light') } catch { /* */ } onReply(m) }
  }
  const mine = m.mine
  const near = (a: ChatMsg, b: ChatMsg) => Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 5 * 60000
  const grouped = !!prev && prev.user_id === m.user_id && !prev.deleted && near(prev, m)   // есть сообщение выше от того же
  const groupedNext = !!next && next.user_id === m.user_id && !next.deleted && near(next, m) // есть сообщение ниже от того же
  const tail = !groupedNext // последний в своей серии — рисуем «хвост»
  const mentionsMe = !!MY_UN && !m.mine && (m.text || '').toLowerCase().includes('@' + MY_UN)
  // quoted (цитируемое сообщение) приходит из родителя — пузырь не зависит от всей карты msgs,
  // поэтому при новом сообщении перерисовывается только он сам, а не вся лента
  const src = m.has_media ? api.chatMediaUrl(m.id) : ''
  const onlyEmoji = !!m.text && (() => {
    const t = m.text.replace(/\{e:[avi]:[A-Za-z0-9_#-]+\}/g, '\u0001')
    const n = (t.match(/\u0001/g) || []).length + (t.match(new RegExp(EMOJI_SEQ.source, 'gu')) || []).length
    return n > 0 && n <= 3 && t.replace(/\u0001/g, '').replace(new RegExp(EMOJI_SEQ.source, 'gu'), '').trim() === ''
  })()
  // долгое нажатие на медиа → меню (ответить/удалить), обычный тап → просмотр
  const lpTimer = useRef<number | null>(null)
  const lpFired = useRef(false)
  const lastTouch = useRef(0)
  const lpStart = () => { lpFired.current = false; lpTimer.current = window.setTimeout(() => { lpFired.current = true; onAction(m) }, 450) }
  const lpEnd = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null } }
  // медиа: короткий тап — просмотр, долгое нажатие — меню сообщения
  const tapMedia = (open: () => void) => ({
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (lpFired.current) { lpFired.current = false; return } if (selectMode) { ctx.toggleSelect(m.id); return } open() },
    onTouchStart: () => { lastTouch.current = Date.now(); lpStart() }, onTouchEnd: lpEnd, onTouchMove: lpEnd,
    // на телефоне после касания браузер шлёт ещё и мышиные события — их пропускаем
    onMouseDown: () => { if (Date.now() - lastTouch.current > 900) lpStart() },
    onMouseUp: () => { if (Date.now() - lastTouch.current > 900) lpEnd() }, onMouseLeave: lpEnd,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', cursor: 'pointer' } as React.CSSProperties,
  })

  if (m.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} px-3 my-0.5`}>
        <div className="px-3 py-1.5 rounded-[14px] text-[12.5px] italic bg-white/[.05] text-gray2">сообщение удалено</div>
      </div>
    )
  }

  // радиусы углов — хвост у края снизу делаем острым, как в Telegram
  const radius = mine
    ? { borderRadius: 18, borderBottomRightRadius: tail ? 6 : 18 }
    : { borderRadius: 18, borderBottomLeftRadius: tail ? 6 : 18 }

  if (m.type === 'sticker') {
    return (
      <div className={`flex gap-2 px-2 ${grouped ? 'mt-0.5' : 'mt-2'} ${mine ? 'flex-row-reverse' : ''}`}>
        {mine ? null : (tail ? <Avatar name={m.name} src={api.chatAvatarUrl(m.user_id)} anim={m.anim} onClick={() => onProfile(m.user_id)} /> : <div className="w-[32px] shrink-0" />)}
        <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
          {!grouped && !mine && <div className="text-[13px] font-semibold mb-0.5 ml-1" style={{ color: colorFor(m.name) }} onClick={() => onProfile(m.user_id)}>{m.name}<NameBadges m={m} /></div>}
          <div onClick={() => onAction(m)} className="relative px-1 active:scale-105 transition-transform cursor-pointer">
            {m.has_media
              ? ((m.mime || '').includes('tgs')
                ? <LottieSticker url={api.chatMediaUrl(m.id)} size={128} />
                : (m.mime || '').startsWith('video')
                  ? <video src={api.chatMediaUrl(m.id)} autoPlay loop muted playsInline className="w-[128px] h-[128px] object-contain" />
                  : <img src={api.chatMediaUrl(m.id)} alt="" draggable={false} className="w-[128px] h-[128px] object-contain" />)
              : <Emo e={m.text} size={96} />}
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full flex items-center" style={{ background: 'rgba(0,0,0,.45)' }}><MsgMeta m={m} light /></span>
          </div>
          <Reactions m={m} onToggle={onReact} />
        </div>
      </div>
    )
  }

  if (m.type === 'round' && src) {
    return (
      <div className={`flex gap-2 px-2.5 ${grouped ? 'mt-1' : 'mt-2.5'} ${mine ? 'flex-row-reverse' : ''}`}>
        {mine ? null : (tail ? <Avatar name={m.name} src={api.chatAvatarUrl(m.user_id)} anim={m.anim} onClick={() => onProfile(m.user_id)} /> : <div className="w-[32px] shrink-0" />)}
        <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
          {!grouped && !mine && <div className="text-[13px] font-semibold mb-1 ml-1" style={{ color: colorFor(m.name) }} onClick={() => onProfile(m.user_id)}>{m.name}<NameBadges m={m} /></div>}
          {quoted && (
            <div className="mb-1 px-2 py-1 rounded-[8px] text-[12px] max-w-[220px] truncate" style={{ background: 'rgba(23,229,132,.08)', borderLeft: '3px solid #17E584', color: '#A6B8AE' }}>
              <span className="font-semibold" style={{ color: '#17E584' }}>{quoted.name}</span> · {stripTokens(quoted.text) || attachLabel(quoted)}
            </div>
          )}
          <RoundMsg m={m} src={src} bind={tapMedia} />
          <span className="mt-1 px-1.5 py-0.5 rounded-full flex items-center" style={{ background: 'rgba(0,0,0,.35)' }}><MsgMeta m={m} light /></span>
          <Reactions m={m} onToggle={onReact} />
        </div>
      </div>
    )
  }

  const onlyMedia = m.has_media && !m.text && !(m.once && !mine)

  return (
    <div ref={rowRef} onTouchStart={swStart} onTouchMove={swMove} onTouchEnd={swEnd} onTouchCancel={swEnd}
      onClick={selectMode ? () => ctx.toggleSelect(m.id) : undefined}
      className={`relative flex gap-2 px-2.5 ${grouped ? 'mt-[3px]' : 'mt-2.5'} ${mine ? 'flex-row-reverse' : ''} ${selectMode ? 'pl-10' : ''}`}
      style={{ overflow: 'hidden', opacity: (m as any).pending ? 0.72 : 1, transition: 'opacity .18s ease, padding .18s ease', background: selected ? 'rgba(23,229,132,.08)' : undefined }}>
      {selectMode && (
        <span className="absolute left-2.5 bottom-1.5 w-[22px] h-[22px] rounded-full border-2 grid place-items-center"
          style={{ borderColor: selected ? '#17E584' : 'rgba(255,255,255,.35)', background: selected ? '#17E584' : 'transparent', color: '#021A0C' }}>
          {selected && <Icon name="check" size={12} strokeWidth={2.8} />}
        </span>
      )}
      {mine ? null : (tail ? <Avatar name={m.name} src={api.chatAvatarUrl(m.user_id)} anim={m.anim} onClick={() => onProfile(m.user_id)} /> : <div className="w-[32px] shrink-0" />)}
      <div className={`max-w-[82%] min-w-0 ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div onClick={(e) => { e.stopPropagation(); bubbleTap() }} className="relative overflow-hidden active:opacity-90 max-w-full"
          style={{
            ...radius,
            background: mine ? BUB_OUT : BUB_IN,
            boxShadow: mentionsMe ? `inset 0 0 0 1.5px rgba(185,168,255,.7), ${BUB_SHADOW}` : (mine ? BUB_SHADOW_OUT : BUB_SHADOW),
          }}>
          {!grouped && !mine && (
            <div className="px-3 pt-[7px] text-[13px] font-semibold leading-none" style={{ color: colorFor(m.name) }} onClick={(e) => { e.stopPropagation(); onProfile(m.user_id) }}>
              {m.name}<NameBadges m={m} />
            </div>
          )}
          {m.fwd_name && (
            <button onClick={(e) => { e.stopPropagation(); if (m.fwd_id) ctx.jump(m.fwd_id) }} className="block px-3 pt-[6px] text-left text-[12.5px] leading-tight" style={{ color: mine ? '#C8F7DD' : VIOLET }}>
              Переслано от <b className="font-semibold">{m.fwd_name}</b>
            </button>
          )}
          {burst > 0 && <HeartBurst key={burst} />}
          {quoted && (
            <div onClick={(e) => { e.stopPropagation(); ctx.jump(quoted.id) }} className="mx-2 mt-2 px-2 py-1.5 rounded-[8px] text-[12.5px] cursor-pointer" style={{ background: mine ? 'rgba(0,0,0,.2)' : 'rgba(23,229,132,.08)', borderLeft: '3px solid #17E584' }}>
              <span className="font-semibold text-[12px]" style={{ color: mine ? '#C8F7DD' : '#17E584' }}>{quoted.name}</span>
              {m.quote
                ? <div className="flex gap-1" style={{ color: mine ? 'rgba(255,255,255,.85)' : '#CFDAD4' }}><span className="opacity-60">“</span><span className="line-clamp-3">{m.quote}</span></div>
                : <div className="truncate" style={{ color: mine ? 'rgba(255,255,255,.78)' : '#A6B8AE' }}>{quoted.deleted ? 'удалено' : (stripTokens(quoted.text) || attachLabel(quoted))}</div>}
            </div>
          )}

          {m.has_media && m.once && !mine ? (
            <button onClick={(e) => { e.stopPropagation(); onMedia(src, m.type === 'video' || m.type === 'gif', m) }}
              className="flex items-center gap-3 px-3.5 py-3 text-left">
              <span className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-fg"><Icon name="eye" size={20} /></span>
              <div>
                <div className="text-[13.5px] font-semibold text-fg">Посмотреть 1 раз</div>
                <div className="text-[12px] text-gray">Нажми, чтобы открыть</div>
              </div>
            </button>
          ) : (
            <div className="relative">
              {m.type === 'photo' && src && (
                album && album.length > 1
                  ? <AlbumGrid items={album} bind={tapMedia} ctx={ctx} />
                  : <img src={src} draggable={false} alt="" loading="lazy" decoding="async" {...tapMedia(() => ctx.view([m], m.id))}
                      className="block max-h-[230px] max-w-[66vw] w-auto object-cover select-none" />
              )}
              {m.type === 'gif' && (m.media_url || src) && (() => {
                const u = m.media_url || src
                const vid = /\.(mp4|webm)(\?|$)/i.test(u)
                return (
                  <div {...tapMedia(() => onMedia(u, vid, m))}>
                    {vid
                      ? <video src={u} autoPlay loop muted playsInline className="block max-h-[210px] max-w-[66vw] w-auto object-cover select-none pointer-events-none" />
                      : <img src={u} alt="" draggable={false} className="block max-h-[210px] max-w-[66vw] w-auto object-cover select-none pointer-events-none" />}
                  </div>
                )
              })()}
              {m.type === 'video' && src && (
                // превью: тап — просмотр на весь экран, долгое нажатие — меню
                album && album.length > 1 ? <AlbumGrid items={album} bind={tapMedia} ctx={ctx} /> :
                <div className="relative" {...tapMedia(() => ctx.view([m], m.id))}>
                  <video src={src + '#t=0.1'} preload="metadata" muted playsInline disablePictureInPicture
                    className="block max-h-[260px] min-h-[120px] min-w-[160px] max-w-[66vw] w-auto object-cover select-none pointer-events-none bg-black/40" />
                  <span className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="w-12 h-12 rounded-full grid place-items-center text-white" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)' }}>
                      <Icon name="play" size={22} accent="#fff" />
                    </span>
                  </span>
                  {m.dur > 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium text-white tabular-nums pointer-events-none" style={{ background: 'rgba(0,0,0,.5)' }}>
                      {Math.floor(m.dur / 60)}:{String(Math.floor(m.dur % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              )}
              {m.type === 'voice' && src && <VoiceMsg url={src} mine={mine} id={m.id} name={m.name} />}
              {m.type === 'file' && src && <FileCard m={m} mine={mine} bind={tapMedia} />}
              {m.type === 'poll' && m.poll && <PollMsg m={m} mine={mine} onUpdate={ctx.pollUpdate} />}
              {/* на медиа без подписи — время поверх картинки в тёмной плашке */}
              {onlyMedia && (m.type === 'photo' || m.type === 'gif' || m.type === 'video') && (
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full flex items-center" style={{ background: 'rgba(0,0,0,.5)' }}><MsgMeta m={m} light /></span>
              )}
            </div>
          )}

          {m.mat && <MatCard mat={m.mat} mine={mine} onOpen={onOpenMat} />}
          {m.mat && !(m.text || '').replace(MAT_TOKEN, '').trim() && (
            <div className="px-3 pt-1 pb-1.5 flex justify-end"><MsgMeta m={m} /></div>
          )}
          {m.text && m.type !== 'poll' && !(m.mat && !m.text.replace(MAT_TOKEN, '').trim()) && (
            <div className="px-3 pt-[6px] pb-[6px] text-[15px] leading-[1.38] text-fg break-words" style={{ wordBreak: 'break-word' }}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{onlyEmoji ? renderText(m.text, true)
                : renderRich(m.mat ? m.text.replace(MAT_TOKEN, '').trim() : m.text, (t, k) => <Fragment key={k}>{renderText(t, false)}</Fragment>)}</span>
              {/* метаданные встроены в конец последней строки — текст обтекает, как в Telegram */}
              <span className="inline-block align-bottom ml-2" style={{ transform: 'translateY(2px)' }}><MsgMeta m={m} /></span>
            </div>
          )}

          {m.type === 'text' && !m.mat && firstUrl(m.text) && <LinkPreviewCard url={firstUrl(m.text)} mine={mine} />}
          {m.type === 'poll' && <div className="px-3 pb-1.5 flex justify-end"><MsgMeta m={m} /></div>}
          {/* если текста нет и это не только-медиа (напр. голос) — метаданные отдельной строкой */}
          {!m.text && !onlyMedia && m.type !== 'photo' && m.type !== 'gif' && m.type !== 'video' && (
            <div className="px-3 pb-1.5 flex justify-end"><MsgMeta m={m} /></div>
          )}
        </div>
        <Reactions m={m} onToggle={onReact} />
      </div>
    </div>
  )
}

// мемоизированная строка сообщения — не перерисовывается, пока его пропсы те же
const MsgRow = memo(Bubble)

// компактная «подпись» ленты: меняется только при реальных изменениях
// (новое/удалённое сообщение, правка текста, реакции) — чтобы не дёргать рендер на пустых опросах
function chatSig(arr: ChatMsg[]): string {
  let s = ''
  for (const m of arr) {
    s += m.id + '.' + (m.edited ? 1 : 0) + (m.deleted ? 1 : 0) + '.' + (m.text ? m.text.length : 0) + '.'
    const rs = m.reactions || []
    for (const r of rs) s += r.emoji + r.count + (r.mine ? 'x' : '')
    s += '|'
  }
  return s
}
// id оптимистичных (ещё не подтверждённых сервером) сообщений — выше любого реального,
// чтобы они стояли внизу ленты и не попадали в lastId (иначе сломается инкрементальный опрос)
const TEMP_BASE = 1e15
const maxId = (arr: ChatMsg[]) => arr.reduce((mx, m) => (m.id < TEMP_BASE && m.id > mx ? m.id : mx), 0)

export default function ChatPage({ onBack, initialMsg, onOpenMaterial }: { onBack?: () => void; initialMsg?: number; onOpenMaterial?: (id: number) => void } = {}) {
  const openMat = (id: number) => onOpenMaterial?.(id)
  const [onlineList, setOnlineList] = useState<ChatOnline[] | null>(null)
  const openOnline = () => { setOnlineList([]); api.chatOnline().then(r => setOnlineList(r.online || [])).catch(() => setOnlineList(null)) }
  const fileInput = useRef<HTMLInputElement>(null)
  const [viewerG, setViewerG] = useState<{ items: ViewItem[]; start: number } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [quoteFor, setQuoteFor] = useState<ChatMsg | null>(null)
  const [replyQuote, setReplyQuote] = useState('')
  const [fwdFor, setFwdFor] = useState<ChatMsg | null>(null)
  const [pollOpen, setPollOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [fmtOn, setFmtOn] = useState(false)
  const [player, setPlayer] = useState<{ id: number; name: string; playing: boolean; cur: number; dur: number } | null>(null)
  const [mentionSeen, setMentionSeen] = useState<Set<number>>(new Set())
  const lrOpen = useRef(0)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [ready, setReady] = useState(false)   // показываем ленту только когда она уже внизу
  const [gated, setGated] = useState(false)   // не подписан на канал — доступ к чату закрыт
  const [channel, setChannel] = useState('')  // хэндл канала для кнопки «Подписаться»
  const [, setMtokV] = useState(0)            // триггер ре-рендера при получении медиа-токена
  const [retDays, setRetDays] = useState<number | null>(null)  // срок хранения (виден админу)
  const [retOpen, setRetOpen] = useState(false)                // лист настройки хранения
  // темы чата, мут, переход к сообщению из уведомления
  const [topic, setTopic] = useState(getChatTopic())
  const [topics, setTopics] = useState<ChatTopic[]>([])
  const [mutedMsg, setMutedMsg] = useState<string | null>(null)
  const [muteFor, setMuteFor] = useState<{ id: number; name: string } | null>(null)
  const [mutePurge, setMutePurge] = useState(false)
  const pendingJump = useRef<number | null>(initialMsg ?? null)
  useEffect(() => {
    const load = () => api.chatTopics().then(r => setTopics(r.topics || [])).catch(() => {})
    load()
    const t = window.setInterval(() => { if (!document.hidden) load() }, 15000)
    return () => window.clearInterval(t)
  }, [])
  const [hiId, setHiId] = useState<number | null>(null)        // подсветка сообщения при переходе
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
  const micStream = useRef<MediaStream | null>(null)
  const wantRec = useRef(false)
  // как в Telegram: короткое нажатие переключает голосовое ↔ кружок, удержание — запись,
  // влево — отмена, вверх — запись без рук
  const [recMode, setRecMode] = useState<'voice' | 'round'>(() => { try { return localStorage.getItem('chat_rec_mode') === 'round' ? 'round' : 'voice' } catch { return 'voice' } })
  const [recKind, setRecKind] = useState<'voice' | 'round'>('voice')
  const [recLocked, setRecLocked] = useState(false)
  const recLockedRef = useRef(false)
  const [lockHint, setLockHint] = useState(0)   // 0..1 — насколько потянули вверх
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const camStream = useRef<MediaStream | null>(null)
  const [camReady, setCamReady] = useState(false)
  const camPreview = useRef<HTMLVideoElement | null>(null)
  const drawRaf = useRef(0)
  const lastMouseTouch = useRef(0)
  const press = useRef<{ x: number; y: number; t: number; timer: number; holding: boolean } | null>(null)
  const [ttlSec, setTtlSec] = useState(0)
  const [onceOn, setOnceOn] = useState(false)
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
  const vSwipe = useRef<{ y: number; dy: number } | null>(null)
  const [viewer, setViewer] = useState<{ url: string; video: boolean; id?: number; mine?: boolean } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastId = useRef(0)
  const sigRef = useRef('')      // подпись текущей ленты — чтобы пропускать рендер на пустых опросах
  const pollTick = useRef(0)     // счётчик опросов: периодически делаем полную сверку
  // непрочитанные: метка «Новые сообщения», кнопка «вниз» со счётчиком, отметка прочтения
  const [unreadFrom, setUnreadFrom] = useState<number | null>(null)
  const [newBelow, setNewBelow] = useState(0)
  const [showDown, setShowDown] = useState(false)
  const readSent = useRef(0)
  const markRead = (id: number) => { if (id > readSent.current) { readSent.current = id; api.chatRead(id).catch(() => {}) } }
  // @упоминания: подсказка участников при наборе «@…»
  const [mention, setMention] = useState<ChatMember[] | null>(null)
  const mentionQ = useRef('')
  const mentionT = useRef<number | undefined>(undefined)
  // поиск по чату
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<ChatMsg[] | null>(null)
  const [searching, setSearching] = useState(false)
  // набор эмодзи/стикеров по нажатию на эмодзи в сообщении
  const packScrollRef = useRef<HTMLDivElement>(null)
  // недавние эмодзи (как в Telegram) — хранятся на устройстве
  const [recentEmoji, setRecentEmoji] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('chat_recent_emoji') || '[]') } catch { return [] } })
  const pickEmoji = (ch: string) => {
    insertEmojiChar(ch)
    setRecentEmoji(prev => {
      const next = [ch, ...prev.filter(x => x !== ch)].slice(0, 24)
      try { localStorage.setItem('chat_recent_emoji', JSON.stringify(next)) } catch { /* */ }
      return next
    })
  }
  const [packSheet, setPackSheet] = useState<{ pack: import('../api/client').StickerPack | null; added: boolean; loading: boolean } | null>(null)
  const tempSeq = useRef(0)      // счётчик оптимистичных сообщений
  const atBottom = useRef(true)
  const lastTyping = useRef(0)
  const mediaRec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const recStart = useRef(0)
  const taRef = useRef<HTMLDivElement>(null)   // rich-поле ввода (contenteditable)
  const stScrollRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)   // плавающая нижняя панель (поле ввода + листы)
  const [dockH, setDockH] = useState(84)
  useEffect(() => {
    const el = dockRef.current; if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setDockH(el.offsetHeight))
    ro.observe(el); setDockH(el.offsetHeight)
    return () => ro.disconnect()
  })

  const byId = useMemo(() => new Map(msgs.map(m => [m.id, m])), [msgs])
  // последние разные авторы (для аватаров в шапке)
  const recentAuthors = useMemo(() => {
    const seen = new Set<number>(); const out: ChatMsg[] = []
    for (let k = msgs.length - 1; k >= 0 && out.length < 3; k--) {
      const m = msgs[k]; if (m.deleted || m.mine || seen.has(m.user_id)) continue
      seen.add(m.user_id); out.push(m)
    }
    return out
  }, [msgs])
  const emojiPacks = packs.filter(p => p.emoji)          // custom_emoji паки → вставка в текст
  const stickerPacks = packs.filter(p => !p.emoji)       // обычные стикеры → отдельным сообщением
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), t.length > 60 ? 5000 : 2500) }

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    })
  }
  const jumpBottom = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }
  // переход к сообщению (напр. по тапу на закреплённое) + кратковременная подсветка;
  // если его нет в ленте — подгружаем окно вокруг него с сервера и прыгаем
  const flashMsg = (id: number) => { setHiId(id); setTimeout(() => setHiId(null), 1700) }
  const jumpToMsg = async (id: number) => {
    const el = document.getElementById('m-' + id)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flashMsg(id); return }
    try {
      const r = await api.chatAround(id)
      if (r.topic && r.topic !== getChatTopic()) { pendingJump.current = id; setTopic(r.topic); return }
      if (r.messages && r.messages.length) {
        merge(r.messages)
        // ждём отрисовку, затем прыгаем к сообщению
        setTimeout(() => {
          const el2 = document.getElementById('m-' + id)
          if (el2) { el2.scrollIntoView({ behavior: 'auto', block: 'center' }); flashMsg(id) }
          else flash('Не удалось открыть сообщение')
        }, 160)
      } else flash('Сообщение не найдено')
    } catch { flash('Не удалось открыть сообщение') }
  }

  const merge = useCallback((incoming: ChatMsg[]) => {
    if (!incoming.length) return
    setMsgs(prev => {
      // подчищаем «зависшие» оптимистичные черновики (на случай сбоя досверки)
      const now = Date.now()
      const base = prev.filter(m => !((m as any).pending && now - new Date(m.created_at).getTime() > 8000))
      const map = new Map(base.map(m => [m.id, m]))
      for (const m of incoming) map.set(m.id, m)
      const arr = [...map.values()].sort((a, b) => a.id - b.id)
      const sig = chatSig(arr)
      if (sig === sigRef.current) return prev   // ничего не изменилось — не трогаем ленту
      sigRef.current = sig
      lastId.current = maxId(arr)
      return arr
    })
  }, [])

  useEffect(() => {
    let alive = true
    setChatTopic(topic)
    setMsgs([]); sigRef.current = ''; lastId.current = 0; setUnreadFrom(null); setNewBelow(0)
    const pull = async (first = false) => {
      try {
        pollTick.current++
        // первый опрос и каждый ~5-й — полная сверка (реакции/правки/удаления),
        // остальные — инкрементально только новые сообщения (лёгкий трафик, без рывков)
        const full = first || pollTick.current % 5 === 0
        const r = await api.chat(full ? undefined : (lastId.current || undefined))
        if (!alive) return
        setOnline(r.online); setIsAdmin(!!r.is_admin); setPinned(r.pinned ?? null); setGifEnabled(!!r.gif); setMutedMsg(r.muted ?? null)
        // «печатает…» обновляем только при реальном изменении — иначе лишний ре-рендер каждые 2.2с
        setTyping(prev => { const n = r.typing2 ? r.typing2.map(t => t.name + '\u0001' + t.kind) : (r.typing ?? []); return (prev.length === n.length && prev.every((v, i) => v === n[i])) ? prev : n })

        if (r.gated) { setGated(true); setChannel(r.channel || ''); setReady(true); return }
        setGated(false)
        if (typeof r.retention_days === 'number') setRetDays(r.retention_days)

        if (first) {
          if (pendingJump.current) { const j = pendingJump.current; pendingJump.current = null; setTimeout(() => jumpToMsg(j), 450) }
          // открываем сразу на последнем сообщении, без видимой прокрутки
          setMsgs(r.messages); sigRef.current = chatSig(r.messages); lastId.current = maxId(r.messages)
          const lr = r.last_read || 0
          lrOpen.current = lr
          const firstNew = lr > 0 ? r.messages.find(m => m.id > lr && !m.mine && !m.deleted) : undefined
          if (firstNew) {
            // есть непрочитанные — открываем на метке «Новые сообщения», как в Telegram
            setUnreadFrom(firstNew.id)
            const toSep = () => { const sep = document.getElementById('unread-sep'); const el = scrollRef.current; if (sep && el) el.scrollTop = Math.max(0, sep.offsetTop - 8) }
            requestAnimationFrame(() => { toSep(); requestAnimationFrame(() => { toSep(); setReady(true); const el = scrollRef.current; if (el) { atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; setShowDown(!atBottom.current); if (atBottom.current) markRead(lastId.current) } }) })
            setTimeout(toSep, 150)
          } else {
            requestAnimationFrame(() => { jumpBottom(); requestAnimationFrame(() => { jumpBottom(); setReady(true) }) })
            setTimeout(jumpBottom, 120); setTimeout(jumpBottom, 350); setTimeout(jumpBottom, 700)
            markRead(lastId.current)
          }
          return
        }

        if (!r.messages.length) return            // пусто — ничего не перерисовываем
        const wasBottom = atBottom.current
        const prevMax = lastId.current
        const newMax = maxId(r.messages)
        merge(r.messages)                          // обновит ленту только при реальном изменении
        if (newMax > prevMax) {
          if (wasBottom) { scrollToBottom(true); markRead(newMax) }   // скроллим лишь при новом сообщении
          else {
            const fresh = r.messages.filter(m => m.id > prevMax && !m.mine && !m.deleted).length
            if (fresh) setNewBelow(n => n + fresh)
          }
        }
      } catch { /* тихо */ }
    }
    // сперва берём короткоживущий токен для медиа (вместо initData в URL),
    // потом грузим ленту — чтобы картинки/аватары сразу шли по токену
    const applyMtok = (tk: string) => { api.setMediaToken(tk); setMtokV(v => v + 1) }
    const boot = async () => {
      try { const r = await api.chatMtoken(); if (alive) applyMtok(r.token) } catch { /* fallback на initData */ }
      if (alive) { pull(true); loadPacks() }
    }
    boot()
    // опрос на паузе, когда чат свёрнут/неактивен (экономим сеть и батарею)
    const t = window.setInterval(() => { if (!document.hidden) pull(false) }, 2200)
    const tk = window.setInterval(() => { if (!document.hidden) api.chatMtoken().then(r => alive && applyMtok(r.token)).catch(() => {}) }, 8 * 60 * 1000)
    // вернулись в чат — сразу обновляем ленту и медиа-токен (без ожидания следующего тика)
    const onVis = () => {
      if (document.hidden || !alive) return
      api.chatMtoken().then(r => alive && applyMtok(r.token)).catch(() => {})
      pull(false)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; window.clearInterval(t); window.clearInterval(tk); document.removeEventListener('visibilitychange', onVis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])

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
    const down = !atBottom.current && el.scrollHeight - el.scrollTop - el.clientHeight > 300
    if (down !== showDown) setShowDown(down)
    if (atBottom.current) { if (newBelow) setNewBelow(0); markRead(lastId.current); if (atMeQ.length) setMentionSeen(s => new Set([...s, ...atMeQ])) }
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
  // черновик для каждой темы: сохраняем при вводе, подставляем при переключении
  const draftTopic = useRef<string | null>(null)
  useEffect(() => {
    draftTopic.current = topic
    let d = ''
    try { d = localStorage.getItem('chat_draft:' + topic) || '' } catch { /* */ }
    setComposer(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])
  useEffect(() => {
    if (draftTopic.current == null || editing) return
    const id = window.setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem('chat_draft:' + draftTopic.current, text)
        else localStorage.removeItem('chat_draft:' + draftTopic.current)
      } catch { /* */ }
    }, 300)
    return () => window.clearTimeout(id)
  }, [text, editing])
  const detectMention = () => {
    const sel = window.getSelection(); const node = sel?.anchorNode
    if (!sel || !node || node.nodeType !== 3 || !taRef.current?.contains(node)) { setMention(null); return }
    const before = (node.textContent || '').slice(0, sel.anchorOffset)
    const mm = before.match(/(^|[\s\u00a0])@([A-Za-z0-9_а-яёА-ЯЁ]{0,32})$/)
    if (!mm) { mentionQ.current = ''; setMention(null); return }
    const q = mm[2]; mentionQ.current = q
    window.clearTimeout(mentionT.current)
    mentionT.current = window.setTimeout(() => {
      api.chatMembers(q).then(r => { if (mentionQ.current === q) setMention(r.members?.length ? r.members : null) }).catch(() => setMention(null))
    }, 180)
  }
  const applyMention = (u: ChatMember) => {
    const sel = window.getSelection(); const node = sel?.anchorNode
    const ins = '@' + u.username + '\u00a0'
    if (sel && node && node.nodeType === 3 && taRef.current?.contains(node)) {
      const off = sel.anchorOffset; const txt = node.textContent || ''
      const start = txt.slice(0, off).lastIndexOf('@')
      if (start >= 0) {
        node.textContent = txt.slice(0, start) + ins + txt.slice(off)
        const rg = document.createRange(); rg.setStart(node, start + ins.length); rg.collapse(true)
        sel.removeAllRanges(); sel.addRange(rg)
      } else insertTextAtCaret(ins)
    } else insertTextAtCaret(ins)
    mentionQ.current = ''; setMention(null); refreshFromEditor(); taRef.current?.focus()
  }
  // поиск: запрос с задержкой, пока человек печатает
  useEffect(() => {
    if (!searchOpen) return
    const q = searchQ.trim()
    if (q.length < 2) { setSearchRes(null); setSearching(false); return }
    setSearching(true)
    const t = window.setTimeout(() => {
      api.chatSearch(q).then(r => setSearchRes(r.messages || [])).catch(() => setSearchRes([])).finally(() => setSearching(false))
    }, 300)
    return () => window.clearTimeout(t)
  }, [searchQ, searchOpen])
  const closeSearch = () => { setSearchOpen(false); setSearchQ(''); setSearchRes(null) }
  const openFound = (id: number) => { closeSearch(); setTimeout(() => jumpToMsg(id), 60) }

  const onEditorInput = () => {
    detectMention()
    refreshFromEditor()
    const now = Date.now()
    if (now - lastTyping.current > 2500) { lastTyping.current = now; api.chatTyping().catch(() => {}) }
  }
  const insertEmojiNode = (fid: string, kind: string) => {
    const el = taRef.current; if (!el) return
    const k = kind === 'video' ? 'v' : kind === 'animated' ? 'a' : 'i'
    insertAtCaret(el, buildEmojiSpan(k, fid)); refreshFromEditor()
  }
  const insertEmojiChar = (ch: string) => {
    const el = taRef.current; if (!el) return
    insertAtCaret(el, buildUniEmoji(ch)); refreshFromEditor()
  }
  const insertTextAtCaret = (s: string) => {
    const el = taRef.current; if (!el) return
    insertAtCaret(el, document.createTextNode(s)); refreshFromEditor()
  }

  // инкрементальная досверка после действия: убираем оптимистичные «черновики» и вливаем реальные
  const syncAfterSend = async () => {
    try {
      const fresh = await api.chat(lastId.current || undefined)
      setMsgs(prev => {
        const map = new Map(prev.filter(m => !(m as any).pending).map(m => [m.id, m]))
        for (const m of fresh.messages) map.set(m.id, m)
        const arr = [...map.values()].sort((a, b) => a.id - b.id)
        sigRef.current = chatSig(arr); lastId.current = maxId(arr)
        return arr
      })
      scrollToBottom(true)
    } catch { /* следующий опрос подтянет */ }
  }

  const send = async () => {
    const t = text.trim()
    if (!t || sending) return

    // правка существующего — отдельный путь (без оптимистичной вставки)
    if (editing) {
      setSending(true)
      try {
        const r = await api.chatEdit(editing.id, t)
        if (r.error) flash('Не удалось изменить')
        setEditing(null); setComposer('')
        await syncAfterSend()
      } catch { flash('Не удалось отправить') }
      finally { setSending(false) }
      return
    }

    // оптимистичная отправка: сообщение появляется мгновенно, поле очищается,
    // плавный скролл вниз; сервер подтверждает в фоне и заменяет «черновик» реальным
    const replyId = reply?.id
    const temp: ChatMsg = {
      id: TEMP_BASE + (++tempSeq.current),
      user_id: MY_ID, name: ME?.first_name || '', username: ME?.username || '',
      avatar: '', mine: true, type: 'text', text: t, has_media: false, media_url: '',
      mime: '', dur: 0, reply_to: replyId ?? null, created_at: new Date().toISOString(), quote: replyQuote,
      deleted: false, edited: false, reactions: [], anim: false, once: false, ttl: false,
    } as any
    ;(temp as any).pending = true
    setMsgs(prev => { const arr = [...prev, temp]; sigRef.current = chatSig(arr); return arr })
    setComposer(''); setReply(null); setMention(null)
    atBottom.current = true
    scrollToBottom(true)

    setSending(true)
    try {
      const q = replyQuote; setReplyQuote('')
      const r = await api.chatSend(t, replyId, ttlSec || undefined, q)
      if (r.error) {
        setMsgs(prev => prev.filter(m => m.id !== temp.id))  // убираем черновик
        setComposer(t)                                        // возвращаем текст
        flash(r.message || (r.error === 'slow' ? 'Не так быстро' : 'Не удалось отправить'))
        return
      }
      await syncAfterSend()
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== temp.id))
      setComposer(t)
      flash('Не удалось отправить')
    } finally { setSending(false) }
  }

  const doUpload = async (type: string, file: Blob, mime: string, dur = 0) => {
    flash('Загружаю…')
    api.chatTyping('upload').catch(() => {})
    const r = await uploadMedia(type, file, mime, dur, '', ttlSec, onceOn)
    if (onceOn) setOnceOn(false)
    if (r?.error) { flash(r.message || 'Не удалось загрузить'); return }
    const fresh = await api.chat(lastId.current || undefined); merge(fresh.messages); scrollToBottom(); setToast('')
  }

  // галерея: несколько фото/видео — альбомом (до 10), одно фото — через редактор
  const onPickAny = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10); e.target.value = ''; setAttachOpen(false)
    if (!files.length) return
    const kindOf = (f: File) => f.type.startsWith('image/') && !f.type.includes('gif') ? 'photo'
      : f.type.startsWith('video/') ? 'video' : 'file'
    // одно фото — через редактор; один видео/файл — сразу; иначе альбом из медиа, файлы по одному
    if (files.length === 1) {
      const f = files[0], k = kindOf(f)
      if (f.size > 30 * 1024 * 1024) { flash('Файл больше 30 МБ'); return }
      if (k === 'photo') { setFilterIdx(0); setPhotoEdit({ url: URL.createObjectURL(f), file: f }) }
      else doUpload(k, f, f.type || '')
      return
    }
    const media = files.filter(f => kindOf(f) !== 'file')
    const docs = files.filter(f => kindOf(f) === 'file')
    const album = media.length > 1 ? Math.random().toString(36).slice(2, 12) : ''
    let n = 0
    for (let i = 0; i < media.length; i++) {
      const f = media[i]
      setToast(`Загружаю ${i + 1} из ${media.length}…`)
      api.chatTyping('upload').catch(() => {})
      const r = await uploadMedia(kindOf(f) === 'video' ? 'video' : 'photo', f, f.type || '', 0, '', ttlSec, false, album)
      if (r?.error) { flash(r.message || 'Не удалось загрузить'); break }
      n++
    }
    for (const f of docs) {
      if (f.size > 30 * 1024 * 1024) { flash(`«${f.name}» больше 30 МБ — пропущен`); continue }
      await doUpload('file', f, f.type || '')
    }
    if (n) { const fresh = await api.chat(lastId.current || undefined); merge(fresh.messages); scrollToBottom(); setToast('') }
  }

  const loadPacks = () => api.chatStickers().then(r => { const ps = r.packs || []; setPacks(ps); for (const p of ps) PACKCACHE[p.name] = p }).catch(() => {})
  const openSticker = () => { setAttachOpen(false); setEmojiOpen(false); setMention(null); setStickerOpen(true); if (stickerTab === '__gif__' && !gifs.length) loadGifs(''); loadPacks() }
  const sendStickerFile = async (fid: string, kind: string) => {
    setStickerOpen(false)
    try {
      const sr = await api.chatStickerFile(fid, kind, ttlSec || undefined)
      if (sr.error) { flash(sr.message || 'Не удалось отправить'); return }
      const fresh = await api.chat(lastId.current || undefined); merge(fresh.messages); scrollToBottom()
    } catch { flash('Не удалось отправить') }
  }
  const openPackOf = (q: { fid?: string; name?: string; msg?: number }) => {
    setMenuFor(null)
    setPackSheet({ pack: null, added: false, loading: true })
    api.chatPackOf(q).then(r => setPackSheet({ pack: r.pack, added: r.added, loading: false }))
      .catch(() => { setPackSheet(null); flash('Набор не найден') })
  }
  useEffect(() => {
    const h = (e: Event) => openPackOf((e as CustomEvent).detail || {})
    window.addEventListener('chat:emoji', h)
    return () => window.removeEventListener('chat:emoji', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const addPackFromSheet = async () => {
    const p = packSheet?.pack; if (!p) return
    try {
      const r = await api.chatStickersAdd(p.name)
      if (r.ok) { setPackSheet(s => s ? { ...s, added: true } : s); loadPacks(); flash(p.emoji ? 'Эмодзи добавлены' : 'Стикеры добавлены') }
      else flash(r.message || 'Не удалось добавить')
    } catch { flash('Не удалось добавить') }
  }
  const useFromSheet = (st: import('../api/client').StickerDef) => {
    const p = packSheet?.pack; if (!p) return
    setPackSheet(null)
    if (p.emoji) { setStickerOpen(false); insertEmojiNode(st.fid, st.kind); taRef.current?.focus(); flash('Эмодзи вставлено в сообщение') }
    else sendStickerFile(st.fid, st.kind)
  }

  const addPack = async () => {
    const l = addPackLink.trim(); if (!l) return
    setPackBusy(true)
    try {
      if (!/addstickers\/|addemoji\//i.test(l) && /[@|\s]/.test(l)) {
        // «@Boseh | @NewEmojis» — это название набора (каналы авторов), а не его адрес
        flash('Нужна ссылка на набор: t.me/addemoji/… или t.me/addstickers/…')
        return
      }
      const r = await api.chatStickersAdd(l)
      if (r.error) flash(r.message || 'Набор не найден')
      else { setAddPackLink(''); await loadPacks(); if (r.pack) { setStickerTab(r.pack.emoji ? 'emoji' : r.pack.name); flash(`Добавлен набор «${r.pack.title}»`) } }
    } catch (e) {
      flash(String((e as Error)?.message || '').includes('404')
        ? 'Набор не найден. Скопируйте ссылку на него в Telegram: откройте набор → «Поделиться» → «Копировать ссылку»'
        : 'Не удалось добавить набор, попробуйте ещё раз')
    } finally { setPackBusy(false) }
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
  const sendGif = async (url: string) => {
    setStickerOpen(false)
    try {
      const gr = await api.chatGifSend(url, ttlSec || undefined)
      if (gr.error) { flash(gr.message || 'Не удалось отправить'); return }
      const fresh = await api.chat(lastId.current || undefined); merge(fresh.messages); scrollToBottom()
    } catch { flash('Не удалось отправить') }
  }

  // поиск гифок с задержкой
  useEffect(() => {
    if (!(stickerOpen && stickerTab === '__gif__')) return
    const t = setTimeout(() => loadGifs(gifQuery.trim()), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifQuery, stickerOpen, stickerTab])

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

  const react = useCallback(async (id: number, emoji: string) => {
    setMsgs(prev => {
      const arr = prev.map(m => {
        if (m.id !== id) return m
        const rs = [...(m.reactions || [])]; const i = rs.findIndex(r => r.emoji === emoji)
        if (i >= 0) {
          const r = rs[i]; const nc = r.count + (r.mine ? -1 : 1)
          if (nc <= 0) rs.splice(i, 1); else rs[i] = { ...r, count: nc, mine: !r.mine }
        } else rs.push({ emoji, count: 1, mine: true })
        return { ...m, reactions: rs }
      })
      sigRef.current = chatSig(arr)   // синхронизируем подпись, иначе следующий опрос лишний раз перерисует
      return arr
    })
    try { await api.chatReact(id, emoji) } catch { /* */ }
    setMenuFor(null)
  }, [])

  const onMedia = useCallback(
    (url: string, video: boolean, mm?: ChatMsg) => setViewer({ url, video, id: mm?.id, mine: mm?.mine }),
    [])

  const startEdit = (m: ChatMsg) => { setEditing(m); setReply(null); setComposer(m.text); setMenuFor(null); taRef.current?.focus() }
  const startReply = (m: ChatMsg) => { setReply(m); setReplyQuote(''); setEditing(null); setMenuFor(null); taRef.current?.focus() }
  // стабильные обработчики для мемоизированных строк ленты
  const replyRef = useRef(startReply); replyRef.current = startReply
  const matRef = useRef(openMat); matRef.current = openMat
  const replyStable = useCallback((m: ChatMsg) => replyRef.current(m), [])
  const openMatStable = useCallback((id: number) => matRef.current(id), [])

  // ── лента: галерея, переходы, опросы, выбор ──
  const msgsRef = useRef<ChatMsg[]>([]); msgsRef.current = msgs
  const isGalleryMsg = (x: ChatMsg) => !x.deleted && x.has_media && !x.once && (x.type === 'photo' || x.type === 'video')
  const toView = (x: ChatMsg): ViewItem => ({ url: api.chatMediaUrl(x.id), video: x.type !== 'photo', id: x.id, mine: x.mine, name: x.name })
  const ctxImpl = {
    view: (_list: ChatMsg[], id: number) => {
      const all = msgsRef.current.filter(isGalleryMsg)
      const start = Math.max(0, all.findIndex(x => x.id === id))
      setViewerG({ items: all.map(toView), start })
    },
    jump: (id: number) => jumpToMsg(id),
    pollUpdate: (m: ChatMsg) => setMsgs(arr => arr.map(x => x.id === m.id ? { ...m } : x)),
    toggleSelect: (id: number) => setSelected(prev => {
      const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id)
      if (!n.size) setSelectMode(false)
      return n
    }),
  }
  const ctxRef = useRef(ctxImpl); ctxRef.current = ctxImpl
  const feedCtx = useMemo<FeedCtx>(() => ({
    view: (l, id) => ctxRef.current.view(l, id), jump: (id) => ctxRef.current.jump(id),
    pollUpdate: (m) => ctxRef.current.pollUpdate(m), toggleSelect: (id) => ctxRef.current.toggleSelect(id),
  }), [])
  // альбомы: подряд идущие медиа одного автора с одним album — одним сообщением
  const { albumOf, albumHidden } = useMemo(() => {
    const albumOf = new Map<number, ChatMsg[]>(), albumHidden = new Set<number>()
    let head: ChatMsg | null = null
    for (const x of msgs) {
      if (x.album && !x.deleted && (x.type === 'photo' || x.type === 'video') && head && head.album === x.album && head.user_id === x.user_id) {
        albumOf.get(head.id)!.push(x); albumHidden.add(x.id)
      } else if (x.album && !x.deleted && (x.type === 'photo' || x.type === 'video')) { head = x; albumOf.set(x.id, [x]) }
      else head = null
    }
    return { albumOf, albumHidden }
  }, [msgs])
  // кнопка «@»: непрочитанные упоминания и ответы мне
  const atMeQ = useMemo(() => {
    const myIds = new Set(msgs.filter(x => x.mine).map(x => x.id))
    return msgs.filter(x => x.id > lrOpen.current && lrOpen.current > 0 && !x.mine && !x.deleted && !mentionSeen.has(x.id) &&
      ((!!MY_UN && (x.text || '').toLowerCase().includes('@' + MY_UN)) || (x.reply_to != null && myIds.has(x.reply_to)))).map(x => x.id)
  }, [msgs, mentionSeen])
  const goMention = () => { const id = atMeQ[0]; if (!id) return; setMentionSeen(s => new Set([...s, id])); jumpToMsg(id) }
  // голосовые: мини-плеер и автопроигрывание следующего
  useEffect(() => {
    const onState = (e: Event) => {
      const d = (e as CustomEvent).detail
      setPlayer(p => (d.playing || (p && p.id === d.id && d.cur > 0)) ? d : (p && p.id === d.id ? null : p))
    }
    const onEnded = (e: Event) => {
      const id = (e as CustomEvent).detail?.id
      const arr = msgsRef.current, i = arr.findIndex(x => x.id === id)
      const nx = i >= 0 ? arr.slice(i + 1).find(x => x.type === 'voice' && !x.deleted && x.has_media) : undefined
      if (nx) setTimeout(() => voiceBus.emit('cmd', { id: nx.id, cmd: 'play' }), 250)
      else setPlayer(null)
    }
    window.addEventListener('cv:state', onState); window.addEventListener('cv:ended', onEnded)
    return () => { window.removeEventListener('cv:state', onState); window.removeEventListener('cv:ended', onEnded) }
  }, [])
  // панель форматирования: показываем, когда в поле ввода выделен текст
  useEffect(() => {
    const h = () => {
      const sel = window.getSelection(); const el = taRef.current
      setFmtOn(!!sel && !sel.isCollapsed && !!el && el.contains(sel.anchorNode) && el.contains(sel.focusNode))
    }
    document.addEventListener('selectionchange', h); return () => document.removeEventListener('selectionchange', h)
  }, [])
  const applyFormat = (a: string, b: string) => {
    const sel = window.getSelection(); if (!sel || sel.isCollapsed) return
    const t = sel.toString()
    document.execCommand('insertText', false, a + t + b)
    refreshFromEditor(); setFmtOn(false)
  }
  // выбор нескольких
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()) }
  const selMsgs = () => msgsRef.current.filter(x => selected.has(x.id))
  const copySelected = async () => {
    const t = selMsgs().map(x => `${x.name}: ${stripTokens(x.text) || attachLabel(x)}`).join('\n')
    try { await navigator.clipboard.writeText(t); flash('Скопировано') } catch { flash('Не удалось скопировать') }
    exitSelect()
  }
  const deleteSelected = async () => {
    const list = selMsgs().filter(x => x.mine || isAdmin)
    if (!list.length) { flash('Можно удалить только свои сообщения'); return }
    if (!window.confirm(`Удалить ${list.length} ${list.length === 1 ? 'сообщение' : 'сообщений'}?`)) return
    for (const x of list) await del(x.id)
    exitSelect(); flash('Удалено')
  }
  const copyMsg = async (x: ChatMsg) => {
    setMenuFor(null)
    try { await navigator.clipboard.writeText(x.type === 'poll' ? (x.poll?.q || '') : stripTokens(x.text)); flash('Текст скопирован') } catch { flash('Не удалось скопировать') }
  }
  const forwardTo = async (x: ChatMsg, t: ChatTopic) => {
    setFwdFor(null)
    const r = await api.chatForward(x.id, t.id).catch(() => ({ error: 'net', message: 'Не удалось переслать' } as any))
    if (r?.error) { flash(r.message || 'Не удалось переслать'); return }
    flash(`Переслано в «${t.title}»`)
    if (t.id === topic) { const fresh = await api.chat(lastId.current || undefined); merge(fresh.messages); scrollToBottom() }
  }
  const shareToTelegram = (x: ChatMsg) => {
    setFwdFor(null)
    const text = `${x.name}: ${stripTokens(x.text) || attachLabel(x)}\n— из чата «Базы знаний»`
    const url = `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(text)}`
    try { tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank') } catch { window.open(url, '_blank') }
  }
  // темы: долгое нажатие — без уведомлений
  const topicLp = useRef<{ t: number; fired: boolean }>({ t: 0, fired: false })
  const toggleTopicMute = async (t: ChatTopic) => {
    const on = !t.muted
    setTopics(arr => arr.map(x => x.id === t.id ? { ...x, muted: on } : x))
    try { await api.chatTopicMute(t.id, on); flash(on ? `«${t.title}»: без уведомлений` : `«${t.title}»: уведомления включены`) } catch { /* */ }
    try { tg?.HapticFeedback?.impactOccurred?.('light') } catch { /* */ }
  }
  const insertMention = (un: string) => { insertTextAtCaret('@' + un + ' ') }

  const stopMic = () => {
    const s = micStream.current
    if (s) { s.getTracks().forEach(t => { try { t.enabled = false } catch { /* */ } try { t.stop() } catch { /* */ } }); micStream.current = null }
  }
  const ROUND_MAX = 60
  const stopCam = () => {
    cancelAnimationFrame(drawRaf.current)
    const c = camStream.current
    if (c) { c.getTracks().forEach(t => { try { t.stop() } catch { /* */ } }); camStream.current = null }
    if (camPreview.current) camPreview.current.srcObject = null
    setCamReady(false)
  }
  // превью в кружке — видимый <video>, он же источник кадров для записи (на iPhone скрытое видео не отдаёт кадры)
  const attachPreview = async (cs: MediaStream) => {
    for (let i = 0; i < 40 && !camPreview.current; i++) await new Promise(r => setTimeout(r, 16))
    const v = camPreview.current; if (!v) return
    v.srcObject = cs; v.muted = true
    await v.play().catch(() => {})
    for (let i = 0; i < 60 && !v.videoWidth; i++) await new Promise(r => setTimeout(r, 25))
    setCamReady(true)
  }
  const camConstraints = (face: 'user' | 'environment') => ({ facingMode: face, width: { ideal: 640 }, height: { ideal: 640 }, frameRate: { ideal: 30 } })
  const openCam = async (face: 'user' | 'environment') => {
    const cs = await navigator.mediaDevices.getUserMedia({ video: camConstraints(face), audio: false })
    const old = camStream.current
    camStream.current = cs
    await attachPreview(cs)
    if (old) old.getTracks().forEach(t => { try { t.stop() } catch { /* */ } })
  }
  const flipCam = async () => {
    const nf = facing === 'user' ? 'environment' : 'user'
    setFacing(nf); try { localStorage.setItem('chat_cam', nf) } catch { /* */ }
    try { tg?.HapticFeedback?.selectionChanged?.() } catch { /* */ }
    try { await openCam(nf) } catch { flash('Не удалось переключить камеру') }
  }
  // доступ к микрофону/камере запрашиваем сразу при касании — пока решаем «тап или удержание», устройство уже включается
  const acquire = (kind: 'voice' | 'round'): Promise<MediaStream> => {
    let face: 'user' | 'environment' = 'user'
    try { if (localStorage.getItem('chat_cam') === 'environment') face = 'environment' } catch { /* */ }
    return navigator.mediaDevices.getUserMedia(kind === 'round' ? { audio: true, video: camConstraints(face) } : { audio: true })
  }
  const pending = useRef<Promise<MediaStream> | null>(null)
  const dropPending = () => {
    const pr = pending.current; pending.current = null
    pr?.then(st => st.getTracks().forEach(t => t.stop())).catch(() => {})
  }
  const startRec = async (kind: 'voice' | 'round' = 'voice', pre?: Promise<MediaStream> | null) => {
    if (rec || micStream.current || wantRec.current) return   // уже идёт/готовится
    wantRec.current = true
    let face: 'user' | 'environment' = 'user'
    try { if (localStorage.getItem('chat_cam') === 'environment') face = 'environment' } catch { /* */ }
    if (kind === 'round') {   // круг с камерой показываем сразу, не дожидаясь устройства
      setFacing(face); setRecKind('round'); setCamReady(false); setRecElapsed(0); setRec(true)
    }
    try {
      const st = await (pre || acquire(kind))
      if (!wantRec.current) { st.getTracks().forEach(t => t.stop()); return }   // палец отпустили до выдачи доступа
      micStream.current = new MediaStream(st.getAudioTracks())
      let recStream: MediaStream = micStream.current
      let viaCanvas = false
      if (kind === 'round') {
        camStream.current = new MediaStream(st.getVideoTracks())
        await attachPreview(camStream.current)
        if (!wantRec.current) { stopCam(); stopMic(); return }
        // квадратный кадр из превью: центр, фронтальная — зеркально (как человек видит себя)
        const cv = document.createElement('canvas'); cv.width = 480; cv.height = 480
        const ctx = cv.getContext('2d')
        if (typeof (cv as any).captureStream === 'function' && ctx) {
          const draw = () => {
            const v = camPreview.current
            if (v && v.videoWidth) {
              const sz = Math.min(v.videoWidth, v.videoHeight)
              const sx = (v.videoWidth - sz) / 2, sy = (v.videoHeight - sz) / 2
              ctx.save()
              if ((camStream.current?.getVideoTracks()[0]?.getSettings().facingMode || 'user') !== 'environment') { ctx.translate(480, 0); ctx.scale(-1, 1) }
              ctx.drawImage(v, sx, sy, sz, sz, 0, 0, 480, 480)
              ctx.restore()
            }
            drawRaf.current = requestAnimationFrame(draw)
          }
          draw()
          recStream = new MediaStream([...(cv as any).captureStream(30).getVideoTracks(), ...st.getAudioTracks()])
          viaCanvas = true
        } else {
          recStream = new MediaStream([...camStream.current.getVideoTracks(), ...st.getAudioTracks()])
        }
      }
      const pref = kind === 'round'
        ? ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']
        : ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4']
      const sup = (t: string) => { try { return (window as any).MediaRecorder?.isTypeSupported?.(t) } catch { return false } }
      const mime = pref.find(sup) || ''
      const makeRec = (stream: MediaStream) => {
        const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {}
        if (kind === 'round') opts.videoBitsPerSecond = 1_000_000
        const mr = new MediaRecorder(stream, opts)
        mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.current.push(ev.data) }
        mr.onstop = () => {
          if ((mr as any)._swap) return   // перезапуск на прямом потоке камеры — это не конец записи
          const type = (mr.mimeType || mime || (kind === 'round' ? 'video/mp4' : 'audio/webm'))
          const blob = new Blob(chunks.current, { type })
          stopMic(); stopCam()   // микрофон и камеру выключаем сразу
          const dur = (Date.now() - recStart.current) / 1000
          if (recCancelRef.current) { recCancelRef.current = false; return }   // отменено
          if (blob.size < 2000) { flash(kind === 'round' ? 'Не удалось записать видео — попробуй ещё раз' : 'Пустая запись — зажми и говори'); return }
          if (kind === 'round') {
            if (dur >= 0.7) doUpload('round', blob, type.split(';')[0], Math.min(dur, ROUND_MAX))
            else flash('Слишком короткий кружок — держи дольше')
          } else if (dur >= 0.3) doUpload('voice', blob, type, dur)
          else flash('Слишком короткое голосовое')
        }
        return mr
      }
      chunks.current = []
      let mr = makeRec(recStream)
      mediaRec.current = mr; recStart.current = Date.now()
      recCancelRef.current = false; setRecCancel(false); setRecElapsed(0); setRecKind(kind)
      mr.start(250); setRec(true)
      try { tg?.HapticFeedback?.impactOccurred?.('medium') } catch { /* */ }
      // страховка для iPhone: если запись с canvas не даёт данных — переключаемся на прямой поток камеры
      if (viaCanvas) {
        setTimeout(() => {
          if (!wantRec.current || mediaRec.current !== mr || chunks.current.length) return
          ;(mr as any)._swap = true
          try { mr.stop() } catch { /* */ }
          cancelAnimationFrame(drawRaf.current)
          chunks.current = []
          mr = makeRec(new MediaStream([...(camStream.current?.getVideoTracks() || []), ...st.getAudioTracks()]))
          mediaRec.current = mr; mr.start(250)
        }, 1200)
      }
      recTimer.current = window.setInterval(() => {
        const el = (Date.now() - recStart.current) / 1000
        setRecElapsed(Math.floor(el))
        if (Date.now() - lastTyping.current > 3000) { lastTyping.current = Date.now(); api.chatTyping(kind === 'round' ? 'round' : 'voice').catch(() => {}) }
        if (el >= (kind === 'round' ? ROUND_MAX : 300)) stopRec()   // кружок — до минуты, голос — страховка 5 мин
      }, 200)
    } catch {
      wantRec.current = false; stopMic(); stopCam(); setRec(false)
      flash(kind === 'round' ? 'Нет доступа к камере или микрофону' : 'Нет доступа к микрофону')
    }
  }
  const stopRec = () => {
    wantRec.current = false
    setRec(false); setRecCancel(false); setRecLocked(false); recLockedRef.current = false; setLockHint(0)
    if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null }
    const s = micStream.current
    const mr = mediaRec.current
    if (mr && mr.state !== 'inactive') { try { mr.stop() } catch { /* */ } }   // onstop выключит устройства
    else { stopMic(); stopCam() }   // рекордер ещё не стартовал — глушим потоки напрямую
    if (s) setTimeout(() => { s.getTracks().forEach(t => { try { t.stop() } catch { /* */ } }); if (micStream.current === s) micStream.current = null }, 600)
  }
  const cancelRec = () => { recCancelRef.current = true; stopRec() }
  // жесты на кнопке записи
  const pressDown = (x: number, y: number) => {
    if (rec) return
    const mode = recMode
    pending.current = acquire(mode)
    pending.current.catch(() => {})
    const st = { x, y, t: Date.now(), holding: false, timer: 0 }
    st.timer = window.setTimeout(() => { st.holding = true; const pr = pending.current; pending.current = null; startRec(mode, pr) }, 160)
    press.current = st
  }
  const pressMove = (x: number, y: number) => {
    const st = press.current; if (!st || !st.holding || recLockedRef.current) return
    const dx = x - st.x, dy = y - st.y
    const c = dx < -70; recCancelRef.current = c; setRecCancel(c)
    setLockHint(Math.max(0, Math.min(1, -dy / 80)))
    if (dy < -80 && !c) {   // потянули вверх — запись без рук
      recLockedRef.current = true; setRecLocked(true); setLockHint(0)
      try { tg?.HapticFeedback?.impactOccurred?.('light') } catch { /* */ }
    }
  }
  const pressUp = () => {
    const st = press.current; press.current = null
    if (!st) return
    clearTimeout(st.timer)
    if (!st.holding) {   // короткое нажатие — переключаем режим, устройство выключаем
      dropPending()
      wantRec.current = false
      const nm = recMode === 'voice' ? 'round' : 'voice'
      setRecMode(nm); try { localStorage.setItem('chat_rec_mode', nm) } catch { /* */ }
      try { tg?.HapticFeedback?.selectionChanged?.() } catch { /* */ }
      flash(nm === 'round' ? 'Удерживай, чтобы записать кружок' : 'Удерживай, чтобы записать голосовое')
      return
    }
    if (recLockedRef.current) return   // запись без рук — остановит кнопка «Отправить»
    stopRec()
  }

  let lastDay = ''

  // не подписан на канал — доступ к чату закрыт (приглашение подписаться)
  if (gated) {
    const handle = channel.replace(/^@/, '')
    const openChannel = () => {
      const url = `https://t.me/${handle}`
      try { tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank') } catch { window.open(url, '_blank') }
    }
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-8 text-center gap-5">
        <span className="tile-violet w-[72px] h-[72px] rounded-[22px]"><Icon name="chat" size={34} accent="#fff" /></span>
        <div>
          <div className="font-display font-semibold text-[18px] text-fg">Чат для подписчиков канала</div>
          <div className="text-[14px] text-gray mt-2 leading-relaxed max-w-[290px]">
            Подпишитесь на канал базы, чтобы читать и писать в общем чате. После подписки нажмите «Я подписался».
          </div>
        </div>
        {handle && (
          <button onClick={openChannel} className="btn-primary px-7 w-full max-w-[280px]">
            Подписаться на канал
          </button>
        )}
        <button onClick={async () => {
          try {
            const r = await api.chatRecheck()
            if (!r.gated) { setGated(false); setReady(false); pollTick.current = 0 }
          } catch { /* ещё не видно — попробуй ещё раз */ }
        }} className="text-[14px] font-medium text-green active:opacity-70">
          Я подписался — проверить
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden max-w-full" style={{ WebkitUserSelect: 'none', userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>

      {/* поиск по чату: строка поиска вместо шапки */}
      {searchOpen && (
        <div className="relative flex items-center gap-2 pl-2 pr-3 py-2 shrink-0 bg-bg border-b border-white/[.06]">
          <button onClick={closeSearch} aria-label="Закрыть поиск" className="w-9 h-10 flex items-center justify-center rounded-full text-fg active:bg-white/10 shrink-0">
            <Icon name="back" size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-full bg-white/[.07] border border-white/[.08] min-w-0">
            <Icon name="search" size={18} className="text-gray shrink-0" />
            <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Поиск по чату"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-fg placeholder:text-gray2 outline-none" style={{ WebkitUserSelect: 'text', userSelect: 'text' }} />
            {searchQ && <button onClick={() => setSearchQ('')} aria-label="Очистить" className="text-gray shrink-0"><Icon name="close" size={16} /></button>}
          </div>
        </div>
      )}

      {selectMode && (
        <div className="flex items-center gap-2 pl-2 pr-3 py-2 shrink-0 bg-bg border-b border-white/[.06]" style={{ minHeight: 57 }}>
          <button onClick={exitSelect} aria-label="Отмена" className="w-10 h-10 rounded-full grid place-items-center text-fg active:bg-white/10"><Icon name="close" size={20} /></button>
          <div className="flex-1 font-display font-semibold text-[15px]">Выбрано: {selected.size}</div>
          <button onClick={copySelected} aria-label="Копировать" className="w-10 h-10 rounded-full grid place-items-center text-fg active:bg-white/10"><Icon name="copy" size={19} /></button>
          <button onClick={deleteSelected} aria-label="Удалить" className="w-10 h-10 rounded-full grid place-items-center active:bg-white/10" style={{ color: '#FF7A7A' }}><Icon name="trash" size={19} /></button>
        </div>
      )}
      {/* шапка чата: плитка, название, онлайн, «печатает», последние участники */}
      <div className={`relative flex items-center gap-2.5 pl-2 pr-3 py-2 shrink-0 bg-bg border-b border-white/[.06] ${searchOpen || selectMode ? 'hidden' : ''}`}>
        {onBack && (
          <button onClick={onBack} aria-label="Назад" className="w-9 h-10 -mr-1 flex items-center justify-center rounded-full text-fg active:bg-white/10 shrink-0">
            <Icon name="back" size={22} />
          </button>
        )}
        <button onClick={() => MY_ID > 0 && setProfileFor(MY_ID)} aria-label="Мой профиль в чате"
          className={`tile-violet w-10 h-10 rounded-[13px] shrink-0 ${onBack ? '' : 'ml-1.5'}`}>
          <Icon name="chat" size={19} accent="#fff" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[15px] leading-tight truncate">Чат базы</div>
          <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray whitespace-nowrap overflow-hidden">
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            <button onClick={openOnline} className="tabular-nums underline decoration-dotted decoration-white/25 underline-offset-[3px]">{online} в сети</button>
            {typing.length > 0 && (
              <>
                <span className="w-[3px] h-[3px] rounded-full bg-gray2 shrink-0" />
                <span className="flex items-center gap-1.5 truncate" style={{ color: VIOLET }}>
                  <span className="typing-dots"><i /><i /><i /></span>
                  <span className="truncate">{typing.length > 1 ? `${typing.length} печатают` : (() => {
                    const [nm, kind] = typing[0].split('\u0001')
                    return `${nm} ${({ voice: 'записывает голосовое', round: 'записывает видео', upload: 'отправляет файл' } as Record<string, string>)[kind] || 'печатает'}`
                  })()}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0">
          {recentAuthors.map((a, k) => (
            <div key={a.user_id} className="rounded-full" style={{ marginLeft: k ? -7 : 0, boxShadow: '0 0 0 2px #08100D' }}>
              <Avatar name={a.name} src={api.chatAvatarUrl(a.user_id)} size={26} />
            </div>
          ))}
        </div>
        <button onClick={() => setGalleryOpen(true)} aria-label="Медиа темы"
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#CFDAD4] active:bg-white/10 shrink-0">
          <Icon name="image" size={20} />
        </button>
        <button onClick={() => setSearchOpen(true)} aria-label="Поиск по чату"
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#CFDAD4] active:bg-white/10 shrink-0">
          <Icon name="search" size={20} />
        </button>
        {isAdmin && (
          <button onClick={() => setRetOpen(true)} aria-label="Настройки чата"
            className="w-9 h-9 -mr-1 flex items-center justify-center rounded-full text-gray active:bg-white/10 shrink-0">
            <Icon name="settings" size={19} />
          </button>
        )}
      </div>

      {!searchOpen && topics.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 shrink-0 border-b border-white/[.06] bg-bg">
          {topics.map(t => (
            <button key={t.id}
              onClick={() => { if (topicLp.current.fired) { topicLp.current.fired = false; return } if (t.id !== topic) { setReady(false); setTopic(t.id) } }}
              onTouchStart={() => { topicLp.current.fired = false; topicLp.current.t = window.setTimeout(() => { topicLp.current.fired = true; toggleTopicMute(t) }, 550) }}
              onTouchEnd={() => clearTimeout(topicLp.current.t)} onTouchMove={() => clearTimeout(topicLp.current.t)}
              onContextMenu={(e) => { e.preventDefault(); topicLp.current.fired = true; toggleTopicMute(t) }}
              className={`chip !h-8 !px-3 !text-[12.5px] ${t.id === topic ? 'on' : ''}`}>
              {t.muted && <Icon name="bellOff" size={13} accent="current" className="opacity-70" />}
              {t.title}
              {t.unread > 0 && t.id !== topic && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-green text-ink text-[10.5px] font-bold grid place-items-center">{t.unread > 98 ? '99+' : t.unread}</span>}
            </button>
          ))}
        </div>
      )}
      {player && (
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 border-b border-white/[.06]" style={{ background: 'rgba(23,229,132,.07)' }}>
          <button onClick={() => voiceBus.emit('cmd', { id: player.id, cmd: 'toggle' })} aria-label={player.playing ? 'Пауза' : 'Играть'}
            className="w-8 h-8 rounded-full grid place-items-center shrink-0" style={{ background: '#17E584', color: '#03200F' }}>
            <Icon name={player.playing ? 'pause' : 'play'} size={13} accent="current" />
          </button>
          <button onClick={() => jumpToMsg(player.id)} className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-semibold text-fg truncate">{player.name}</div>
            <div className="text-[11.5px] text-gray tabular-nums">Голосовое · {fmtDur(player.cur)}{player.dur ? ` / ${fmtDur(player.dur)}` : ''}</div>
          </button>
          <button onClick={() => voiceBus.emit('cmd', { id: player.id, cmd: 'speed' })} className="px-2 h-7 rounded-full text-[12px] font-bold text-fg bg-white/[.08] tabular-nums">{voiceSpeed}×</button>
          <button onClick={() => { voiceBus.emit('cmd', { id: player.id, cmd: 'stop' }); setPlayer(null) }} aria-label="Закрыть плеер" className="w-8 h-8 rounded-full grid place-items-center text-gray active:bg-white/10"><Icon name="close" size={15} /></button>
        </div>
      )}
      {mutedMsg && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0 text-[12.5px] text-[#FF9A9A] border-b border-white/[.06]" style={{ background: 'rgba(255,80,80,.08)' }}>
          <Icon name="lock" size={14} className="shrink-0" />{mutedMsg}
        </div>
      )}

      {pinned && !pinned.deleted && (
        <div onClick={() => jumpToMsg(pinned.id)} className="flex items-center gap-2.5 px-3.5 py-2 shrink-0 cursor-pointer active:bg-white/[.03] border-b border-white/[.06]" style={{ background: 'rgba(17,28,23,.92)' }}>
          <span className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: 'rgba(118,87,255,.18)', color: VIOLET }}><Icon name="pin" size={15} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold truncate" style={{ color: VIOLET }}>Закреплено · {pinned.name}</div>
            <div className="text-[13.5px] text-fg truncate">{stripTokens(pinned.text) || attachLabel(pinned)}</div>
          </div>
          {isAdmin && <button onClick={(e) => { e.stopPropagation(); unpin() }} className="text-[12px] font-medium text-gray px-2 py-1 rounded-full active:bg-white/10 shrink-0">Открепить</button>}
        </div>
      )}

      {searchOpen && (
        <div className="absolute left-0 right-0 bottom-0 z-30 overflow-y-auto bg-bg" style={{ top: 57 }}>
          {searchQ.trim().length < 2 ? (
            <div className="px-6 pt-10 text-center text-[14px] text-gray">Введите хотя бы 2 символа: слово из сообщения или имя участника.</div>
          ) : searching && !searchRes ? (
            <div className="px-6 pt-10 text-center text-[14px] text-gray">Ищем…</div>
          ) : searchRes && searchRes.length === 0 ? (
            <div className="px-6 pt-10 text-center text-[14px] text-gray">Ничего не нашлось. Попробуйте другое слово.</div>
          ) : (
            <div className="px-3 py-3 flex flex-col gap-0.5">
              {searchRes && <div className="px-2 pb-2 text-[12.5px] text-gray tabular-nums">Найдено: {searchRes.length}{searchRes.length >= 50 ? '+' : ''}</div>}
              {(searchRes || []).map(m => {
                const t = stripTokens(m.text); const q = searchQ.trim().toLowerCase(); const i = t.toLowerCase().indexOf(q)
                const from = Math.max(0, i - 40); const pre = (from > 0 ? '…' : '') + t.slice(from, Math.max(from, i))
                return (
                  <button key={m.id} onClick={() => openFound(m.id)} className="flex items-start gap-3 px-2 py-2.5 rounded-[14px] text-left active:bg-white/[.05]">
                    <Avatar name={m.name} src={api.chatAvatarUrl(m.user_id)} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[14px] font-semibold truncate" style={{ color: colorFor(m.name) }}>{m.name}{m.premium && <Icon name="crown" size={12} accent="#FFD873" className="inline-block ml-1 align-[-1px] text-gold" />}</span>
                        <span className="ml-auto text-[11.5px] text-gray2 shrink-0 tabular-nums">{dayLabel(m.created_at)} · {timeOf(m.created_at)}</span>
                      </div>
                      <div className="text-[13.5px] text-[#CFDAD4] line-clamp-2 break-words">
                        {i >= 0 ? <>{pre}<mark className="bg-transparent font-semibold" style={{ color: '#17E584' }}>{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length, i + q.length + 120)}</> : t.slice(0, 160)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden pt-2" style={{ overscrollBehavior: 'contain', background: WALL, opacity: ready ? 1 : 0, transition: 'opacity .12s', paddingBottom: dockH + 12 }}>
        {msgs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[14px] text-gray px-8 text-center">
            <span className="tile-violet w-14 h-14 rounded-[18px]"><Icon name="chat" size={26} accent="#fff" /></span>
            Пока тихо. Напишите первым и поздоровайтесь с базой.
          </div>
        ) : msgs.map((m, i) => {
          if (albumHidden.has(m.id)) return <div key={m.id} id={`m-${m.id}`} />
          const d = dayLabel(m.created_at); const sep = d !== lastDay; lastDay = d
          return (
            <div key={m.id} id={`m-${m.id}`} style={hiId === m.id ? { background: 'rgba(118,87,255,.16)', borderRadius: 14, transition: 'background .5s' } : { transition: 'background .8s' }}>
              {m.id === unreadFrom && (
                <div id="unread-sep" className="flex items-center gap-3 px-4 my-3">
                  <span className="flex-1 h-px" style={{ background: 'rgba(185,168,255,.3)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: VIOLET }}>Новые сообщения</span>
                  <span className="flex-1 h-px" style={{ background: 'rgba(185,168,255,.3)' }} />
                </div>
              )}
              {sep && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 rounded-full text-[12px] font-medium text-[#CFDAD4]" style={{ background: 'rgba(17,28,23,.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>{d}</span>
                </div>
              )}
              <MsgRow m={m} prev={i > 0 ? msgs[i - 1] : null} next={i < msgs.length - 1 ? msgs[i + 1] : null} quoted={m.reply_to ? (byId.get(m.reply_to) || null) : null} onAction={setMenuFor} onReact={react} onProfile={setProfileFor} onMedia={onMedia} onReply={replyStable} onOpenMat={openMatStable}
                ctx={feedCtx} album={albumOf.get(m.id)} selectMode={selectMode} selected={selectMode && selected.has(m.id)} />
            </div>
          )
        })}
      </div>

      {/* плавающая нижняя панель: листы + стеклянная капсула ввода */}
      <div ref={dockRef} className={`absolute left-0 right-0 bottom-0 ${rec && recKind === 'round' ? 'z-[60]' : 'z-20'} px-2.5 flex flex-col pointer-events-none [&>*]:pointer-events-auto`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
        {atMeQ.length > 0 && !searchOpen && (
          <button onClick={goMention} aria-label="К упоминаниям"
            className="glass self-end relative mb-2 mr-1 w-11 h-11 rounded-full flex items-center justify-center text-[19px] font-bold active:scale-95 transition-transform" style={{ color: VIOLET }}>
            @
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums text-white" style={{ background: '#7657FF' }}>{atMeQ.length}</span>
          </button>
        )}
        {fmtOn && (
          <div className="glass self-center mb-2 flex items-center gap-0.5 px-1 py-1 rounded-full" style={{ background: 'rgba(13,21,17,.96)' }}>
            {FORMATS.map((f, i) => (
              <button key={i} title={f.title} onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()}
                onClick={() => applyFormat(f.wrap[0], f.wrap[1])} onTouchEnd={(e) => { e.preventDefault(); applyFormat(f.wrap[0], f.wrap[1]) }}
                className="min-w-[38px] h-9 px-2 rounded-full text-[15px] text-fg active:bg-white/10">{f.label}</button>
            ))}
          </div>
        )}
        {showDown && !searchOpen && (
          <button onClick={() => { scrollToBottom(true); setNewBelow(0) }} aria-label="К новым сообщениям"
            className="glass self-end relative mb-2 mr-1 w-11 h-11 rounded-full flex items-center justify-center text-fg active:scale-95 transition-transform">
            <Icon name="chevD" size={22} />
            {newBelow > 0 && (
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 min-w-[20px] h-5 px-1.5 rounded-full bg-green text-ink text-[11px] font-bold flex items-center justify-center tabular-nums">
                {newBelow > 99 ? '99+' : newBelow}
              </span>
            )}
          </button>
        )}
        {toast && <div className="self-center mb-2 px-3.5 py-1.5 rounded-[16px] text-[12.5px] leading-snug text-center text-fg glass max-w-[92%]">{toast}</div>}

        {mention && mention.length > 0 && !stickerOpen && !attachOpen && !emojiOpen && (
          <div className="glass rounded-[18px] mb-2 py-1.5 max-h-[248px] overflow-y-auto" style={{ background: 'rgba(13,21,17,.97)' }}>
            {mention.map(u => (
              <button key={u.user_id} onMouseDown={e => e.preventDefault()} onClick={() => applyMention(u)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left active:bg-white/[.06]">
                <Avatar name={u.name} src={api.chatAvatarUrl(u.user_id)} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-fg truncate">{u.name}{u.premium && <Icon name="crown" size={12} accent="#FFD873" className="inline-block ml-1 align-[-1px] text-gold" />}</div>
                  <div className="text-[12.5px] text-gray truncate">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {(reply || editing) && (
          <div className="glass rounded-[18px] mb-2 flex items-center gap-2.5 pl-3 pr-1.5 py-1.5" style={{ background: 'rgba(13,21,17,.95)' }}>
            <span className="text-green shrink-0"><Icon name={editing ? 'edit' : 'reply'} size={17} /></span>
            <div className="flex-1 min-w-0 pl-2.5 border-l-[3px] border-green">
              <div className="text-[12px] font-semibold text-green">{editing ? 'Редактирование' : `Ответ ${reply!.name}`}</div>
              <div className="text-[12.5px] text-gray truncate">{replyQuote && !editing ? `“${replyQuote}”` : (stripTokens((editing || reply)!.text) || attachLabel((editing || reply)!))}</div>
            </div>
            <button onClick={() => { setReply(null); setReplyQuote(''); if (editing) setComposer(''); setEditing(null) }} aria-label="Отменить" className="w-9 h-9 rounded-full flex items-center justify-center text-gray active:bg-white/10"><Icon name="close" size={17} /></button>
          </div>
        )}

        {emojiOpen && (
          <div className="glass rounded-[22px] mb-2 grid grid-cols-8 gap-1 px-3 py-2" style={{ background: 'rgba(13,21,17,.97)' }}>
          {PICKER.map(e => <button key={e} onClick={() => insertEmojiChar(e)} className="py-1 flex justify-center active:scale-125 transition-transform"><Emo e={e} size={26} /></button>)}
        </div>
      )}

        {attachOpen && (
          <div className="glass rounded-[22px] mb-2 p-2.5 flex flex-col gap-2" style={{ background: 'rgba(13,21,17,.97)' }}>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileInput.current?.click()} className="h-[68px] rounded-[16px] bg-white/[.06] active:bg-white/10 flex flex-col items-center justify-center gap-1.5 text-[13px] font-medium text-fg">
                <span className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: 'rgba(23,229,132,.16)', color: '#17E584' }}><IcPhoto s={19} /></span>Прикрепить
              </button>
              <button onClick={() => { setAttachOpen(false); setPollOpen(true) }} className="h-[68px] rounded-[16px] bg-white/[.06] active:bg-white/10 flex flex-col items-center justify-center gap-1.5 text-[13px] font-medium text-fg">
                <span className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: 'rgba(245,194,90,.16)', color: '#F5C25A' }}><Icon name="rating" size={19} accent="current" /></span>Опрос
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOnceOn(v => !v)} className={`flex-1 h-9 rounded-full text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 ${onceOn ? 'bg-green/[.18] text-[#7DF0B6]' : 'bg-white/[.06] text-gray'}`}>
                <IcEye s={15} /> Просмотр 1 раз{onceOn ? ' · вкл' : ''}
              </button>
              <button onClick={() => setTtlSec(s => { const i = TTL_STEPS.indexOf(s); return TTL_STEPS[(i + 1) % TTL_STEPS.length] })}
                className={`flex-1 h-9 rounded-full text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 ${ttlSec ? 'bg-green/[.18] text-[#7DF0B6]' : 'bg-white/[.06] text-gray'}`}>
                <IcTimer s={15} /> Таймер: {ttlLabel(ttlSec)}
              </button>
            </div>
          </div>
        )}

        {stickerOpen && (
          <div className="glass rounded-[22px] mb-2 flex flex-col overflow-hidden" style={{ height: '46vh', background: 'rgba(13,21,17,.97)' }}>
          {/* верхние вкладки: Эмодзи / Стикеры / GIF — как в Telegram */}
          <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 shrink-0 border-b border-white/[.06]">
            {([['emoji', 'Эмодзи'], ['stickers', 'Стикеры'], ['gif', 'GIF']] as const).map(([k, lab]) => {
              const active = k === 'emoji' ? stickerTab === 'emoji' : k === 'stickers' ? (stickerTab !== 'emoji' && stickerTab !== '__gif__') : stickerTab === '__gif__'
              return (
                <button key={k} onClick={() => {
                  if (k === 'emoji') setStickerTab('emoji')
                  else if (k === 'stickers') setStickerTab(stickerPacks[0]?.name || '__st__')
                  else if (gifEnabled) { setStickerTab('__gif__'); if (!gifs.length) loadGifs('') }
                  else flash('GIF сейчас недоступны')
                }} className={`h-8 px-3.5 rounded-full text-[13.5px] font-semibold transition-colors ${active ? 'bg-white/10 text-fg' : 'text-gray'}`}>
                  {lab}
                </button>
              )
            })}
            <button onClick={() => setStickerOpen(false)} aria-label="Закрыть" className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray active:bg-white/10"><Icon name="close" size={16} /></button>
          </div>

          {/* GIF: строка поиска вместо добавления набора */}
          {stickerTab === '__gif__' && (
            <div className="px-2 py-1.5 shrink-0">
              <div className="flex items-center gap-2 h-9 px-3.5 rounded-full bg-white/[.06] border border-white/[.08] text-gray">
                <Icon name="search" size={16} />
                <input value={gifQuery} onChange={e => setGifQuery(e.target.value)} placeholder="Поиск GIF"
                  className="flex-1 min-w-0 bg-transparent text-[16px] text-fg placeholder:text-gray2 outline-none"
                  style={{ WebkitUserSelect: 'text', userSelect: 'text' }} />
              </div>
            </div>
          )}

          {/* строка добавления своего пака */}
          <div className={`flex gap-2 px-2 py-1.5 shrink-0 ${stickerTab === '__gif__' ? 'hidden' : ''}`}>
            <input value={addPackLink} onChange={e => setAddPackLink(e.target.value)} placeholder="Ссылка на набор: t.me/addemoji/… или t.me/addstickers/…"
              className="flex-1 min-w-0 h-9 px-3.5 rounded-full text-[16px] text-fg placeholder:text-gray2 outline-none bg-white/[.06] border border-white/[.08]"
              style={{ WebkitUserSelect: 'text', userSelect: 'text' }} />
            <button onClick={addPack} disabled={packBusy} aria-label="Добавить пак" className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 bg-green/[.18] text-green shrink-0">
              {packBusy ? '…' : <Icon name="plus" size={17} />}
            </button>
          </div>

          {/* контент */}
          <div ref={stScrollRef} className="flex-1 overflow-y-auto px-2 pb-2" style={{ overscrollBehavior: 'contain' }}>
            {stickerTab === '__gif__' ? (
              gifLoading && gifs.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-gray">Загрузка…</div>
              ) : gifs.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-gray">Ничего не найдено. Попробуйте другое слово.</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    {gifs.map(g => (
                      <button key={g.id} onClick={() => sendGif(g.send)} className="rounded-[12px] overflow-hidden active:opacity-70 bg-white/[.05]">
                        <img src={g.preview} alt="" className="w-full h-24 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray2 text-center mt-2">Powered by GIPHY</div>
                </>
              )
            ) : stickerTab === 'emoji' ? (
              <>
                {recentEmoji.length > 0 && (
                  <div className="mb-2">
                    <div className="px-1 py-1.5 text-[12.5px] font-semibold text-[#CFDAD4]">Недавние</div>
                    <div className="grid grid-cols-8 gap-0.5">
                      {recentEmoji.map(ch => (
                        <button key={ch} onClick={() => pickEmoji(ch)} className="aspect-square flex items-center justify-center rounded-[10px] active:bg-white/10">
                          <Emo e={ch} size={30} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {EMOJI_CATS.map((c, ci) => (
                  <div key={c.title} id={`ecat_${ci}`} className="mb-2">
                    <div className="px-1 py-1.5 text-[12.5px] font-semibold text-[#CFDAD4] sticky top-0 z-10" style={{ background: '#0E1612' }}>{c.title}</div>
                    <div className="grid grid-cols-8 gap-0.5">
                      {c.codes.map(code => (
                        <button key={code} onClick={() => pickEmoji(codeToChar(code))} className="aspect-square flex items-center justify-center rounded-[10px] active:bg-white/10">
                          <img src={EMOJI_CDN + code + '.png'} alt="" width={30} height={30} loading="lazy" decoding="async" draggable={false} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {emojiPacks.map(p => (
                  <div key={p.name} id={`pk_${p.name}`} className="mb-3">
                    <div className="flex items-center gap-2 px-1 py-1.5 sticky top-0 z-10" style={{ background: '#0E1612' }}>
                      <span className="text-[12.5px] font-semibold text-[#CFDAD4] truncate flex-1">{p.title}</span>
                      <button onClick={() => removePack(p.name)} className="shrink-0 text-[11.5px] font-medium px-2.5 py-0.5 rounded-full text-[#FF8A8A] bg-[#FF5050]/10">Удалить</button>
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
                ))}
              </>
            ) : stickerPacks.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-gray px-6 leading-relaxed">Паков пока нет. Вставьте сверху ссылку <b className="text-green font-semibold">t.me/addstickers/…</b> или <b className="text-green font-semibold">t.me/addemoji/…</b> и нажмите «+»: добавится стикерпак или анимированные эмодзи из Telegram.</div>
            ) : (
              stickerPacks.map(p => (
                <div key={p.name} id={`pk_${p.name}`} className="mb-3">
                  <div className="flex items-center gap-2 px-1 py-1.5 sticky top-0 z-10" style={{ background: '#0E1612' }}>
                    <span className="text-[12.5px] font-semibold text-[#CFDAD4] truncate flex-1">{p.title}</span>
                    <button onClick={() => removePack(p.name)} className="shrink-0 text-[11.5px] font-medium px-2.5 py-0.5 rounded-full text-[#FF8A8A] bg-[#FF5050]/10">Удалить</button>
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
          <div className={`flex items-center gap-1 px-2 py-1.5 overflow-x-auto shrink-0 border-t border-white/[.06] ${stickerTab === '__gif__' ? 'hidden' : ''}`}>
            <button onClick={() => setStickerTab('emoji')} aria-label="Эмодзи" className={`shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center ${stickerTab === 'emoji' ? 'bg-white/10 text-fg' : 'text-gray'}`}>
              <Icon name="emoji" size={19} /></button>
            {stickerTab === 'emoji' && ['1f600', '1f44b', '1f43b', '1f354', '26bd', '2708-fe0f', '1f4a1', '2764-fe0f', '1f3c1'].map((code, ci) => (
              <button key={code} onClick={() => document.getElementById(`ecat_${ci}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                aria-label={EMOJI_CATS[ci]?.title} className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center active:bg-white/10 opacity-80">
                <img src={EMOJI_CDN + code + '.png'} alt="" width={22} height={22} loading="lazy" draggable={false} />
              </button>
            ))}
            {packs.map(p => {
              const th = p.stickers[0]   // первый стикер пака как иконка — понятно, что это
              const on = p.emoji ? false : stickerTab === p.name
              return (
                <button key={p.name} onClick={() => { setStickerTab(p.emoji ? 'emoji' : p.name); setTimeout(() => document.getElementById(`pk_${p.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
                  className={`shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden ${on ? 'bg-white/10' : ''}`}>
                  {th
                    ? (th.kind === 'video'
                      ? <video src={api.chatStickerUrl(th.fid, 'video')} autoPlay loop muted playsInline className="w-7 h-7 object-contain" />
                      : th.kind === 'animated'
                        ? <LottieSticker url={api.chatStickerUrl(th.fid, 'animated')} size={28} />
                        : <img src={api.chatStickerUrl(th.fid, 'image')} alt="" loading="lazy" className="w-7 h-7 object-contain" />)
                    : <span className="text-[11px] font-semibold text-[#CFDAD4]">{p.title.replace('@', '').slice(0, 2).toUpperCase()}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}



        <div className="relative flex items-end gap-1.5 p-[6px] rounded-[30px] glass"
          style={{
            background: 'radial-gradient(60% 120% at 100% 50%, rgba(23,229,132,.10), transparent 70%), radial-gradient(50% 120% at 0% 50%, rgba(118,87,255,.10), transparent 70%), linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.02)), rgba(13,21,17,.93)',
            border: '1px solid rgba(255,255,255,.14)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.16), 0 14px 34px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.35)',
          }}>
          {rec ? (
            /* индикатор записи голосового */
            <div className="flex-1 min-w-0 flex items-center gap-2.5 rounded-[24px] px-3" style={{ background: recCancel ? 'rgba(255,80,80,.12)' : 'transparent', height: 46, transition: 'background .2s' }}>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: '#ff5050', opacity: .55 }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#ff5050' }} />
              </span>
              <span className="text-[15px] text-fg tabular-nums shrink-0">{fmtDur(recElapsed)}</span>
              <div className="flex-1 flex items-center justify-center gap-[3px] h-5 overflow-hidden min-w-0 mx-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span key={i} className="vbar" style={{ width: 2.5, borderRadius: 2, background: recCancel ? '#FF8A8A' : '#17E584', animationDelay: `${((i * 7) % 24) * 0.045}s` }} />
                ))}
              </div>
              <span className="text-[12px] shrink-0" style={{ color: recCancel ? '#FF8A8A' : '#A6B8AE' }}>{recLocked ? (recKind === 'round' ? 'кружок' : 'без рук') : recCancel ? 'отпустите — отмена' : '‹ влево — отмена'}</span>
              <button onClick={cancelRec} className="w-8 h-8 rounded-full flex items-center justify-center text-[#FF8A8A] active:bg-white/10 shrink-0" aria-label="Отмена"><Icon name="close" size={16} /></button>
            </div>
          ) : (
            /* скрепка · текст · смайлик — как в Telegram */
            <div className="flex-1 flex items-end min-w-0 px-1">
              <button onClick={() => { setAttachOpen(v => !v); setEmojiOpen(false) }} aria-label="Вложение"
                className="shrink-0 w-[38px] h-[46px] flex items-center justify-center rounded-full active:opacity-70" style={{ color: attachOpen ? '#17E584' : '#CFDAD4' }}>
                <Icon name="attach" size={23} style={{ transform: 'rotate(40deg)' }} />
              </button>
              <div className="flex-1 relative min-w-0 px-1">
                {!text && <div className="absolute left-1 top-[12px] text-[16px] text-[#8FA398] pointer-events-none select-none">Сообщение</div>}
                <div ref={taRef} contentEditable suppressContentEditableWarning
                  onInput={onEditorInput}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  onPaste={e => { e.preventDefault(); insertTextAtCaret(e.clipboardData.getData('text/plain')) }}
                  className="text-[16px] text-fg outline-none max-h-28 overflow-y-auto leading-[1.4] whitespace-pre-wrap break-words"
                  style={{ WebkitUserSelect: 'text', userSelect: 'text', wordBreak: 'break-word', paddingTop: 12, paddingBottom: 12, minHeight: 22 }} />
              </div>
              <button onClick={() => { setAttachOpen(false); setEmojiOpen(false); if (stickerOpen) setStickerOpen(false); else openSticker() }} aria-label="Эмодзи и стикеры"
                className="shrink-0 w-[38px] h-[46px] flex items-center justify-center rounded-full active:scale-90 transition-transform" style={{ color: stickerOpen ? '#17E584' : '#CFDAD4' }}>
                <Icon name="emoji" size={23} />
              </button>
            </div>
          )}
          {text.trim() && !rec ? (
            <button onClick={send} disabled={sending} aria-label="Отправить" className="shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center disabled:opacity-50 active:scale-90 transition-transform"
              style={{ background: 'radial-gradient(120% 120% at 30% 20%, #2BD98A 0%, #0FB866 45%, #088A4A 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.32), inset 0 -2px 4px rgba(0,50,25,.45), 0 0 0 1px rgba(6,110,58,.9), 0 6px 16px rgba(8,138,74,.35)', color: '#021A0C' }}>
              <Icon name="send" size={20} accent="#021A0C" style={{ transform: 'translate(-1px,1px)' }} />
            </button>
          ) : (
            recLocked ? (
            <button onClick={stopRec} aria-label="Отправить" className="shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'radial-gradient(120% 120% at 30% 20%, #2BD98A 0%, #0FB866 45%, #088A4A 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.32), 0 0 0 1px rgba(6,110,58,.9), 0 6px 16px rgba(8,138,74,.35)', color: '#021A0C' }}>
              <Icon name="send" size={20} accent="#021A0C" style={{ transform: 'translate(-1px,1px)' }} />
            </button>
            ) : (
            <div className="relative shrink-0">
            {rec && (
              /* замок: потяни вверх — запись без рук */
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[58px] w-[38px] rounded-full flex flex-col items-center justify-start pt-2 gap-1 glass pointer-events-none"
                style={{ height: 78 - lockHint * 24, color: '#CFDAD4' }}>
                <Icon name="lock" size={17} accent="current" />
                <Icon name="chevD" size={14} style={{ transform: 'rotate(180deg)', opacity: 1 - lockHint }} />
              </div>
            )}
            <button onMouseDown={(e) => {
                if (Date.now() - lastMouseTouch.current < 900) return   // эмуляция мыши после касания
                pressDown(e.clientX, e.clientY)
                // мышью можно уйти с кнопки (вверх — замок, влево — отмена) — слушаем окно
                const mv = (ev: MouseEvent) => pressMove(ev.clientX, ev.clientY)
                const upH = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', upH); pressUp() }
                window.addEventListener('mousemove', mv); window.addEventListener('mouseup', upH)
              }}
              onTouchStart={(e) => { e.preventDefault(); lastMouseTouch.current = Date.now(); pressDown(e.touches[0].clientX, e.touches[0].clientY) }}
              onTouchMove={(e) => { lastMouseTouch.current = Date.now(); pressMove(e.touches[0].clientX, e.touches[0].clientY) }}
              onTouchEnd={(e) => { e.preventDefault(); lastMouseTouch.current = Date.now(); pressUp() }}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={recMode === 'round' ? 'Видеосообщение' : 'Голосовое сообщение'}
              className="shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={rec
                ? { background: '#ff5050', color: '#fff' }
                : { background: 'radial-gradient(120% 120% at 30% 20%, #2BD98A 0%, #0FB866 45%, #088A4A 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.32), inset 0 -2px 4px rgba(0,50,25,.45), 0 0 0 1px rgba(6,110,58,.9), 0 6px 16px rgba(8,138,74,.35)', color: '#021A0C' }}>
              <motion.span key={recMode} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} className="flex">
                <Icon name={recMode === 'round' ? 'video' : 'mic'} size={21} accent={rec ? '#fff' : '#021A0C'} />
              </motion.span>
            </button>
            </div>
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {packSheet && (
          <motion.div className="fixed inset-0 z-[72] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPackSheet(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="w-full max-w-[520px] rounded-t-[26px] flex flex-col" style={{ background: '#0F1A15', borderTop: '1px solid rgba(255,255,255,.08)', maxHeight: '72vh', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 14px)' }}>
              <div className="self-center w-10 h-1 rounded-full bg-white/15 mt-2.5" />
              {packSheet.loading || !packSheet.pack ? (
                <div className="py-14 text-center text-[14px] text-gray">Загружаем набор…</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 pt-3 pb-3">
                    <span className="tile-violet w-10 h-10 rounded-[12px] shrink-0"><Icon name={packSheet.pack.emoji ? 'emoji' : 'sticker'} size={20} accent="#fff" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-[15px] text-fg truncate">{packSheet.pack.title}</div>
                      <div className="text-[12.5px] text-gray tabular-nums">{packSheet.pack.emoji ? 'Эмодзи' : 'Стикеры'} · {packSheet.pack.stickers.length} · нажмите, чтобы {packSheet.pack.emoji ? 'вставить в сообщение' : 'отправить'}</div>
                    </div>
                    <button onClick={() => setPackSheet(null)} aria-label="Закрыть" className="w-9 h-9 rounded-full flex items-center justify-center text-gray active:bg-white/10 shrink-0"><Icon name="close" size={18} /></button>
                  </div>
                  <div ref={packScrollRef} className={`flex-1 overflow-y-auto px-3 grid gap-1 ${packSheet.pack.emoji ? 'grid-cols-8' : 'grid-cols-5'}`}>
                    {packSheet.pack.stickers.map((st, i) => {
                      const url = api.chatStickerUrl(st.fid, st.kind)
                      const sz = packSheet.pack!.emoji ? 34 : 64
                      return (
                        <button key={i} onClick={() => useFromSheet(st)} className="aspect-square flex items-center justify-center rounded-[10px] active:bg-white/10 overflow-hidden">
                          <InView rootRef={packScrollRef}>
                            {st.kind === 'animated' ? <LottieSticker url={url} size={sz} />
                              : st.kind === 'video' ? <video src={url} autoPlay loop muted playsInline style={{ width: sz, height: sz, objectFit: 'contain' }} />
                                : <img src={url} alt={st.emoji} loading="lazy" style={{ width: sz, height: sz, objectFit: 'contain' }} />}
                          </InView>
                        </button>
                      )
                    })}
                  </div>
                  <div className="px-4 pt-3">
                    {packSheet.added
                      ? <div className="btn-secondary w-full text-gray"><Icon name="check" size={18} />Набор уже у вас</div>
                      : <button onClick={addPackFromSheet} className="btn-primary w-full">Добавить {packSheet.pack.emoji ? 'эмодзи' : 'стикеры'} · {packSheet.pack.stickers.length}</button>}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInput} type="file" multiple hidden onChange={onPickAny} />

      <AnimatePresence>
        {viewerG && (
          <MediaViewer items={viewerG.items} start={viewerG.start} onClose={() => setViewerG(null)}
            canDelete={(it) => !!it.mine || isAdmin} onDelete={(id) => del(id)} />
        )}
        {galleryOpen && (
          <MediaGallery title={topics.find(t => t.id === topic)?.title || 'Чат'} onClose={() => setGalleryOpen(false)}
            onView={(items, start) => setViewerG({ items, start })} onJump={(id) => { setGalleryOpen(false); jumpToMsg(id) }} />
        )}
        {pollOpen && (
          <PollComposer onClose={() => setPollOpen(false)} onSent={async (err) => {
            if (err) { flash(err); return }
            setPollOpen(false); const fresh = await api.chat(lastId.current || undefined); merge(fresh.messages); scrollToBottom()
          }} />
        )}
        {quoteFor && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuoteFor(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-[460px] rounded-t-[28px] p-5 bg-s1 border-t border-white/[.08]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 22px)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-white/15" />
              <div className="font-display font-semibold text-[16px] text-fg">Цитата</div>
              <div className="text-[12.5px] text-gray mb-3">Выдели нужный фрагмент и нажми «Ответить с цитатой»</div>
              <div id="quote-src" className="max-h-[40vh] overflow-y-auto rounded-[14px] p-3 bg-white/[.05] text-[15px] leading-[1.45] text-fg whitespace-pre-wrap"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{stripTokens(quoteFor.text)}</div>
              <button onClick={() => {
                  const sel = window.getSelection(); const box = document.getElementById('quote-src')
                  let q = sel && !sel.isCollapsed && box?.contains(sel.anchorNode) ? sel.toString().trim() : ''
                  if (!q) q = stripTokens(quoteFor.text).slice(0, 300)
                  const m0 = quoteFor; setQuoteFor(null); startReply(m0); setReplyQuote(q.slice(0, 300))
                }} className="btn-primary w-full h-12 mt-4 text-[15px]">Ответить с цитатой</button>
            </motion.div>
          </motion.div>
        )}
        {fwdFor && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFwdFor(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-[460px] rounded-t-[28px] p-5 bg-s1 border-t border-white/[.08]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 22px)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-white/15" />
              <div className="font-display font-semibold text-[16px] text-fg mb-3">Переслать в тему</div>
              <div className="flex flex-col">
                {topics.map(t => (
                  <button key={t.id} onClick={() => forwardTo(fwdFor, t)} className="flex items-center gap-3 py-2.5 px-1 rounded-[12px] active:bg-white/[.05] text-left">
                    <span className="tile-violet w-9 h-9 rounded-[11px] shrink-0"><Icon name="chat" size={16} accent="#fff" /></span>
                    <span className="flex-1 text-[14.5px] font-medium text-fg">{t.title}{t.id === topic && <span className="text-gray font-normal"> · текущая</span>}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => shareToTelegram(fwdFor)} className="btn-secondary w-full h-11 mt-3 text-[14px] flex items-center justify-center gap-2">
                <Icon name="send" size={16} accent="current" /> Отправить в Telegram
              </button>
            </motion.div>
          </motion.div>
        )}
        {menuFor && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center px-4" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuFor(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 24, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: .97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="w-full max-w-[290px] flex flex-col gap-2">
              {/* реакции — плавающая пилюля */}
              <div className="glass flex justify-around items-center px-1 py-1 rounded-full">
                {QUICK.map(e => <button key={e} onClick={() => react(menuFor.id, e)} className="w-9 h-9 flex items-center justify-center rounded-full active:scale-125 transition-transform"><Emo e={e} size={26} /></button>)}
              </div>
              {/* действия — компактная карточка */}
              <div className="glass rounded-[18px] overflow-hidden" style={{ background: 'rgba(17,28,23,.94)' }}>
                <button onClick={() => startReply(menuFor)} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><IcReply s={16} />Ответить</button>
                {menuFor.type === 'text' && menuFor.text.length > 20 && (<><div className="h-px bg-white/[.06]" /><button onClick={() => { setQuoteFor(menuFor); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><Icon name="text" size={16} />Цитировать часть</button></>)}
                {(menuFor.type === 'text' || menuFor.type === 'poll') && (<><div className="h-px bg-white/[.06]" /><button onClick={() => copyMsg(menuFor)} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><Icon name="copy" size={16} />Копировать</button></>)}
                {!menuFor.once && menuFor.type !== 'poll' && (<><div className="h-px bg-white/[.06]" /><button onClick={() => { setFwdFor(menuFor); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><Icon name="arrowR" size={16} />Переслать</button></>)}
                <div className="h-px bg-white/[.06]" /><button onClick={() => { setSelectMode(true); setSelected(new Set([menuFor.id])); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><Icon name="checkCircle" size={16} />Выбрать</button>
                {menuFor.type === 'sticker' && menuFor.has_media && (<><div className="h-px bg-white/[.06]" /><button onClick={() => openPackOf({ msg: menuFor.id })} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><Icon name="sticker" size={16} />Набор стикеров</button></>)}
                {!menuFor.mine && (<><div className="h-px bg-white/[.06]" /><button onClick={() => { setProfileFor(menuFor.user_id); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><IcUser s={16} />Профиль автора</button></>)}
                {menuFor.mine && menuFor.type === 'text' && (<><div className="h-px bg-white/[.06]" /><button onClick={() => startEdit(menuFor)} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><IcEdit s={16} />Редактировать</button></>)}
                {isAdmin && (<><div className="h-px bg-white/[.06]" /><button onClick={() => pin(menuFor.id)} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium active:bg-white/[.06]" style={{ color: VIOLET }}><IcPin s={16} />Закрепить</button></>)}
                {!menuFor.mine && !menuFor.deleted && (<><div className="h-px bg-white/[.06]" /><button onClick={async () => { const id = menuFor.id; setMenuFor(null); try { const r = await api.chatReport(id); flash(r.hidden ? 'Сообщение скрыто до проверки' : 'Жалоба отправлена модераторам') } catch { flash('Не удалось отправить жалобу') } }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-fg active:bg-white/[.06]"><Icon name="flag" size={16} />Пожаловаться</button></>)}
                {isAdmin && !menuFor.mine && (<><div className="h-px bg-white/[.06]" /><button onClick={() => { setMuteFor({ id: menuFor.user_id, name: menuFor.name }); setMutePurge(false); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium text-[#FFB25B] active:bg-white/[.06]"><Icon name="lock" size={16} />Замутить автора</button></>)}
                {(menuFor.mine || isAdmin) && (<><div className="h-px bg-white/[.06]" /><button onClick={() => { del(menuFor.id); setMenuFor(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-[14.5px] font-medium active:bg-white/[.06]" style={{ color: '#FF7A7A' }}><IcTrash s={16} />Удалить</button></>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileFor != null && <ProfileCard uid={profileFor} onClose={() => setProfileFor(null)} onMention={insertMention} />}
      </AnimatePresence>

      <AnimatePresence>
        {rec && recKind === 'round' && (
          <motion.div className="fixed inset-0 z-[55] flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(4,10,7,.62)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', paddingBottom: 120 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: recCancel ? 0.86 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative" style={{ width: 'min(72vw, 300px)', height: 'min(72vw, 300px)' }}>
              {!camReady && <span className="absolute inset-0 grid place-items-center z-10 text-[13px] text-white/70">Камера включается…</span>}
              <video ref={camPreview} muted playsInline autoPlay className="w-full h-full rounded-full object-cover bg-black"
                style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined, opacity: recCancel ? 0.55 : 1, transition: 'opacity .2s' }} />
              <svg className="absolute -inset-[6px]" viewBox="0 0 100 100" style={{ width: 'calc(100% + 12px)', height: 'calc(100% + 12px)', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.6" />
                <circle cx="50" cy="50" r="48.5" fill="none" stroke={recCancel ? '#FF8A8A' : '#ff5050'} strokeWidth="1.6" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 48.5} strokeDashoffset={2 * Math.PI * 48.5 * (1 - Math.min(1, recElapsed / 60))}
                  style={{ transition: 'stroke-dashoffset .25s linear' }} />
              </svg>
            </motion.div>
            <div className="mt-5 flex items-center gap-2 text-[14px] text-white/90 tabular-nums">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff5050' }} />
              {fmtDur(recElapsed)} / 1:00
            </div>
            <div className="mt-5 flex items-center gap-3 pointer-events-auto">
              {recLocked && <button onClick={cancelRec} className="h-11 px-5 rounded-full text-[14px] font-semibold text-[#FF8A8A] bg-white/[.08] active:bg-white/[.14]">Отмена</button>}
              <button onClick={flipCam} onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); flipCam() }} aria-label="Сменить камеру"
                className="h-11 px-4 rounded-full flex items-center gap-2 text-[13.5px] font-medium text-white bg-white/[.1] active:bg-white/[.18]">
                <Icon name="refresh" size={18} accent="current" />{facing === 'user' ? 'Фронтальная' : 'Основная'}
              </button>
            </div>
          </motion.div>
        )}
        {onlineList && (
          <motion.div className="fixed inset-0 z-[72] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.55)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOnlineList(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-[460px] rounded-t-[28px] pt-3 px-4 bg-s1 border-t border-white/[.08] max-h-[70vh] flex flex-col"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-white/15" />
              <div className="font-display font-semibold text-[16px] text-fg mb-2">Сейчас в чате · {onlineList.length || online}</div>
              <div className="overflow-y-auto no-scrollbar -mx-1">
                {onlineList.length === 0 && <div className="py-6 text-center text-[13px] text-gray">Загрузка…</div>}
                {onlineList.map(u => (
                  <button key={u.user_id} onClick={() => { setOnlineList(null); setProfileFor(u.user_id) }}
                    className="w-full flex items-center gap-3 px-1 py-2 rounded-[12px] active:bg-white/[.05] text-left">
                    <Avatar name={u.name} src={api.chatAvatarUrl(u.user_id)} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-fg truncate">{u.name}<NameBadges m={u} /></span>
                      <span className="block text-[12px] text-gray truncate">{u.admin ? 'Администратор' : (u.username ? '@' + u.username : u.rank)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
        {muteFor && (
          <motion.div className="fixed inset-0 z-[72] flex items-end justify-center px-4" style={{ background: 'rgba(0,0,0,.55)', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMuteFor(null)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
              className="w-full max-w-[340px] rounded-[20px] p-4" style={{ background: 'rgba(17,28,23,.98)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div className="font-display font-semibold text-[15px] mb-1">Замутить {muteFor.name}</div>
              <div className="text-[12.5px] text-gray mb-3">Не сможет писать в чат. Получит сообщение от бота.</div>
              <div className="grid grid-cols-2 gap-2">
                {([[60, '1 час'], [1440, '24 часа'], [10080, '7 дней'], [0, 'Навсегда']] as const).map(([m, l]) => (
                  <button key={l} onClick={async () => { const u = muteFor; setMuteFor(null); try { await api.chatMute(u.id, m, '', mutePurge); flash(`${u.name}: мут ${l.toLowerCase()}`) } catch { flash('Не удалось') } }}
                    className={`h-11 rounded-[14px] text-[14px] font-semibold ${m === 0 ? 'text-white' : 'text-fg bg-white/[.07]'}`} style={m === 0 ? { background: '#E5484D' } : undefined}>{l}</button>
                ))}
              </div>
              <button onClick={() => setMutePurge(v => !v)} className="mt-3 w-full flex items-center gap-2.5 text-[13px] text-gray">
                <span className={`w-5 h-5 rounded-[6px] border grid place-items-center ${mutePurge ? 'bg-green border-green text-ink' : 'border-white/25'}`}>{mutePurge && <Icon name="check" size={13} strokeWidth={2.6} />}</span>
                Удалить его сообщения за последние сутки
              </button>
            </motion.div>
          </motion.div>
        )}
        {retOpen && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRetOpen(false)}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-[460px] rounded-t-[28px] p-5 bg-s1 border-t border-white/[.08]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 28px)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-white/15" />
              <div className="font-display font-semibold text-[16px] text-fg mb-1">Хранение сообщений</div>
              <div className="text-[13px] text-gray mb-4 leading-relaxed">Сообщения старше выбранного срока удаляются автоматически — вместе с их медиа. Применяется ко всем участникам.</div>
              <div className="grid grid-cols-3 gap-2">
                {([['7', '7 дней'], ['14', '14 дней'], ['30', '30 дней'], ['90', '90 дней'], ['180', '180 дней'], ['0', 'Не удалять']] as const).map(([v, lab]) => {
                  const n = Number(v); const on = retDays === n
                  return (
                    <button key={v} onClick={async () => {
                      try { const r = await api.chatSetRetention(n); if (r.ok) { setRetDays(r.days ?? n); flash('Срок хранения обновлён') } else flash('Не удалось') }
                      catch { flash('Не удалось') }
                      setRetOpen(false)
                    }}
                      className={`h-11 rounded-[14px] text-[13.5px] font-medium transition-colors ${on ? 'bg-green/[.18] text-[#7DF0B6]' : 'bg-white/[.06] text-[#CFDAD4]'}`}>
                      {lab}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setRetOpen(false)} className="btn-secondary w-full mt-4 text-[14px]">Закрыть</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewer && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.94)', touchAction: 'none' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewer(null)}
            // смахивание фото/видео вверх или вниз закрывает только просмотр, а не миниапп
            onTouchStart={(e) => { vSwipe.current = { y: e.touches[0].clientY, dy: 0 } }}
            onTouchMove={(e) => {
              const st = vSwipe.current; if (!st) return
              st.dy = e.touches[0].clientY - st.y
              const el = e.currentTarget as HTMLElement
              el.style.transition = 'none'
              const media = el.querySelector('img,video') as HTMLElement | null
              if (media) { media.style.transition = 'none'; media.style.transform = `translateY(${st.dy}px)` }
              el.style.background = `rgba(0,0,0,${Math.max(0.35, 0.94 - Math.abs(st.dy) / 500)})`
            }}
            onTouchEnd={(e) => {
              const st = vSwipe.current; vSwipe.current = null; if (!st) return
              const el = e.currentTarget as HTMLElement
              if (Math.abs(st.dy) > 90) { setViewer(null); return }
              const media = el.querySelector('img,video') as HTMLElement | null
              if (media) { media.style.transition = 'transform .2s ease'; media.style.transform = '' }
              el.style.background = 'rgba(0,0,0,.94)'
            }}>
            {/* верхняя панель: закрыть + удалить (для своих/админа) */}
            <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewer(null)} aria-label="Закрыть" className="w-10 h-10 rounded-full flex items-center justify-center text-white glass"><Icon name="close" size={18} /></button>
              {(viewer.mine || isAdmin) && viewer.id != null && (
                <button onClick={() => { del(viewer.id!); setViewer(null) }} className="ml-auto px-4 h-10 rounded-full flex items-center gap-2 text-[13.5px] font-medium text-white" style={{ background: 'rgba(220,60,60,.9)' }}><Icon name="trash" size={17} /> Удалить</button>
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
            <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-white/[.08]">
              {FILTERS.map((f, i) => (
                <button key={f.name} onClick={() => setFilterIdx(i)} className={`chip ${filterIdx === i ? 'on' : ''}`}>
                  {f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-3 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,10px) + 12px)' }}>
              <button onClick={() => { URL.revokeObjectURL(photoEdit.url); setPhotoEdit(null) }} className="btn-secondary px-5 text-[14px]">Отмена</button>
              <button onClick={sendEditedPhoto} className="btn-primary flex-1">Отправить</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
