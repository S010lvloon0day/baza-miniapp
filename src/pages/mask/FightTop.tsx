import { useEffect, useState } from 'react'
import { maskApi } from '../../api/mask'
import type { FightTop as Top } from '../../api/mask'

const fmt = (t: number) => { const s = Math.round(t / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
const medal = ['🥇', '🥈', '🥉']

/** Таблица лидеров драки: самая быстрая победа каждого игрока. reload — сменить, чтобы перечитать (после боя). */
export default function FightTop({ start = 1, reload = 0, rows = 132 }: { start?: 1 | 2; reload?: number; rows?: number }) {
  const [lv, setLv] = useState<1 | 2>(start)
  const [top, setTop] = useState<Top | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let alive = true; setErr(false)
    maskApi.fightTop(lv).then(t => { if (alive) setTop(t) }).catch(() => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [lv, reload])
  return (
    <div className="mt-3 text-left">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <b className="text-[13px]">Самые быстрые победы</b>
        {top && top.lv === lv && top.my_best > 0 && <span className="text-[12px] text-gray">мой: <b className="text-white tabular-nums">{fmt(top.my_best)}</b>{top.my_pos ? ` · ${top.my_pos} место` : ''}</span>}
      </div>
      <div className="grid grid-cols-2 gap-1 mb-1.5" role="tablist" aria-label="Какие рекорды">
        {([1, 2] as const).map(k => (
          <button key={k} role="tab" aria-selected={lv === k} onClick={() => setLv(k)}
            className={`h-8 rounded-[10px] text-[12.5px] font-medium ${lv === k ? 'bg-green text-black' : 'bg-white/[.07]'}`}>{k === 1 ? 'Оба босса подряд' : 'Призрак'}</button>
        ))}
      </div>
      {err ? <p className="text-[12.5px] text-gray2">Не удалось загрузить рекорды — проверь связь.</p>
        : !top || top.lv !== lv ? <p className="text-[12.5px] text-gray2">Загрузка…</p>
        : top.top.length === 0 ? <p className="text-[12.5px] text-gray2">Пока никто не победил — стань первым.</p> : (
        <div className="overflow-y-auto rounded-[14px] bg-white/[.04]" style={{ maxHeight: rows }}>
          {top.top.map(r => (
            <div key={r.rank} className={`flex items-center gap-2 px-3 py-[5px] text-[13px] ${r.is_me ? 'text-green' : ''}`}>
              <span className="w-6 text-center">{medal[r.rank - 1] ?? r.rank}</span>
              <span className="flex-1 truncate">{r.name}{r.is_me ? ' (ты)' : ''}</span>
              <b className="tabular-nums">{fmt(r.ticks)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
