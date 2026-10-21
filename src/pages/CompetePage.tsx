import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Compete, BoardRow } from '../api/client'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'

const AV = [['#1F3B30', '#9FF0C6'], ['#2A2170', '#CFC4FF'], ['#5A4630', '#F0D29A'], ['#123F52', '#9BE3FF'], ['#4A1F2E', '#FFB3C7']]
function avColor(name: string) { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV[h % AV.length] }
const RING: Record<number, string> = {
  1: 'conic-gradient(from 200deg,#FFF0BE,#F5C25A,#C8912B,#FFE08A,#FFF0BE)',
  2: 'conic-gradient(from 200deg,#F4F7FD,#AEB9CF,#7C88A3,#DDE4F2,#F4F7FD)',
  3: 'conic-gradient(from 200deg,#FFD2A8,#D88B4E,#9A5424,#F0B07A,#FFD2A8)',
}
const MEDAL: Record<number, string> = {
  1: 'linear-gradient(115deg,#E9AE3C,#FFE9A8 45%,#F6C453)',
  2: 'linear-gradient(180deg,#E3E9F5,#9AA6BF)',
  3: 'linear-gradient(180deg,#EDB07D,#A8622E)',
}

function Avatar({ name, size }: { name: string; size: number }) {
  const [bg, fg] = avColor(name)
  return (
    <div className="rounded-full flex items-center justify-center font-semibold shrink-0" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.34 }}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

function Leaders({ rows }: { rows: BoardRow[] }) {
  const top = [rows[1], rows[0], rows[2]]
  return (
    <div className="grid grid-cols-[1fr_1.15fr_1fr] items-end mt-4 mb-1">
      {top.map((r, i) => {
        if (!r) return <div key={i} />
        const first = r.rank === 1
        return (
          <div key={r.rank} className="flex flex-col items-center gap-[3px] text-center min-w-0 px-1">
            {first && <Icon name="crown" size={20} accent="#F5C25A" className="text-gold mb-0.5" />}
            <div className="relative rounded-full p-[3px]" style={{ background: RING[r.rank] }}>
              <div className="rounded-full border-2 border-[#14120A]"><Avatar name={r.name} size={first ? 62 : 48} /></div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 min-w-[22px] h-[22px] rounded-full grid place-items-center text-[11.5px] font-bold border-2 border-[#14120A]"
                style={{ background: MEDAL[r.rank], color: r.rank === 1 ? '#2B1A02' : r.rank === 2 ? '#141A28' : '#2A1404' }}>{r.rank}</span>
            </div>
            <b className={`mt-1.5 font-semibold truncate max-w-full ${first ? 'text-[15px]' : 'text-[13.5px]'}`}>{r.name}{r.is_me ? ' · вы' : ''}</b>
            <small className={`text-[12px] tabular-nums ${first ? 'text-gold font-semibold' : 'text-gray'}`}>{r.xp.toLocaleString('ru-RU')} XP</small>
          </div>
        )
      })}
    </div>
  )
}

function Board({ rows }: { rows: BoardRow[] }) {
  const rest = rows.slice(3)
  if (!rows.length) return (
    <div className="px-5 py-10 text-center text-[13.5px] text-gray">Пока пусто. Пройдите первый урок — и вы в рейтинге.</div>
  )
  if (!rest.length) return null
  return (
    <div className="list-group">
      {rest.map(r => (
        <div key={`${r.rank}-${r.name}`} className="flex items-center gap-3 px-3.5 py-2.5"
          style={r.is_me ? { background: 'radial-gradient(120% 140% at 0% 0%, rgba(108,76,255,.24), transparent 70%)' } : undefined}>
          <span className={`w-7 text-center font-display font-semibold text-[13px] tabular-nums ${r.is_me ? 'text-violet' : 'text-gray2'}`}>{r.rank}</span>
          <Avatar name={r.name} size={32} />
          <span className={`flex-1 min-w-0 truncate text-[14.5px] ${r.is_me ? 'font-semibold' : 'font-medium'}`}>{r.name}{r.is_me ? ' · вы' : ''}</span>
          <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${r.is_me ? 'text-violet' : 'text-gray'}`}>{r.xp.toLocaleString('ru-RU')} XP</span>
        </div>
      ))}
    </div>
  )
}

const FEED_ICON: Record<string, IconName> = { certificate: 'cert', exam: 'test', chapter: 'book' }

export default function CompetePage() {
  const [data, setData] = useState<Compete | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'week' | 'all'>('week')

  const load = () => api.compete().then(setData).catch(() => {})

  useEffect(() => {
    load().finally(() => setLoading(false))
    const t = window.setInterval(load, 20_000) // живое обновление ленты/рейтинга
    return () => window.clearInterval(t)
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )
  if (!data) return (
    <div className="flex-1 flex items-center justify-center text-[13.5px] text-gray">Не удалось загрузить рейтинг</div>
  )

  const pos = scope === 'week' ? data.pos_week : data.pos_all
  const posXp = scope === 'week' ? data.week_xp : data.xp
  const rows = scope === 'week' ? data.board_week : data.board_all
  const above = pos ? rows.find(r => r.rank === pos - 1) : undefined
  const gap = above ? Math.max(0, above.xp - posXp) : 0
  const raw = data.rank.progress > 1 ? data.rank.progress : data.rank.progress * 100
  const rankPct = Math.round(Math.max(0, Math.min(100, raw)))
  const toAbovePct = above && above.xp > 0 ? Math.round(Math.min(100, (posXp / above.xp) * 100)) : 100

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3 flex flex-col gap-3">

        {/* Рейтинг */}
        <section className="card-gold px-3.5 pt-4 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="gold-metal sheen sheen-d2 w-[34px] h-[34px] rounded-[11px] grid place-items-center shrink-0">
              <Icon name="crown" size={17} accent="#3A2300" className="relative z-[1]" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-[15px] leading-tight">Рейтинг</div>
              <div className="text-[12.5px] text-[#CDBB8E] mt-0.5 flex items-center gap-1.5">
                <span className="pulse-dot" />сегодня учатся {data.today_active}
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 mt-3.5">
            {(['week', 'all'] as const).map(s => (
              <button key={s} onClick={() => setScope(s)} className={`chip ${scope === s ? 'on' : ''}`}>
                {s === 'week' ? 'Неделя' : 'Всё время'}
              </button>
            ))}
          </div>

          {rows.length > 0 && <Leaders rows={rows} />}

          {pos && (
            <div className="mt-3.5 rounded-2xl px-3 py-2.5"
              style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(108,76,255,.28), transparent 70%), rgba(255,255,255,.03)', border: '1px solid rgba(160,135,255,.45)' }}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full grid place-items-center font-display font-semibold text-[13px] bg-[rgba(139,107,255,.16)] text-violet shrink-0">{pos}</span>
                <div className="flex-1 min-w-0">
                  <b className="text-[14px] font-semibold">Вы · {posXp.toLocaleString('ru-RU')} XP</b>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/[.08] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${toAbovePct}%`, background: 'linear-gradient(90deg,#6E4CF5,#A58BFF)' }} />
                  </div>
                </div>
                {above && (
                  <div className="text-right leading-tight shrink-0">
                    <b className="text-[14px] text-gold tabular-nums">{gap} XP</b>
                    <div className="text-[11.5px] text-gray">до {pos - 1}-го</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <Board rows={rows} />

        {/* Ваш ранг */}
        <section className="card px-3.5 py-3" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(108,76,255,.24), transparent 70%), #111C17', borderColor: 'rgba(160,135,255,.3)' }}>
          <div className="flex items-center gap-2.5">
            <span className="tile-violet w-[34px] h-[34px] shrink-0"><Icon name="shield" size={17} accent="#fff" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-[14px] truncate">{data.rank.name}</div>
              <div className="text-[12px] text-gray truncate">{data.rank.next_name ? `Следующий ранг — ${data.rank.next_name}` : 'Высший ранг'}</div>
            </div>
            {data.rank.next_name && <span className="text-[12.5px] font-semibold text-violet tabular-nums">ещё {data.rank.to_next} XP</span>}
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-white/[.08] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${rankPct}%`, background: 'linear-gradient(90deg,#6E4CF5,#A58BFF)' }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { v: data.xp.toLocaleString('ru-RU'), l: 'опыта', c: 'text-violet' },
              { v: String(data.streak), l: 'дней подряд', c: 'text-[#FFB25B]', streak: true },
              { v: String(data.best_streak), l: 'рекорд серии', c: 'text-fg' },
            ].map(x => (
              <div key={x.l} className="rounded-xl bg-white/[.05] px-2.5 py-2">
                <div className={`font-display font-semibold text-[15px] tabular-nums flex items-center gap-0.5 ${x.c}`}>{x.v}{x.streak && <Icon name="streak" size={12} accent="#FFB25B" />}</div>
                <div className="text-[11px] text-gray">{x.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Живая лента */}
        <div className="flex items-baseline justify-between px-0.5 mt-3">
          <h2 className="text-[17px] font-bold">Живая лента</h2>
        </div>
        <div className="list-group mb-2">
          {data.feed.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13.5px] text-gray">Пока тихо. Будьте первым!</div>
          ) : data.feed.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="w-[34px] h-[34px] rounded-[10px] bg-white/[.06] grid place-items-center text-[#CFDAD4] shrink-0">
                <Icon name={FEED_ICON[f.kind] ?? 'streak'} size={17} accent={FEED_ICON[f.kind] ? 'brand' : '#F5C25A'} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] truncate"><b className="font-semibold">{f.name}</b> <span className="text-gray">{f.text}</span></div>
                <div className="text-[11.5px] text-gray2">{f.ago}</div>
              </div>
              <span className="shrink-0 text-[11.5px] font-bold text-green bg-green/15 px-2 py-[3px] rounded-full tabular-nums">+{f.amount} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
