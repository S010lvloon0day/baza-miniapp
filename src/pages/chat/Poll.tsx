// Опросы в чате: создание (вопрос, до 10 вариантов, несколько ответов, анонимность) и голосование.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../api/client'
import type { ChatMsg } from '../../api/client'
import Icon from '../../components/Icon'

export function PollMsg({ m, mine, onUpdate }: { m: ChatMsg; mine: boolean; onUpdate: (msg: ChatMsg) => void }) {
  const p = m.poll!
  const voted = p.options.some(o => o.mine)
  const [pick, setPick] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const total = p.options.reduce((a, o) => a + o.votes, 0)
  const vote = async (opts: number[]) => {
    if (busy) return
    setBusy(true)
    try { const r = await api.chatVote(m.id, opts); if (r.message) onUpdate(r.message) } catch { /* */ }
    setBusy(false); setPick([])
  }
  const tap = (i: number) => {
    if (voted) return
    if (!p.multi) { vote([i]); return }
    setPick(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])
  }
  const sub = mine ? 'rgba(255,255,255,.7)' : '#A6B8AE'
  return (
    <div className="px-3 pt-2 pb-1.5 min-w-[230px] max-w-[300px]" onClick={e => e.stopPropagation()}>
      <div className="text-[15px] font-semibold text-fg leading-snug">{p.q}</div>
      <div className="text-[12px] mt-0.5 mb-2" style={{ color: sub }}>{p.anon ? 'Анонимный опрос' : 'Опрос'}{p.multi ? ' · несколько ответов' : ''}</div>
      <div className="flex flex-col gap-1.5">
        {p.options.map((o, i) => {
          const pct = total ? Math.round(o.votes / total * 100) : 0
          return voted ? (
            <div key={i} className="relative">
              <div className="flex items-center gap-2 text-[14px] text-fg">
                <span className="w-9 text-right text-[13px] font-semibold tabular-nums shrink-0">{pct}%</span>
                <span className="flex-1 min-w-0 break-words">{o.text}</span>
                {o.mine && <span className="w-[18px] h-[18px] rounded-full grid place-items-center shrink-0" style={{ background: '#17E584', color: '#021A0C' }}><Icon name="check" size={11} strokeWidth={2.6} /></span>}
              </div>
              <div className="ml-11 mt-1 h-[4px] rounded-full bg-white/[.08] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: o.mine ? '#17E584' : 'rgba(255,255,255,.4)' }}
                  initial={{ width: 0 }} animate={{ width: `${Math.max(pct, 2)}%` }} transition={{ duration: 0.45 }} />
              </div>
            </div>
          ) : (
            <button key={i} onClick={() => tap(i)} disabled={busy}
              className="flex items-center gap-2.5 text-left text-[14px] text-fg py-1.5 active:opacity-70">
              <span className={`w-[20px] h-[20px] ${p.multi ? 'rounded-[6px]' : 'rounded-full'} border-2 grid place-items-center shrink-0`}
                style={{ borderColor: pick.includes(i) ? '#17E584' : 'rgba(255,255,255,.3)', background: pick.includes(i) ? '#17E584' : 'transparent', color: '#021A0C' }}>
                {pick.includes(i) && <Icon name="check" size={12} strokeWidth={2.8} />}
              </span>
              <span className="flex-1 min-w-0 break-words">{o.text}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[12px]" style={{ color: sub }}>
        <span>{p.voters ? `${p.voters} ${plural(p.voters, 'голос', 'голоса', 'голосов')}` : 'Пока нет голосов'}</span>
        {voted
          ? <button onClick={() => vote([])} className="font-medium active:opacity-60" style={{ color: '#7FD3FF' }}>Отменить голос</button>
          : p.multi && <button onClick={() => pick.length && vote(pick)} disabled={!pick.length || busy}
              className="font-semibold disabled:opacity-40" style={{ color: '#17E584' }}>Голосовать</button>}
      </div>
    </div>
  )
}

export function plural(n: number, a: string, b: string, c: string) {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c
}

export function PollComposer({ onClose, onSent }: { onClose: () => void; onSent: (err?: string) => void }) {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<string[]>(['', ''])
  const [multi, setMulti] = useState(false)
  const [anon, setAnon] = useState(true)
  const [busy, setBusy] = useState(false)
  const filled = opts.map(o => o.trim()).filter(Boolean)
  const ok = q.trim() && filled.length >= 2
  const send = async () => {
    if (!ok || busy) return
    setBusy(true)
    const r = await api.chatPoll({ q: q.trim(), options: filled, multi, anon }).catch(() => ({ error: 'net', message: 'Не удалось отправить' } as any))
    setBusy(false)
    onSent(r?.error ? (r.message || 'Не удалось отправить') : undefined)
  }
  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <button onClick={() => set(!on)} className="w-full flex items-center justify-between py-2.5 text-[14px] text-fg">
      {label}
      <span className="w-[42px] h-[25px] rounded-full p-[3px] transition-colors" style={{ background: on ? '#17E584' : 'rgba(255,255,255,.15)' }}>
        <span className="block w-[19px] h-[19px] rounded-full bg-white transition-transform" style={{ transform: on ? 'translateX(17px)' : 'none' }} />
      </span>
    </button>
  )
  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.6)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full max-w-[460px] rounded-t-[28px] p-5 bg-s1 border-t border-white/[.08] max-h-[88vh] overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 22px)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-white/15" />
        <div className="font-display font-semibold text-[17px] text-fg mb-3">Новый опрос</div>
        <input value={q} onChange={e => setQ(e.target.value.slice(0, 250))} placeholder="Вопрос" autoFocus
          className="w-full h-12 px-4 rounded-[14px] bg-white/[.06] text-[15px] text-fg outline-none placeholder:text-gray2" />
        <div className="text-[12px] text-gray mt-4 mb-2 uppercase tracking-wide">Варианты</div>
        <div className="flex flex-col gap-2">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o} onChange={e => setOpts(a => a.map((x, j) => j === i ? e.target.value.slice(0, 100) : x))} placeholder={`Вариант ${i + 1}`}
                className="flex-1 h-11 px-4 rounded-[12px] bg-white/[.06] text-[14.5px] text-fg outline-none placeholder:text-gray2" />
              {opts.length > 2 && <button onClick={() => setOpts(a => a.filter((_, j) => j !== i))} aria-label="Убрать" className="w-9 h-9 rounded-full grid place-items-center text-gray active:bg-white/10"><Icon name="close" size={15} /></button>}
            </div>
          ))}
        </div>
        {opts.length < 10 && (
          <button onClick={() => setOpts(a => [...a, ''])} className="mt-2 flex items-center gap-2 text-[14px] font-medium py-2" style={{ color: '#17E584' }}>
            <Icon name="plus" size={16} accent="current" /> Добавить вариант
          </button>
        )}
        <div className="mt-2 border-t border-white/[.07]">
          <Toggle on={anon} set={setAnon} label="Анонимное голосование" />
          <Toggle on={multi} set={setMulti} label="Несколько вариантов ответа" />
        </div>
        <button onClick={send} disabled={!ok || busy} className="btn-primary w-full h-12 mt-3 text-[15px] disabled:opacity-40">{busy ? 'Отправляю…' : 'Отправить опрос'}</button>
      </motion.div>
    </motion.div>
  )
}
