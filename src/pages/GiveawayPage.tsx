import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ================================================================
//  НАСТРОЙКИ РОЗЫГРЫША — МЕНЯЙ ТОЛЬКО ЗДЕСЬ
// ================================================================
const VIDEO_URL    = 'https://youtu.be/ПОМЕНЯЙ_ССЫЛКУ'           // Ссылка на видео с заданием
const RIDDLE_TEXT  = 'ПОМЕНЯЙ: текст загадки для второго уровня' // Загадка уровня 2
const PASSWORD_1   = 'поменяй это'                               // Пароль уровня 1 (2 слова)
const PASSWORD_2   = 'поменяй это тоже'                          // Пароль уровня 2 (3 слова)
const SECRET_OFFER = 'ПОМЕНЯЙ: текст секретного предложения'     // Приз победителю
const ADMIN_TG     = 'S010lvloon'                                // Telegram username
// ================================================================

const LS_KEY = 'gw_lvl'
const tgApp  = (window as any).Telegram?.WebApp

function getLevel()     { return parseInt(localStorage.getItem(LS_KEY) || '0', 10) }
function saveLevel(n: number) { localStorage.setItem(LS_KEY, String(n)) }
function norm(s: string)      { return s.trim().toLowerCase().replace(/\s+/g, ' ') }

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
      {[1, 2].map(n => (
        <span key={n} style={{ color: n <= step ? '#28C840' : undefined }}>
          {n < step ? '●' : n === step ? '◉' : '○'}
        </span>
      ))}
      <span>{step} / 2</span>
    </div>
  )
}

function CodeInput({ value, onChange, onEnter, error, shake, placeholder }: {
  value: string; onChange: (v: string) => void; onEnter: () => void;
  error: boolean; shake: boolean; placeholder?: string
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
            className="font-mono text-[10px]" style={{ color: '#FF5050' }}
          >
            ✗ ACCESS DENIED — неверный код
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SubmitBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full py-3.5 bg-white text-bg font-mono font-bold text-[12px] tracking-[2px] uppercase disabled:opacity-30 active:bg-white/80 transition-opacity"
    >
      ПОДТВЕРДИТЬ →
    </button>
  )
}

// ---------- levels ----------

function Level0({ input, setInput, error, shake, onVideo, onSubmit }: {
  input: string; setInput: (v: string) => void
  error: boolean; shake: boolean; onVideo: () => void; onSubmit: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      className="px-4 py-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[22px] tracking-[3px] uppercase">🔐 КВЕСТ</div>
        <Steps step={1} />
      </div>

      <TermCard filename="secret/mission_01.txt">
        <div className="p-4 font-mono text-[11px] leading-[1.9] space-y-0.5">
          <div><span style={{ color: '#60A5FA' }}>[INFO]</span><span className="text-gray2 ml-2">Секретный раздел активирован</span></div>
          <div><span style={{ color: '#FBBF24' }}>[TASK]</span><span className="text-gray2 ml-2">Посмотри видео — там задание</span></div>
          <div><span style={{ color: '#28C840' }}>[CODE]</span><span className="text-gray2 ml-2">Введи кодовую фразу из 2 слов</span></div>
          <div className="text-white/20">...<span className="blink">█</span></div>
        </div>
      </TermCard>

      <button
        onClick={onVideo}
        className="flex items-center gap-3 px-4 py-3.5 border border-bd2 bg-s1 active:border-white/20 active:bg-s2 transition-colors"
      >
        <div className="w-10 h-10 flex items-center justify-center text-xl shrink-0 border border-bd2 text-white" style={{ background: 'rgba(255,255,255,.04)' }}>
          ▶
        </div>
        <div className="flex-1 text-left">
          <div className="text-[13px] font-semibold text-white">Смотреть видео</div>
          <div className="text-[10px] text-gray font-mono">// задание и подсказка к паролю</div>
        </div>
        <span className="text-gray2 text-[16px]">›</span>
      </button>

      <CodeInput
        value={input} onChange={setInput} onEnter={onSubmit}
        error={error} shake={shake} placeholder="два слова через пробел"
      />
      <SubmitBtn onClick={onSubmit} disabled={!input.trim()} />
    </motion.div>
  )
}

function Level1({ input, setInput, error, shake, onSubmit }: {
  input: string; setInput: (v: string) => void
  error: boolean; shake: boolean; onSubmit: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      className="px-4 py-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[22px] tracking-[3px] uppercase">🔓 УРОВЕНЬ 2</div>
        <Steps step={2} />
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2.5 border font-mono text-[11px]"
        style={{ borderColor: 'rgba(40,200,64,.3)', background: 'rgba(40,200,64,.05)', color: '#28C840' }}
      >
        ✓ &nbsp;Уровень 1 пройден — доступ получен
      </div>

      <TermCard filename="secret/mission_02.txt">
        <div className="p-4 font-mono text-[11px] leading-[1.9] space-y-0.5">
          <div><span style={{ color: '#60A5FA' }}>[INFO]</span><span className="text-gray2 ml-2">Финальный уровень</span></div>
          <div><span style={{ color: '#FBBF24' }}>[RIDDLE]</span><span className="text-gray2 ml-2">{RIDDLE_TEXT}</span></div>
          <div><span style={{ color: '#28C840' }}>[CODE]</span><span className="text-gray2 ml-2">Введи ответ из 3 слов</span></div>
          <div className="text-white/20">...<span className="blink">█</span></div>
        </div>
      </TermCard>

      <CodeInput
        value={input} onChange={setInput} onEnter={onSubmit}
        error={error} shake={shake} placeholder="три слова через пробел"
      />
      <SubmitBtn onClick={onSubmit} disabled={!input.trim()} />
    </motion.div>
  )
}

function Level2({ onAdmin }: { onAdmin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-6 flex flex-col gap-5"
    >
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.15, stiffness: 180 }}
          className="text-[56px]"
        >
          🏆
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="font-display text-[30px] tracking-[4px] uppercase text-white"
        >
          ТЫ ВЫИГРАЛ!
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="font-mono text-[10px] text-gray2"
        >
          // все уровни пройдены · quest completed
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <TermCard filename="secret/prize.txt">
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
  const [input, setInput]      = useState('')
  const [error, setError]      = useState(false)
  const [shake, setShake]      = useState(false)

  const advance = () => {
    const next = level + 1
    saveLevel(next)
    setLevelState(next)
    setInput('')
    setError(false)
  }

  const tryCode = (expected: string) => {
    if (norm(input) === norm(expected)) {
      advance()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 450)
      setTimeout(() => setError(false), 2500)
    }
  }

  const openVideo = () => {
    if (tgApp?.openLink) tgApp.openLink(VIDEO_URL)
    else window.open(VIDEO_URL, '_blank')
  }

  const openAdmin = () => {
    const url = `https://t.me/${ADMIN_TG}`
    if (tgApp?.openTelegramLink) tgApp.openTelegramLink(url)
    else window.open(url, '_blank')
  }

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <AnimatePresence mode="wait">
        {level === 0 && (
          <Level0
            key="l0"
            input={input} setInput={setInput} error={error} shake={shake}
            onVideo={openVideo} onSubmit={() => tryCode(PASSWORD_1)}
          />
        )}
        {level === 1 && (
          <Level1
            key="l1"
            input={input} setInput={setInput} error={error} shake={shake}
            onSubmit={() => tryCode(PASSWORD_2)}
          />
        )}
        {level >= 2 && (
          <Level2 key="l2" onAdmin={openAdmin} />
        )}
      </AnimatePresence>
    </div>
  )
}
