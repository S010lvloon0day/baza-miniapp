import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'

// ================================================================
//  CASE 001: RABBIT HOLE — расследование из 5 этапов
//  Ответы задаются в .env на сервере (GIVEAWAY_CODE_1..5)
// ================================================================
const MAPS_URL     = 'https://maps.google.com/?q=44.244,7.769'        // Координаты этапа 1
const SECRET_OFFER = 'Ты прошёл CASE 001 до конца. Приз — 20 USDT. Напиши @S010lvloon_bot и отправь скриншот этого экрана.' // Приз победителю
const ADMIN_TG     = 'S010lvloon'                                     // Telegram username
// ================================================================

const LS_KEY = 'case001_lvl'
const tgApp  = (window as any).Telegram?.WebApp

function getLevel()           { return parseInt(localStorage.getItem(LS_KEY) || '0', 10) }
function saveLevel(n: number) { localStorage.setItem(LS_KEY, String(n)) }

// ---------- stage content ----------

type TermLine = { tag: string; color: string; text: string }

type Stage = {
  file: string
  lines: TermLine[]
  placeholder: string
  showMap?: boolean
}

const C = { blue: '#60A5FA', amber: '#FBBF24', green: '#28C840' }

const STAGES: Stage[] = [
  {
    file: 'case_001/brief.txt',
    lines: [
      { tag: 'CASE',   color: C.blue,  text: '001 — RABBIT HOLE' },
      { tag: 'COORD',  color: C.amber, text: '44.244° N, 7.769° E' },
      { tag: 'CIPHER', color: C.green, text: 'WOMMWP' },
    ],
    placeholder: 'одно слово (en)',
    showMap: true,
  },
  {
    file: 'case_001/trace_02.txt',
    lines: [
      { tag: 'MSG',    color: C.blue,  text: 'Every trace remains in history.' },
      { tag: 'REPO',   color: C.amber, text: 'github.com/S010lvloon0day/rabbit-hole' },
      { tag: 'COMMIT', color: C.green, text: '9f8e1a' },
    ],
    placeholder: 'одно слово (en)',
  },
  {
    file: 'case_001/trace_03.txt',
    lines: [
      { tag: 'MSG',  color: C.blue,  text: 'The truth was deleted.' },
      { tag: 'MSG',  color: C.blue,  text: 'Not destroyed.' },
      { tag: 'FILE', color: C.amber, text: 'report_final.pdf' },
    ],
    placeholder: 'имя (en)',
  },
  {
    file: 'case_001/trace_04.txt',
    lines: [
      { tag: 'MSG', color: C.blue, text: 'Who is Moreau?' },
    ],
    placeholder: 'кодовое слово (en)',
  },
  {
    file: 'case_001/trace_05.txt',
    lines: [
      { tag: 'MSG', color: C.blue,  text: 'One final step.' },
      { tag: 'KEY', color: C.amber, text: 'Y29uZ3JhdHVsYXRpb25z' },
    ],
    placeholder: 'финальный ответ (en)',
  },
]

// ---------- shared UI ----------

function TermCard({ filename, children }: { filename: string; children: ReactNode }) {
  return (
    <div className="terminal-glow overflow-hidden" style={{ background: '#04040C', border: '1px solid rgba(255,255,255,.09)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.06)' }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FF5F57', boxShadow: '0 0 5px rgba(255,95,87,.6)' }} />
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FEBC2E', boxShadow: '0 0 5px rgba(254,188,46,.6)' }} />
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#28C840', boxShadow: '0 0 5px rgba(40,200,64,.6)' }} />
        <span className="font-mono text-[10px] text-gray2 flex-1 text-center">{filename}</span>
      </div>
      {children}
    </div>
  )
}

function Steps({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray2">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= step ? '#28C840' : undefined }}>
          {n < step ? '●' : n === step ? '◉' : '○'}
        </span>
      ))}
      <span>{step} / 5</span>
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

function StageScreen({ level, passed, canBack, onBack, onForward, input, setInput, error, shake, checking, onSubmit, onMap, errorText }: {
  level: number; passed: boolean; canBack: boolean; onBack: () => void; onForward: () => void
  input: string; setInput: (v: string) => void
  error: boolean; shake: boolean; checking: boolean; onSubmit: () => void; onMap: () => void
  errorText?: string | null
}) {
  const stage = STAGES[level]
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      className="px-4 py-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[22px] tracking-[3px] uppercase">🐇 CASE 001</div>
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
          style={{ borderColor: 'rgba(40,200,64,.3)', background: 'rgba(40,200,64,.05)', color: '#28C840' }}
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

      {stage.showMap && (
        <button
          onClick={onMap}
          className="flex items-center gap-3 px-4 py-3.5 border border-bd2 bg-s1 active:border-white/20 active:bg-s2 transition-colors"
        >
          <div className="w-10 h-10 flex items-center justify-center text-xl shrink-0 border border-bd2 text-white" style={{ background: 'rgba(255,255,255,.04)' }}>
            ◎
          </div>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold text-white">Открыть координаты</div>
            <div className="text-[10px] text-gray font-mono">// начни с того, что там стоит</div>
          </div>
          <span className="text-gray2 text-[16px]">›</span>
        </button>
      )}

      {passed ? (
        <>
          <div
            className="flex items-center gap-2 px-3 py-2.5 border font-mono text-[11px]"
            style={{ borderColor: 'rgba(40,200,64,.3)', background: 'rgba(40,200,64,.05)', color: '#28C840' }}
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

function FinalScreen({ onAdmin, onBack }: { onAdmin: () => void; onBack: () => void }) {
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
          🐇
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="font-display text-[26px] tracking-[4px] uppercase text-white"
        >
          CASE 001 COMPLETED
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="font-mono text-[11px] text-gray2 leading-relaxed"
        >
          The rabbit was never the answer.<br />It was only the entrance.
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <TermCard filename="case_001/prize.txt">
          <div className="p-4 font-mono text-[11px] leading-[1.9] space-y-2">
            <div><span style={{ color: '#28C840' }}>[REWARD]</span><span className="text-gray2 ml-2">Секретное предложение:</span></div>
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
    </motion.div>
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

  useEffect(() => {
    // Прогресс хранится на сервере — восстанавливаем, если localStorage очищен
    api.giveawayProgress().then(r => {
      if (r.level > getLevel()) {
        saveLevel(r.level)
        setLevelState(r.level)
        setView(r.level)
      }
    }).catch(() => {})
    if (getLevel() >= 5) return
    api.giveawayWinner().then(r => { if (r.winner) setWinner(r.winner.username) }).catch(() => {})
  }, [])

  const advance = () => {
    const next = level + 1
    saveLevel(next)
    setLevelState(next)
    setView(next)
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
      else if (res.error === 'use_key') showError('Wrong question. Use it.')
      else showError()
    } catch {
      showError()
    } finally {
      setChecking(false)
    }
  }

  const openMap = () => {
    if (tgApp?.openLink) tgApp.openLink(MAPS_URL)
    else window.open(MAPS_URL, '_blank')
  }

  const openAdmin = () => {
    const url = `https://t.me/${ADMIN_TG}`
    if (tgApp?.openTelegramLink) tgApp.openTelegramLink(url)
    else window.open(url, '_blank')
  }

  if (winner && level < 5) return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
      <div className="text-5xl">🐇</div>
      <div className="font-display text-[20px] tracking-[2px] uppercase text-white">CASE 001 ЗАКРЫТО</div>
      <div className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(199,166,255,.8)' }}>
        // победитель: @{winner}
      </div>
      <div className="font-mono text-[10px] text-gray2">// расследование завершено · следи за каналом</div>
    </div>
  )

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
    <div className="flex-1 overflow-y-auto pb-14">
      <AnimatePresence mode="wait">
        {view < 5 && (
          <StageScreen
            key={`s${view}`}
            level={view}
            passed={view < level}
            canBack={view > 0}
            onBack={goBack} onForward={goForward}
            input={input} setInput={setInput} error={error} shake={shake} checking={checking}
            onSubmit={tryCode} onMap={openMap} errorText={errText}
          />
        )}
        {view >= 5 && (
          <FinalScreen key="final" onAdmin={openAdmin} onBack={goBack} />
        )}
      </AnimatePresence>
    </div>
  )
}
