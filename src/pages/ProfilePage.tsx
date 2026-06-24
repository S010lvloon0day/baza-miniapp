import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Profile, Config, Plan, Contributor } from '../api/client'

const tg = (window as any).Telegram?.WebApp

interface Props {
  scrollToPlans?: boolean
  onScrolled?: () => void
}

export default function ProfilePage({ scrollToPlans, onScrolled }: Props) {
  const [prof, setProf]   = useState<Profile | null>(null)
  const [cfg, setCfg]     = useState<Config>({ plans: [], currency: 'USDT' })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [paying, setPaying] = useState<'crypto' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [top, setTop] = useState<Contributor[]>([])
  const [totalContrib, setTotalContrib] = useState(0)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myApproved, setMyApproved] = useState(0)
  const plansRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.profile().catch(() => null), api.config().catch(() => null)])
      .then(([p, c]) => {
        if (p) setProf(p)
        if (c) {
          setCfg(c)
          if (c.plans.length) setSelected(c.plans[0])
        }
      })
      .finally(() => setLoading(false))
    api.contributors().then(r => {
      setTop(r.contributors ?? [])
      setTotalContrib(r.total ?? 0)
      setMyRank(r.my_rank ?? null)
      setMyApproved(r.my_approved ?? 0)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!scrollToPlans || loading) return
    setTimeout(() => {
      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onScrolled?.()
    }, 100)
  }, [scrollToPlans, loading])

  const buyWithCrypto = async () => {
    if (!selected || paying) return
    setPaying('crypto')
    setMsg(null)
    try {
      const { pay_url } = await api.cryptoInvoice(selected.days)
      tg?.openLink ? tg.openLink(pay_url) : window.open(pay_url, '_blank')
      setMsg('Счёт создан. После оплаты напишите /start боту.')
    } catch {
      setMsg('Ошибка создания счёта. Попробуйте позже.')
    } finally {
      setPaying(null)
    }
  }


  const openSubmit = () => {
    const u = cfg.bot_username
    if (!u) return
    const url = `https://t.me/${u}?start=submit`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url)
      tg.close?.()           // сворачиваем мини-апп — юзер уходит в чат с ботом
    } else {
      window.open(url, '_blank')
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  const name = prof?.name || 'Пользователь'

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="p-4 flex flex-col gap-3">

        {/* Profile card — terminal config file */}
        <div className="terminal-glow overflow-hidden" style={{ background: '#04040C', border: '1px solid rgba(255,255,255,.09)' }}>
          {/* Title bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.06)' }}>
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FF5F57', boxShadow: '0 0 5px rgba(255,95,87,.6)' }} />
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FEBC2E', boxShadow: '0 0 5px rgba(254,188,46,.6)' }} />
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#28C840', boxShadow: '0 0 5px rgba(40,200,64,.6)' }} />
            <span className="font-mono text-[10px] text-gray2 flex-1 text-center">cat ~/.config/user.conf</span>
          </div>
          {/* Config content */}
          <div className="px-4 py-4 font-mono text-[11px] leading-[1.7]">
            <div className="text-gray2/60 mb-2"># USER CONFIGURATION — READ ONLY</div>
            <div className="mb-3">
              <div style={{ color: '#C7A6FF' }}>[identity]</div>
              <div className="pl-4">
                <span className="text-gray">name</span>
                <span className="text-gray2">     = </span>
                <span className="text-white">{name}</span>
              </div>
              <div className="pl-4">
                <span className="text-gray">uid</span>
                <span className="text-gray2">      = </span>
                <span className="text-white/50">{prof?.user_id || '0000'}</span>
              </div>
            </div>
            <div>
              <div style={{ color: '#C7A6FF' }}>[access]</div>
              <div className="pl-4">
                <span className="text-gray">tier</span>
                <span className="text-gray2">     = </span>
                {prof?.is_premium
                  ? <span style={{ color: '#28C840' }}>premium</span>
                  : <span className="text-gray2">free</span>}
              </div>
              {prof?.is_premium && prof.premium_until && (
                <div className="pl-4">
                  <span className="text-gray">expires</span>
                  <span className="text-gray2">  = </span>
                  <span className="text-white/50">{prof.premium_until}</span>
                </div>
              )}
              <div className="pl-4">
                <span className="text-gray">status</span>
                <span className="text-gray2">   = </span>
                {prof?.is_premium
                  ? <span style={{ color: '#28C840' }}>● active</span>
                  : <span className="text-gray2">○ free_tier</span>}
              </div>
            </div>
            <div className="mt-3">
              <div style={{ color: '#C7A6FF' }}>[contributions]</div>
              <div className="pl-4">
                <span className="text-gray">submitted</span>
                <span className="text-gray2"> = </span>
                <span className="text-white">{prof?.contributions_total ?? 0}</span>
              </div>
              <div className="pl-4">
                <span className="text-gray">approved</span>
                <span className="text-gray2">&nbsp;&nbsp;= </span>
                <span style={{ color: '#28C840' }}>{prof?.contributions_approved ?? 0}</span>
                <span className="text-gray2"> · </span>
                <span className="text-white/50">+{(prof?.contributions_approved ?? 0) * 2}д premium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Предложить материал — открывает бота с готовым флоу подачи */}
        {cfg.bot_username && (
          <button
            onClick={openSubmit}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-s2 transition-colors"
            style={{ background: 'rgba(157,92,255,.06)', border: '1px solid rgba(157,92,255,.3)' }}
          >
            <div className="w-9 h-9 rounded-full bg-[rgba(157,92,255,.12)] border border-[rgba(157,92,255,.3)] flex items-center justify-center text-[16px] shrink-0">
              📤
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-semibold text-white">Предложить материал</div>
              <div className="text-[11px] text-gray">После модерации добавим в базу знаний</div>
            </div>
            <span className="text-[18px] text-gray2">›</span>
          </button>
        )}

        {/* Топ-контрибьюторов базы */}
        {top.length > 0 && (
          <div className="terminal-glow overflow-hidden" style={{ background: '#04040C', border: '1px solid rgba(255,255,255,.09)' }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.06)' }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FF5F57', boxShadow: '0 0 5px rgba(255,95,87,.6)' }} />
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FEBC2E', boxShadow: '0 0 5px rgba(254,188,46,.6)' }} />
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#28C840', boxShadow: '0 0 5px rgba(40,200,64,.6)' }} />
              <span className="font-mono text-[10px] text-gray2 flex-1 text-center">🏆 top_contributors.log</span>
            </div>
            <div className="px-4 py-3 font-mono text-[11px] leading-[2]">
              <div className="text-gray2/60 mb-1"># топ-{top.length} из {totalContrib} авторов</div>
              {top.map((c, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                const me = c.user_id === prof?.user_id
                return (
                  <div key={c.user_id} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-gray2">{medal}</span>
                    <span className={`flex-1 truncate ${me ? 'text-green font-semibold' : 'text-white/85'}`}>
                      {c.username ? `@${c.username}` : 'аноним'}{me ? ' (вы)' : ''}
                    </span>
                    <span style={{ color: '#28C840' }}>{c.approved}</span>
                  </div>
                )
              })}
              {/* Личное место, если пользователь вне видимого топа */}
              {myRank !== null && myRank > top.length && (
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-bd/50">
                  <span className="w-6 shrink-0 text-center text-gray2">#{myRank}</span>
                  <span className="flex-1 truncate text-green font-semibold">вы</span>
                  <span style={{ color: '#28C840' }}>{myApproved}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans */}
        {cfg.plans.length > 0 && (
          <>
            <div ref={plansRef} className="text-[11px] font-mono tracking-[1px] text-green/70 pt-1">
              // {prof?.is_premium ? 'продлить_premium' : 'оформить_premium'}
            </div>
            {prof?.is_premium && (
              <div className="text-[11px] text-gray px-0.5 -mt-1">
                Дни добавятся к текущей подписке
              </div>
            )}

            {/* Period selector */}
            <div className="flex gap-1.5">
              {cfg.plans.map(p => {
                const active = selected?.days === p.days
                return (
                  <button
                    key={p.days}
                    onClick={() => { setSelected(p); setMsg(null) }}
                    className="flex-1 flex flex-col py-3 px-2.5 text-left transition-colors"
                    style={{
                      border: active ? '1px solid rgba(255,255,255,.25)' : '1px solid rgba(255,255,255,.07)',
                      background: active ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)',
                    }}
                  >
                    <span className="font-mono text-[9px] text-gray2 mb-1">
                      {active ? '▶' : '·'} --days={p.days}
                    </span>
                    <span className="text-[15px] font-bold text-white leading-tight">{p.label}</span>
                    <span className={`font-mono text-[11px] mt-0.5 ${active ? 'text-white/60' : 'text-gray2'}`}>
                      {p.price} {cfg.currency}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Payment methods for selected plan */}
            {selected && (
              <div className="premium-surface border border-bd rounded overflow-hidden flex flex-col gap-px">

                {/* USDT */}
                <button
                  disabled={!!paying}
                  onClick={buyWithCrypto}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-s2 disabled:opacity-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[rgba(157,92,255,.12)] border border-[rgba(157,92,255,.3)] flex items-center justify-center text-[16px] shrink-0">
                    💵
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-semibold text-white">Криптовалюта</div>
                    <div className="text-[11px] text-gray">CryptoBot · {selected.price} {cfg.currency}</div>
                  </div>
                  {paying === 'crypto'
                    ? <span className="text-[11px] text-gray animate-pulse">Открываю…</span>
                    : <span className="text-[11px] text-violet font-semibold">{prof?.is_premium ? 'Продлить' : 'Оплатить'}</span>}
                </button>

              </div>
            )}

            {/* Status message */}
            {msg && (
              <div className="px-4 py-3 rounded border border-green bg-[rgba(157,92,255,.08)] text-[13px] text-white/80">
                {msg}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
