import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import { maskApi } from '../../api/mask'
import type { MaskState, MaskReact, MaskClue } from '../../api/mask'
import type { StageHandle } from './MaskStage'

const MaskStage = lazy(() => import('./MaskStage'))
const BASE = import.meta.env.BASE_URL
const tg = (window as any).Telegram?.WebApp
const haptic = (t: 'error' | 'success' | 'warning') => { try { tg?.HapticFeedback?.notificationOccurred(t) } catch { /* */ } }

const fmtLeft = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h} ч ${m} мин` : m > 0 ? `${m} мин` : `${s} с`
}
const ago = (iso: string) => {
  const d = (Date.now() - new Date(iso + 'Z').getTime()) / 1000
  if (d < 60) return 'только что'; if (d < 3600) return `${Math.floor(d / 60)} мин`; if (d < 86400) return `${Math.floor(d / 3600)} ч`
  return `${Math.floor(d / 86400)} дн`
}

/** Голос владельца: mask/voice/<kind>_<variant>.mp3 (если файла нет — молча, только субтитры). */
function useVoice() {
  const cur = useRef<HTMLAudioElement | null>(null)
  return useCallback((r: MaskReact, onState: (on: boolean) => void) => {
    try { cur.current?.pause() } catch { /* */ }
    const a = new Audio(`${BASE}mask/voice/${r.kind}_${r.variant}.mp3`)
    cur.current = a
    let started = false
    a.onplay = () => { started = true; onState(true) }
    a.onended = () => onState(false)
    a.onerror = () => { onState(true); setTimeout(() => onState(false), Math.min(2600, 600 + r.line.length * 55)) }
    a.play().catch(() => { if (!started) { onState(true); setTimeout(() => onState(false), Math.min(2600, 600 + r.line.length * 55)) } })
  }, [])
}

function Bubble({ text, speaking }: { text: string; speaking: boolean }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    setShown(''); const t0 = Date.now()
    const t = window.setInterval(() => { const i = Math.ceil((Date.now() - t0) / 28); setShown(text.slice(0, i)); if (i >= text.length) window.clearInterval(t) }, 28)
    return () => window.clearInterval(t)
  }, [text])
  if (!text) return null
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-3 z-10 max-w-[86%] pointer-events-none">
      <div className="glass rounded-[18px] px-4 py-2.5 text-[14.5px] leading-snug text-center shadow-lg">
        {shown}<span className={`inline-block w-[2px] h-[14px] ml-0.5 align-middle bg-white/70 ${speaking ? 'animate-pulse' : 'opacity-0'}`} />
      </div>
    </div>
  )
}

function Pips({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Попыток осталось: ${left}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="w-2.5 h-2.5 rotate-45 rounded-[2px] transition-colors"
          style={{ background: i < left ? '#17E584' : 'rgba(255,255,255,.14)', boxShadow: i < left ? '0 0 10px rgba(23,229,132,.6)' : 'none' }} />
      ))}
    </div>
  )
}

function ClueCard({ c, onSolved }: { c: MaskClue; onSolved: () => void }) {
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [left, setLeft] = useState(c.opens_in ?? 0)
  useEffect(() => {
    if (c.open) return
    const t = window.setInterval(() => setLeft(x => Math.max(0, x - 1)), 1000)
    return () => window.clearInterval(t)
  }, [c.open])
  const send = async (ans: string) => {
    if (!ans.trim() || busy) return
    setBusy(true); setMsg('')
    try {
      const r = await maskApi.clue(c.id, ans)
      if (r.ok) { haptic('success'); onSolved() } else { haptic('error'); setMsg(r.tries_left ? `Неверно. Осталось попыток сегодня: ${r.tries_left}` : 'Попытки на сегодня кончились') }
    } catch { setMsg('Не удалось отправить') } finally { setBusy(false) }
  }
  return (
    <div className={`card px-3.5 py-3 ${c.solved ? '' : ''}`} style={c.solved ? { borderColor: 'rgba(23,229,132,.35)' } : undefined}>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-[10px] grid place-items-center shrink-0" style={{ background: c.solved ? 'rgba(23,229,132,.14)' : c.open ? 'rgba(118,87,255,.2)' : 'rgba(255,255,255,.06)' }}>
          <Icon name={c.solved ? 'unlock' : c.open ? 'puzzle' : 'lock'} size={16} accent={c.solved ? '#17E584' : c.open ? '#B9A8FF' : '#6E8478'} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-gray">Улика {c.pos || c.id}</div>
          {!c.open && <div className="text-[13.5px] text-gray2">откроется через {fmtLeft(left)}</div>}
        </div>
        <span className="text-[12px] font-semibold text-violet tabular-nums">+{c.points}</span>
      </div>
      {c.open && <p className="text-[14.5px] mt-2 whitespace-pre-wrap">{c.question}</p>}
      {c.solved ? (
        <div className="mt-2.5 rounded-[12px] px-3 py-2.5 text-[14px]" style={{ background: 'rgba(23,229,132,.08)', border: '1px solid rgba(23,229,132,.22)' }}>
          <span className="text-green font-semibold">Подсказка: </span>{c.reward}
        </div>
      ) : c.open && (
        c.kind === 'choice' ? (
          <div className="grid gap-2 mt-2.5">
            {(c.options || []).map((o, i) => (
              <button key={i} disabled={busy || c.tries_left === 0} onClick={() => send(String(i))} className="btn-secondary h-11 text-[14px] text-left px-3.5">{o}</button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 mt-2.5">
            <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(v)} maxLength={40}
              placeholder="Ответ" className="flex-1 min-w-0 bg-s2 border border-white/[.08] rounded-[14px] px-3.5 h-11 text-[15px] outline-none" />
            <button disabled={busy || !v.trim() || c.tries_left === 0} onClick={() => send(v)} className="btn-violet h-11 px-4 rounded-[14px] text-[14px] font-semibold">Ок</button>
          </div>
        )
      )}
      {msg && <div className="text-[12.5px] text-[#FF8A8A] mt-2">{msg}</div>}
    </div>
  )
}

export default function MaskGamePage() {
  const [s, setS] = useState<MaskState | null>(null)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)
  const [prog, setProg] = useState(0)
  const [line, setLine] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [cool, setCool] = useState(0)
  const [tab, setTab] = useState<'clues' | 'board' | 'feed'>('clues')
  const [revealedNow, setRevealedNow] = useState(false)
  const [note, setNote] = useState('')
  const stage = useRef<StageHandle>(null)
  const voice = useVoice()
  const greeted = useRef(false)

  const load = useCallback(() => maskApi.state().then((raw: unknown) => {
    const d: MaskState = {
      tries_left: 0, tries_per_day: 3, cooldown: 0, reset_in: 0, feed: [], clues: [], board: [], my_pts: 0, my_pos: null,
      reveal: false, is_admin: false, hello: { kind: 'hello', variant: 1, line: 'Новый раунд скоро начнётся.', anim: 'wave' },
      ...(raw as Partial<MaskState>), round: (raw as Partial<MaskState>)?.round ?? null, stats: { guesses: 0, players: 0, today: 0, ...((raw as Partial<MaskState>)?.stats || {}) },
    }
    setS(d); setCool(c => Math.max(c, d.cooldown || 0)) }).catch(e => setErr(e?.status === 404 ? 'hidden' : 'error')), [])
  useEffect(() => { load(); const t = window.setInterval(load, 15000); return () => window.clearInterval(t) }, [load])
  useEffect(() => { if (cool <= 0) return; const t = window.setTimeout(() => setCool(c => c - 1), 1000); return () => window.clearTimeout(t) }, [cool])

  const say = useCallback((r: MaskReact) => {
    setLine(r.line)
    stage.current?.play(r.anim)
    voice(r, on => { setSpeaking(on); stage.current?.speak(on) })
  }, [voice])

  useEffect(() => {
    if (ready && s && !greeted.current) {
      greeted.current = true
      setTimeout(() => say(s.teaser ? { kind: 'hello', variant: 1, line: 'Скоро узнаешь, кто я. Если сможешь.', anim: 'wave' } : s.hello), 400)
    }
  }, [ready, s, say])

  const submit = async () => {
    const t = text.trim()
    if (!t || busy || cool > 0 || !s) return
    setBusy(true); setNote('')
    const r = await maskApi.guess(t)
    setBusy(false)
    if (r.error === 'too_new') { setNote(`Играть можно с аккаунтом старше нескольких дней — осталось ${r.days} дн.`); return }
    if (r.error === 'cooldown') { setNote('Не так быстро — подожди пару секунд'); return }
    if (r.error) { setNote('Не удалось отправить. Попробуй ещё раз'); return }
    setText('')
    if (r.react) say(r.react)
    if (r.ok && !r.test) {
      haptic('success')
      setTimeout(async () => { await stage.current?.reveal(); setRevealedNow(true) }, 900)
    } else if (r.ok && r.test) {
      haptic('success'); setNote('Тест админа: ответ верный (раунд не закрыт)')
      setTimeout(() => stage.current?.reveal(), 900)
    } else {
      haptic(r.kind === 'close' ? 'warning' : 'error'); stage.current?.shake()
    }
    if (r.cooldown) setCool(r.cooldown)
    load()
  }

  if (err === 'hidden') return <div className="flex-1 grid place-items-center text-[14px] text-gray px-6 text-center">Раздел пока закрыт</div>
  if (err) return <div className="flex-1 grid place-items-center text-[14px] text-gray px-6 text-center">Не удалось загрузить игру</div>
  if (!s) return <div className="flex-1 grid place-items-center"><div className="w-2 h-2 bg-green rounded-full animate-pulse" /></div>

  const r = s.round
  const solved = r?.status === 'solved'
  const canReveal = s.reveal
  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      {/* Сцена */}
      <div className="relative w-full" style={{ height: 'min(62vh, 560px)', background: 'radial-gradient(80% 70% at 50% 38%, rgba(118,87,255,.22), transparent 70%), radial-gradient(70% 50% at 50% 100%, rgba(23,229,132,.14), transparent 70%), #08100D' }}>
        <Suspense fallback={null}>
          <MaskStage ref={stage} publicUrl={`${BASE}mask/public.glb`}
            revealUrl={canReveal ? maskApi.revealUrl() : undefined}
            revealHeaders={{ 'X-Init-Data': maskApi.initData() }}
            revealed={solved && canReveal && !revealedNow}
            onReady={() => setReady(true)} onProgress={setProg} />
        </Suspense>
        {!ready && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <Icon name="mask" size={34} accent="#B9A8FF" />
              <div className="mt-2 w-36 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-green" style={{ width: `${Math.round(prog * 100)}%` }} /></div>
            </div>
          </div>
        )}
        <Bubble text={line} speaking={speaking} />
        <div className="absolute left-3 right-3 bottom-3 z-10 flex items-end justify-between pointer-events-none">
          <span className="glass rounded-full px-3 h-8 flex items-center gap-1.5 text-[12.5px]"><span className="pulse-dot" />сегодня пытались {s.stats.today}</span>
          {r && <span className="gold-metal sheen rounded-full px-3 h-8 flex items-center text-[12.5px] font-semibold text-[#2B1A02] relative"><span className="relative z-[1]">Приз {r.prize}</span></span>}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-14 text-[11px] text-white/40 pointer-events-none">крути персонажа пальцем</div>
      </div>

      <div className="px-4 -mt-1 flex flex-col gap-3">
        {s.teaser ? (
          <section className="card px-4 py-4" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(118,87,255,.28), transparent 65%), #111C17', borderColor: 'rgba(160,135,255,.32)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-display font-semibold text-[16px]">Скоро старт</div>
              <span className="gold-metal sheen rounded-full px-2.5 h-7 flex items-center text-[12px] font-semibold text-[#2B1A02] relative shrink-0"><span className="relative z-[1]">Приз 80 USDT</span></span>
            </div>
            <p className="text-[13.5px] text-gray mt-1.5">Кто под маской? Три испытания — и первый, кто пройдёт их все, снимет маску и заберёт приз.</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {['Забег', 'Шифр', '???'].map((t, i) => (
                <div key={t} className="rounded-[14px] bg-white/[.05] border border-white/[.06] px-2 py-2.5 text-center">
                  <Icon name="lock" size={16} accent="#6E8478" />
                  <div className="text-[12.5px] mt-1">{i + 1}. {t}</div>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-gray2 mt-3">Следи за ботом — объявим старт.</p>
          </section>
        ) : !r ? (
          <section className="card p-4 text-center text-[14px] text-gray">Новый раунд скоро начнётся</section>
        ) : solved ? (
          <section className="card-gold p-4">
            <div className="font-display font-semibold text-[16px]">Маску сняли</div>
            <p className="text-[13.5px] text-[#CDBB8E] mt-1">
              {r.winner?.is_me ? 'Это ты! Администратор свяжется с тобой для выдачи приза.' : `Первым угадал ${r.winner?.name ?? 'игрок'}. Жди следующий раунд — новые персонажи уже на подходе.`}
            </p>
          </section>
        ) : (
          <section className="card px-3.5 pt-3.5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-[15px]">{r.title || 'Сними маску'}</div>
                <div className="text-[12.5px] text-gray mt-0.5">Назови моё имя — и маска твоя</div>
              </div>
              <Pips left={s.tries_left} total={s.tries_per_day} />
            </div>
            {r.intro && <p className="text-[13.5px] text-gray mt-2 whitespace-pre-wrap">{r.intro}</p>}
            {s.tries_left > 0 ? (
              <div className="flex gap-2 mt-3">
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} maxLength={30}
                  placeholder="Как меня зовут?" autoComplete="off" enterKeyHint="send"
                  className="flex-1 min-w-0 bg-s2 border border-white/[.08] rounded-[16px] px-4 h-12 text-[16px] outline-none" />
                <button onClick={submit} disabled={busy || !text.trim() || cool > 0} className="btn-primary !w-auto px-5 h-12 rounded-[16px]">
                  {cool > 0 ? `${cool}` : busy ? '…' : 'Назвать'}
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-[14px] bg-white/[.04] px-3.5 py-3 text-[13.5px] text-gray">Попытки на сегодня закончились. Новые через {fmtLeft(s.reset_in)}. Пока — разгадывай улики.</div>
            )}
            {note && <div className="text-[12.5px] text-gold mt-2">{note}</div>}
          </section>
        )}

        <div className="flex gap-1.5">
          {!s.teaser && ([['clues', 'Улики'], ['board', 'Рейтинг недели'], ['feed', 'Попытки']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'on' : ''}`}>{l}</button>
          ))}
        </div>

        {!s.teaser && tab === 'clues' && (
          <div className="flex flex-col gap-2.5">
            {s.clues.length === 0 ? <div className="card p-4 text-[13.5px] text-gray text-center">Улики появятся по ходу недели</div>
              : s.clues.map(c => <ClueCard key={c.id} c={c} onSolved={load} />)}
          </div>
        )}

        {!s.teaser && tab === 'board' && (
          <section className="card-gold px-3.5 py-3">
            <div className="flex items-center justify-between">
              <b className="text-[14px]">Рейтинг недели</b>
              <span className="text-[12px] text-[#CDBB8E]">{s.my_pos ? `ты — ${s.my_pos}-й · ${s.my_pts} очк.` : 'очки за улики и попытки'}</span>
            </div>
            <div className="mt-2">
              {s.board.length === 0 ? <div className="py-6 text-center text-[13.5px] text-gray">Пока никого. Будь первым</div> : s.board.map(b => (
                <div key={b.rank} className="flex items-center gap-3 py-2">
                  <span className="w-6 text-center font-display font-semibold text-[13px] tabular-nums" style={{ color: b.rank <= 3 ? '#F5C25A' : '#6E8478' }}>{b.rank}</span>
                  <span className={`flex-1 min-w-0 truncate text-[14px] ${b.is_me ? 'font-semibold text-violet' : ''}`}>{b.name}{b.is_me ? ' · ты' : ''}</span>
                  <span className="text-[13px] tabular-nums text-gray">{b.pts}</span>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-gray mt-2">Улика — её очки, попытка — 2, разгадка — 500. Неделя по Москве, с понедельника.</p>
          </section>
        )}

        {!s.teaser && tab === 'feed' && (
          <div className="list-group">
            {s.feed.length === 0 ? <div className="px-5 py-8 text-center text-[13.5px] text-gray">Пока никто не пробовал</div> : s.feed.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="w-8 h-8 rounded-[10px] bg-white/[.06] grid place-items-center shrink-0">
                  <Icon name={f.kind === 'close' ? 'flame' : 'close'} size={15} accent={f.kind === 'close' ? '#FFB25B' : '#FF8A8A'} />
                </span>
                <span className="flex-1 min-w-0 text-[14px] truncate"><b className="font-semibold">{f.name}</b>{f.text ? <span className="text-gray"> — «{f.text}»</span> : null}</span>
                <span className="text-[11.5px] text-gray2 shrink-0">{f.kind === 'close' ? 'тепло · ' : ''}{ago(f.at)}</span>
              </div>
            ))}
          </div>
        )}

        <details className="card px-3.5 py-3 text-[13px] text-gray">
          <summary className="text-[13.5px] text-fg font-medium cursor-pointer">Правила</summary>
          <ul className="mt-2 flex flex-col gap-1.5 list-disc pl-4">
            <li>{s.tries_per_day} попытки в сутки, обновляются в 00:00 по Москве.</li>
            <li>Приз получает первый, кто назовёт имя. Выплату проверяет и делает администратор вручную.</li>
            <li>Улики дают подсказки и очки в рейтинг недели.</li>
            <li>Мультиаккаунты и подбор ботами — дисквалификация.</li>
          </ul>
        </details>
      </div>
    </div>
  )
}
