import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, giveawayAssetUrl } from '../api/client'

// ================================================================
//  Case002 — расследование из 7 этапов.
//  Ответы задаются в .env на сервере (GIVEAWAY_CODE_1..7, по порядку).
//  Медиа (видео/фото) лежат на сервере и отдаются через /api/giveaway/asset.
//  Подсказки платные — 1 USDT за подсказку через CryptoBot (логика на сервере).
// ================================================================
const SECRET_OFFER = 'Ты прошёл Case002 до конца. Приз — 40 USDT. Напиши контакт ниже и отправь скриншот этого экрана, чтобы получить приз.'
const ADMIN_TG     = 'S010lvloon'   // контакт для выдачи приза
const CASE_TITLE   = 'Case002'
const SITE_URL     = 'https://case2.s010lvloon.com'  // сайт этапа 2 (SQLi/IDOR)
// ================================================================

const LS_KEY   = 'case002_lvl'
const DONE_KEY = 'case002_done'
const tgApp  = (window as any).Telegram?.WebApp

function getLevel()           { return parseInt(localStorage.getItem(LS_KEY) || '0', 10) }
function saveLevel(n: number) { localStorage.setItem(LS_KEY, String(n)) }
function isDone()             { return localStorage.getItem(DONE_KEY) === '1' }
function markDone()           { localStorage.setItem(DONE_KEY, '1') }

function openPay(url: string) {
  if (url.includes('t.me') && tgApp?.openTelegramLink) tgApp.openTelegramLink(url)
  else if (tgApp?.openLink) tgApp.openLink(url)
  else window.open(url, '_blank')
}

// ---------- stage content ----------

type TermLine = { tag: string; color: string; text: string }
type Media    = { type: 'video' | 'image'; file: string }
type StageLink = { url: string; title: string; hint: string }

type Stage = {
  file: string
  lines: TermLine[]
  placeholder: string
  media?: Media[]
  link?: StageLink
}

const C = { blue: '#60A5FA', amber: '#FBBF24', green: '#22C55E' }

// Этапы Case002 (индекс 0 = этап 1). Серверный номер этапа = индекс + 1.
const STAGES: Stage[] = [
  {
    file: 'case_002/brief_01.txt',
    lines: [
      { tag: 'CASE', color: C.blue,  text: '002 — дверь первая' },
      { tag: 'MSG',  color: C.amber, text: 'Смотри внимательно. Здесь всё не случайно.' },
    ],
    placeholder: 'кодовое слово (рус)',
    media: [{ type: 'video', file: 'video.mp4' }],  // фото НЕ показываем — ищут в Базе
  },
  {
    file: 'case_002/brief_02.txt',
    lines: [
      { tag: 'TARGET', color: C.blue, text: 'Личный кабинет — по ссылке ниже.' },
    ],
    placeholder: 'секрет из кабинета (рус)',
    media: [{ type: 'video', file: 'video.mp4' }],
    link: { url: SITE_URL, title: 'Открыть сайт цели', hint: '// войди и достань секрет' },
  },
  {
    file: 'case_002/brief_03.txt',
    lines: [
      { tag: 'MSG',  color: C.blue,  text: 'Соломония.' },
      { tag: 'TASK', color: C.amber, text: 'Найди ответ.' },
    ],
    placeholder: 'два слова (рус)',
    media: [{ type: 'video', file: 'video.mov' }],
  },
  {
    file: 'case_002/brief_04.txt',
    lines: [
      { tag: 'TASK', color: C.blue,  text: 'Найди город, который дублируется на Google картах.' },
    ],
    placeholder: 'название города (рус)',
  },
  {
    file: 'case_002/brief_05.txt',
    lines: [
      { tag: 'MSG',  color: C.blue,  text: 'Найди нас.' },
    ],
    placeholder: 'одно слово (рус)',
    media: [{ type: 'image', file: 'photo.png' }],
  },
  {
    file: 'case_002/brief_06.txt',
    lines: [
      { tag: 'MSG',    color: C.blue,  text: 'Эх, чего-то не хватает.' },
      { tag: 'CIPHER', color: C.amber, text: 'Шифр без ключа бессмысленный.' },
    ],
    placeholder: 'имя (рус)',
    media: [{ type: 'image', file: 'cipher.png' }],
  },
  {
    file: 'case_002/brief_07.txt',
    lines: [
      { tag: 'FINAL', color: C.blue,  text: 'Печать Семи Дверей' },
      { tag: 'MSG',   color: C.amber, text: 'Шесть имён ты добыл в пути — каждое стало числом.' },
      { tag: 'MSG',   color: C.amber, text: 'Голова — место буквы в азбуке. Рост — букв до конца.' },
      { tag: 'TASK',  color: C.green, text: 'Перемножь в каждом имени, сложи шесть чисел.' },
    ],
    placeholder: 'число',
  },
]

const TOTAL = STAGES.length

// ---------- shared UI ----------

function TermCard({ filename, children }: { filename: string; children: ReactNode }) {
  return (
    <div className="terminal-glow overflow-hidden" style={{ background: '#04040C', border: '1px solid rgba(255,255,255,.09)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.06)' }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FF5F57', boxShadow: '0 0 5px rgba(255,95,87,.6)' }} />
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FFBC2E', boxShadow: '0 0 5px rgba(255,188,46,.6)' }} />
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#22C55E', boxShadow: '0 0 5px rgba(34,197,94,.6)' }} />
        <span className="font-mono text-[10px] text-gray2 flex-1 text-center">{filename}</span>
      </div>
      {children}
    </div>
  )
}

function Steps({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 font-mono text-[10px] text-gray2">
      {Array.from({ length: TOTAL }, (_, i) => i + 1).map(n => (
        <span key={n} style={{ color: n <= step ? '#22C55E' : undefined }}>
          {n < step ? '●' : n === step ? '◉' : '○'}
        </span>
      ))}
      <span className="ml-1">{step}/{TOTAL}</span>
    </div>
  )
}

function MediaBlock({ serverStage, media }: { serverStage: number; media: Media[] }) {
  return (
    <div className="flex flex-col gap-3">
      {media.map((m, i) => m.type === 'video' ? (
        <video
          key={i}
          src={giveawayAssetUrl(serverStage, m.file)}
          controls playsInline preload="metadata"
          className="w-full border border-bd2 bg-black"
          style={{ maxHeight: 420 }}
        />
      ) : (
        <img
          key={i}
          src={giveawayAssetUrl(serverStage, m.file)}
          alt={`stage ${serverStage} media ${i + 1}`}
          className="w-full border border-bd2 bg-black object-contain"
          style={{ maxHeight: 480 }}
        />
      ))}
    </div>
  )
}

type HintItem = { idx: number; unlocked: boolean; price: number; text: string | null }

function HintsPanel({ serverStage }: { serverStage: number }) {
  const [open, setOpen]       = useState(false)
  const [hints, setHints]     = useState<HintItem[]>([])
  const [pending, setPending] = useState<Record<number, string>>({})  // idx -> invoice_id
  const [busy, setBusy]       = useState<number | null>(null)
  const [msg, setMsg]         = useState<string | null>(null)

  const load = () => api.giveawayHints(serverStage).then(r => setHints(r.hints)).catch(() => {})
  useEffect(() => { setMsg(null); setPending({}); setHints([]); load() }, [serverStage])

  const buy = async (idx: number) => {
    setBusy(idx); setMsg(null)
    try {
      const r = await api.giveawayHintInvoice(serverStage, idx)
      if (r.error === 'already_owned') { await load(); return }
      if (!r.pay_url || !r.invoice_id) { setMsg('Не удалось создать счёт. Попробуй позже.'); return }
      setPending(p => ({ ...p, [idx]: r.invoice_id! }))
      openPay(r.pay_url)
    } catch { setMsg('Ошибка оплаты. Попробуй позже.') } finally { setBusy(null) }
  }

  const check = async (idx: number) => {
    const inv = pending[idx]; if (!inv) return
    setBusy(idx); setMsg(null)
    try {
      const r = await api.giveawayHintConfirm(inv)
      if (r.ok) {
        setHints(hs => hs.map(h => h.idx === idx ? { ...h, unlocked: true, text: r.text ?? h.text } : h))
        setPending(p => { const n = { ...p }; delete n[idx]; return n })
      } else if (r.status && r.status !== 'paid') {
        setMsg('Оплата ещё не поступила — подожди минуту и проверь снова.')
      } else {
        setMsg('Не удалось подтвердить оплату.')
      }
    } catch { setMsg('Ошибка проверки. Попробуй позже.') } finally { setBusy(null) }
  }

  if (hints.length === 0) return null

  return (
    <div className="border border-bd2 bg-s1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 font-mono text-[11px] text-white active:bg-s2 transition-colors"
      >
        <span>💡 Подсказки · {hints[0]?.price ?? 1} USDT за шт.</span>
        <span className="text-gray2">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {hints.map(h => (
            <div key={h.idx} className="border border-bd2 bg-bg px-3 py-2.5">
              {h.unlocked ? (
                <div className="font-mono text-[11px]" style={{ color: '#22C55E' }}>
                  <span className="text-gray2">Подсказка #{h.idx + 1}:</span>
                  <div className="text-white mt-1 font-sans text-[13px] leading-snug">{h.text}</div>
                </div>
              ) : pending[h.idx] ? (
                <div className="flex flex-col gap-2">
                  <div className="font-mono text-[10px] text-gray2">Подсказка #{h.idx + 1} · ожидает оплаты</div>
                  <button
                    onClick={() => check(h.idx)} disabled={busy === h.idx}
                    className="w-full py-2.5 bg-white text-bg font-mono font-bold text-[11px] tracking-[1px] uppercase disabled:opacity-40 active:bg-white/80"
                  >
                    {busy === h.idx ? <span className="blink">ПРОВЕРКА...</span> : '✅ Я ОПЛАТИЛ — ПРОВЕРИТЬ'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => buy(h.idx)} disabled={busy === h.idx}
                  className="w-full flex items-center justify-between gap-2 disabled:opacity-40"
                >
                  <span className="font-mono text-[11px] text-gray2">🔒 Подсказка #{h.idx + 1}</span>
                  <span className="font-mono text-[11px] px-2.5 py-1 border border-bd2 text-white" style={{ background: 'rgba(157,92,255,.12)' }}>
                    {busy === h.idx ? '...' : `Открыть · ${h.price} USDT`}
                  </span>
                </button>
              )}
            </div>
          ))}
          {msg && <div className="font-mono text-[10px]" style={{ color: '#FBBF24' }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}

function CodeInput({ value, onChange, onEnter, error, shake, placeholder, errorText }: {
  value: string; onChange: (v: string) => void; onEnter: () => void;
  error: boolean; shake: boolean; placeholder?: string; errorText?: string | null
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="font-mono text-[10px] text-gray2">$ unlock_code --phrase=&quot;...&quot;</div>
      <motion.div
        animate={shake ? { x: [0, -9, 9, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 px-3 h-11 font-mono text-[13px] border bg-s1 transition-colors"
        style={{ borderColor: error ? 'rgba(255,80,80,.6)' : 'rgba(42,42,64,1)' }}
      >
        <span className="text-gray2 shrink-0">&gt;</span>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter()}
          placeholder={placeholder || 'кодовая фраза...'}
          className="flex-1 bg-transparent text-white placeholder-gray2/40 outline-none"
          style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="font-mono text-[10px]" style={{ color: errorText ? '#FBBF24' : '#FF5050' }}
          >
            {errorText || '✗ ACCESS DENIED — неверный код'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SubmitBtn({ onClick, disabled, checking }: { onClick: () => void; disabled?: boolean; checking?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled || checking}
      className="w-full py-3.5 bg-white text-bg font-mono font-bold text-[12px] tracking-[2px] uppercase disabled:opacity-30 active:bg-white/80 transition-opacity"
    >
      {checking ? <span className="blink">ПРОВЕРКА...</span> : 'ПОДТВЕРДИТЬ →'}
    </button>
  )
}

// ---------- stage screen ----------

function StageScreen({ level, passed, canBack, onBack, onForward, input, setInput, error, shake, checking, onSubmit, onLink, errorText }: {
  level: number; passed: boolean; canBack: boolean; onBack: () => void; onForward: () => void
  input: string; setInput: (v: string) => void
  error: boolean; shake: boolean; checking: boolean; onSubmit: () => void; onLink: (url: string) => void
  errorText?: string | null
}) {
  const stage = STAGES[level]
  const serverStage = level + 1
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      className="px-4 py-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[22px] tracking-[3px] uppercase">🕵️ {CASE_TITLE}</div>
        <Steps step={level + 1} />
      </div>

      {(canBack || passed) && (
        <div className="flex items-center gap-2">
          <button
            onClick={onBack} disabled={!canBack}
            className="flex-1 py-2.5 border border-bd2 bg-s1 font-mono text-[11px] tracking-[1px] text-white disabled:opacity-25 active:bg-s2 transition-colors"
          >
            ‹ ПРЕД. ЭТАП
          </button>
          <button
            onClick={onForward} disabled={!passed}
            className="flex-1 py-2.5 border border-bd2 bg-s1 font-mono text-[11px] tracking-[1px] text-white disabled:opacity-25 active:bg-s2 transition-colors"
          >
            СЛЕД. ЭТАП ›
          </button>
        </div>
      )}

      {!passed && level > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 border font-mono text-[11px]"
          style={{ borderColor: 'rgba(34,197,94,.3)', background: 'rgba(34,197,94,.05)', color: '#22C55E' }}
        >
          ✓ &nbsp;Этап {level} пройден — след принят
        </div>
      )}

      <TermCard filename={stage.file}>
        <div className="p-4 font-mono text-[11px] leading-[1.9] space-y-0.5">
          {stage.lines.map((l, i) => (
            <div key={i}>
              <span style={{ color: l.color }}>[{l.tag}]</span>
              <span className="text-gray2 ml-2">{l.text}</span>
            </div>
          ))}
          <div className="text-white/20">...<span className="blink">█</span></div>
        </div>
      </TermCard>

      {stage.media && stage.media.length > 0 && (
        <MediaBlock serverStage={serverStage} media={stage.media} />
      )}

      {stage.link && (
        <button
          onClick={() => onLink(stage.link!.url)}
          className="flex items-center gap-3 px-4 py-3.5 border border-bd2 bg-s1 active:border-white/20 active:bg-s2 transition-colors"
        >
          <div className="w-10 h-10 flex items-center justify-center text-xl shrink-0 border border-bd2 text-white" style={{ background: 'rgba(255,255,255,.04)' }}>
            ◎
          </div>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold text-white">{stage.link.title}</div>
            <div className="text-[10px] text-gray font-mono">{stage.link.hint}</div>
          </div>
          <span className="text-gray2 text-[16px]">›</span>
        </button>
      )}

      <HintsPanel serverStage={serverStage} />

      {passed ? (
        <>
          <div
            className="flex items-center gap-2 px-3 py-2.5 border font-mono text-[11px]"
            style={{ borderColor: 'rgba(34,197,94,.3)', background: 'rgba(34,197,94,.05)', color: '#22C55E' }}
          >
            ✓ &nbsp;Этап пройден — ответ принят
          </div>
          <button
            onClick={onForward}
            className="w-full py-3.5 bg-white text-bg font-mono font-bold text-[12px] tracking-[2px] uppercase active:bg-white/80 transition-opacity"
          >
            ДАЛЬШЕ →
          </button>
        </>
      ) : (
        <>
          <CodeInput
            value={input} onChange={setInput} onEnter={onSubmit}
            error={error} shake={shake} placeholder={stage.placeholder} errorText={errorText}
          />
          <SubmitBtn onClick={onSubmit} disabled={!input.trim()} checking={checking} />
        </>
      )}
    </motion.div>
  )
}

function FinalScreen({ onAdmin, onBack, onReplay, hasWinner }: {
  onAdmin: () => void; onBack: () => void; onReplay: () => void; hasWinner: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-6 flex flex-col gap-5"
    >
      <button
        onClick={onBack}
        className="w-full py-2.5 border border-bd2 bg-s1 font-mono text-[11px] tracking-[1px] text-white active:bg-s2 transition-colors"
      >
        ‹ ПОСМОТРЕТЬ ПРОЙДЕННЫЕ ЭТАПЫ
      </button>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.15, stiffness: 180 }}
          className="text-[56px]"
        >
          🕵️
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="font-display text-[26px] tracking-[4px] uppercase text-white"
        >
          {CASE_TITLE} COMPLETED
        </motion.div>
      </div>

      {/* Приз выдаётся один раз. Если победитель уже определён — остальные
          могут проходить квест, но приз больше не выдаётся. */}
      {hasWinner ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="font-mono text-[11px] text-gray2 text-center leading-relaxed"
        >
          // расследование пройдено<br />// приз уже выдан победителю — квест открыт для всех
        </motion.div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <TermCard filename="case_002/prize.txt">
              <div className="p-4 font-mono text-[11px] leading-[1.9] space-y-2">
                <div><span style={{ color: '#22C55E' }}>[REWARD]</span><span className="text-gray2 ml-2">Секретное предложение:</span></div>
                <div
                  className="px-3 py-2.5 text-[13px] text-white leading-snug font-sans border-l-2"
                  style={{ borderLeftColor: 'rgba(40,200,64,.6)', background: 'rgba(40,200,64,.05)' }}
                >
                  {SECRET_OFFER}
                </div>
              </div>
            </TermCard>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            onClick={onAdmin}
            className="w-full py-3.5 bg-white text-bg font-mono font-bold text-[12px] tracking-[2px] uppercase active:bg-white/80 transition-opacity"
            style={{ boxShadow: '0 0 24px rgba(255,255,255,.15)' }}
          >
            ✉ НАПИСАТЬ @{ADMIN_TG}
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="font-mono text-[10px] text-gray2/60 text-center"
          >
            Напиши секретное предложение — получишь приз
          </motion.div>
        </>
      )}

      <button
        onClick={onReplay}
        className="w-full py-3 border border-bd2 bg-s1 font-mono text-[12px] tracking-[2px] uppercase text-white active:bg-s2 transition-colors"
      >
        ↻ Пройти заново
      </button>
    </motion.div>
  )
}

// Заглушка на время настройки (STAGES пуст). Видна только админам.
function SetupScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
      <div className="text-4xl">🛠️</div>
      <div className="font-display text-[20px] tracking-[2px] uppercase text-white">{CASE_TITLE}</div>
      <div className="font-mono text-[11px] text-gray2 leading-relaxed">
        // расследование готовится<br />// этапы ещё не загружены
      </div>
    </div>
  )
}

// ---------- main ----------

export default function GiveawayPage() {
  const [level, setLevelState] = useState(getLevel)
  const [view, setView]        = useState(getLevel)
  const [input, setInput]      = useState('')
  const [error, setError]      = useState(false)
  const [shake, setShake]      = useState(false)
  const [checking, setChecking] = useState(false)
  const [blocked, setBlocked]  = useState(false)
  const [winner, setWinner]    = useState<string | null>(null)
  const [errText, setErrText]  = useState<string | null>(null)
  const [completedOnce, setCompletedOnce] = useState(() => (TOTAL > 0 && getLevel() >= TOTAL) || isDone())

  useEffect(() => {
    if (TOTAL === 0) return
    api.giveawayProgress().then(r => {
      if (r.level >= TOTAL) { markDone(); setCompletedOnce(true) }
      if (r.level > getLevel() && !isDone()) {
        saveLevel(r.level)
        setLevelState(r.level)
        setView(r.level)
      }
    }).catch(() => {})
    api.giveawayWinner().then(r => { if (r.winner) setWinner(r.winner.username) }).catch(() => {})
  }, [])

  const advance = () => {
    const next = level + 1
    saveLevel(next)
    if (next >= TOTAL) { markDone(); setCompletedOnce(true) }
    setLevelState(next)
    setView(next)
    setInput('')
    setError(false)
  }

  const replay = () => {
    markDone()
    saveLevel(0)
    setLevelState(0)
    setView(0)
    setInput('')
    setError(false)
  }

  const goBack    = () => { setView(v => Math.max(0, v - 1)); setError(false) }
  const goForward = () => { setView(v => Math.min(level, v + 1)); setError(false) }

  const showError = (text: string | null = null) => {
    setErrText(text)
    setError(true)
    setShake(true)
    setTimeout(() => setShake(false), 450)
    setTimeout(() => setError(false), text ? 4000 : 2500)
  }

  const tryCode = async () => {
    if (checking || !input.trim()) return
    setChecking(true)
    try {
      const res = await api.giveawayCheck(level + 1, input)
      if (res.ok) advance()
      else if (res.error === 'too_many_attempts') setBlocked(true)
      else if (res.error === 'already_won') setWinner(res.winner ?? '???')
      else if (res.error === 'wrong_level') { saveLevel(0); setLevelState(0); setView(0); setInput('') }
      else showError()
    } catch {
      showError()
    } finally {
      setChecking(false)
    }
  }

  const openLink = (url: string) => {
    if (tgApp?.openLink) tgApp.openLink(url)
    else window.open(url, '_blank')
  }

  const openAdmin = () => {
    const url = `https://t.me/${ADMIN_TG}`
    if (tgApp?.openTelegramLink) tgApp.openTelegramLink(url)
    else window.open(url, '_blank')
  }

  if (TOTAL === 0) return <SetupScreen />

  if (blocked) return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
      <div className="text-4xl">🚫</div>
      <div className="font-display text-[20px] tracking-[2px] uppercase text-white">ДОСТУП ЗАКРЫТ</div>
      <div className="font-mono text-[11px] text-gray2 leading-relaxed">
        // превышен лимит попыток<br />// попробуй снова через 1 час
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      {completedOnce && view < TOTAL && (
        <div
          className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 border font-mono text-[10px]"
          style={{ borderColor: 'rgba(255,188,46,.3)', background: 'rgba(255,188,46,.05)', color: 'rgba(255,188,46,.85)' }}
        >
          ↻ &nbsp;повторное прохождение{winner ? <> · победитель: @{winner}</> : null}
        </div>
      )}
      <AnimatePresence mode="wait">
        {view < TOTAL && (
          <StageScreen
            key={`s${view}`}
            level={view}
            passed={view < level}
            canBack={view > 0}
            onBack={goBack} onForward={goForward}
            input={input} setInput={setInput} error={error} shake={shake} checking={checking}
            onSubmit={tryCode} onLink={openLink} errorText={errText}
          />
        )}
        {view >= TOTAL && (
          <FinalScreen key="final" onAdmin={openAdmin} onBack={goBack} onReplay={replay} hasWinner={!!winner} />
        )}
      </AnimatePresence>
    </div>
  )
}
