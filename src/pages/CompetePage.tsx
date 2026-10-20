import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import type { Compete, BoardRow } from '../api/client'

function Medal({ rank }: { rank: number }) {
  const m = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  if (m) return <span className="text-[18px] w-7 text-center">{m}</span>
  return <span className="w-7 text-center text-[13px] font-bold font-mono text-[#8a8a93]">{rank}</span>
}

function Board({ rows }: { rows: BoardRow[] }) {
  if (!rows.length) return (
    <div className="px-5 py-10 text-center text-[13px] text-[#8a8a93]">
      Пока пусто. Реши первый материал — и ты в топе 🚀
    </div>
  )
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => (
        <motion.div
          key={`${r.rank}-${r.name}`}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i, 12) * 0.02 }}
          className="flex items-center gap-3 px-4 py-2.5"
          style={{
            borderBottom: '1px solid rgba(255,255,255,.05)',
            background: r.is_me
              ? 'linear-gradient(90deg, rgba(34,197,94,.14), transparent 70%)'
              : 'transparent',
          }}
        >
          <Medal rank={r.rank} />
          <span className={`flex-1 min-w-0 truncate text-[14px] ${r.is_me ? 'font-extrabold text-green' : 'font-semibold text-white'}`}>
            {r.name}{r.is_me ? ' · ты' : ''}
          </span>
          <span className="shrink-0 text-[13px] font-bold tabular-nums" style={{ color: r.is_me ? '#4AE885' : '#cfcfd4' }}>
            {r.xp} XP
          </span>
        </motion.div>
      ))}
    </div>
  )
}

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
    <div className="flex-1 flex items-center justify-center text-[13px] text-[#8a8a93]">
      Не удалось загрузить рейтинг
    </div>
  )

  const pos = scope === 'week' ? data.pos_week : data.pos_all
  const posXp = scope === 'week' ? data.week_xp : data.xp
  const rows = scope === 'week' ? data.board_week : data.board_all

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3">

        {/* Моя карточка: ранг + XP + прогресс + стрик */}
        <div className="relative overflow-hidden rounded-[20px] px-5 pt-5 pb-5 mb-4"
          style={{ border: '1px solid rgba(74,232,133,.35)', background: 'radial-gradient(130% 120% at 0% 0%, rgba(34,197,94,.18), transparent 60%), #0D0D11' }}>
          <div className="flex items-center gap-3">
            <div className="text-[40px] leading-none">{data.rank.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2]">Твой ранг</div>
              <div className="text-[22px] font-extrabold text-white leading-tight">{data.rank.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[24px] font-extrabold text-green leading-none tabular-nums">{data.xp}</div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-[#9a9aa2] mt-0.5">XP</div>
            </div>
          </div>

          {data.rank.next_name && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-[#9a9aa2]">До ранга «{data.rank.next_name}»</span>
                <span className="font-bold text-white">ещё {data.rank.to_next} XP</span>
              </div>
              <div className="h-[8px] rounded-full bg-white/[.08] overflow-hidden">
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${data.rank.progress}%` }}
                  transition={{ duration: 0.6 }}
                  style={{ background: 'linear-gradient(90deg,#22C55E,#4AE885)' }} />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-[18px] font-extrabold text-white leading-none">🔥 {data.streak}</div>
              <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#9a9aa2] mt-1">дней подряд</div>
            </div>
            <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-[18px] font-extrabold text-white leading-none">#{data.pos_all ?? '—'}</div>
              <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#9a9aa2] mt-1">за всё время</div>
            </div>
            <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-[18px] font-extrabold text-white leading-none">#{data.pos_week ?? '—'}</div>
              <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#9a9aa2] mt-1">за неделю</div>
            </div>
          </div>
        </div>

        {/* Сколько учатся сегодня */}
        <div className="flex items-center gap-2.5 mb-4 px-4 py-3 rounded-2xl"
          style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
          </span>
          <span className="text-[13px] text-white">
            Сегодня в базе учатся <b className="text-green">{data.today_active}</b> {plural(data.today_active, 'человек', 'человека', 'человек')}
          </span>
        </div>

        {/* Переключатель недели/всё время */}
        <div className="flex gap-1 p-1 rounded-2xl mb-3" style={{ background: '#101014', border: '1px solid rgba(255,255,255,.08)' }}>
          {(['week', 'all'] as const).map(s => (
            <button key={s} onClick={() => setScope(s)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors"
              style={{
                background: scope === s ? 'linear-gradient(180deg,rgba(34,197,94,.24),rgba(34,197,94,.08))' : 'transparent',
                color: scope === s ? '#4AE885' : '#8a8a93',
                border: scope === s ? '1px solid rgba(74,232,133,.5)' : '1px solid transparent',
              }}>
              {s === 'week' ? 'За неделю' : 'За всё время'}
            </button>
          ))}
        </div>

        {pos && (
          <div className="text-[12px] text-[#9a9aa2] mb-2 px-1">
            Ты на <b className="text-white">{pos}-м</b> месте · {posXp} XP
          </div>
        )}

        {/* Таблица лидеров */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
          <Board rows={rows} />
        </div>

        {/* Живая лента */}
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2] font-mono mb-3">
          Живая лента
        </div>
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
          {data.feed.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-[#8a8a93]">Пока тихо. Будь первым!</div>
          ) : data.feed.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span className="text-[16px]">{f.kind === 'certificate' ? '🎓' : f.kind === 'exam' ? '📝' : f.kind === 'chapter' ? '📘' : '⚡'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white truncate">
                  <b className="text-green">{f.name}</b> {f.text}
                </div>
                <div className="text-[10.5px] text-[#8a8a93]">{f.ago}</div>
              </div>
              <span className="shrink-0 text-[12px] font-bold text-[#cfcfd4]">+{f.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
