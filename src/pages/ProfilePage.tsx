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
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myApproved, setMyApproved] = useState(0)
  const plansRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.profile().catch(() => null), api.config().catch(() => null)])
      .then(([p, c]) => {
        if (p) setProf(p)
        if (c) {
          setCfg(c)
          if (c.plans.length) setSelected(c.plans[c.plans.length - 1])
        }
      })
      .finally(() => setLoading(false))
    api.contributors().then(r => {
      setTop(r.contributors ?? [])
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
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="p-4">

        {/* Avatar + name + premium badge */}
        <div className="flex items-center gap-3.5 mb-[18px]">
          <div
            className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center text-[20px] font-extrabold shrink-0 overflow-hidden"
            style={{ background: 'radial-gradient(circle,rgba(34,197,94,.3),rgba(34,197,94,.05) 65%,transparent)', boxShadow: '0 0 18px rgba(34,197,94,.35)', color: '#4AE885' }}
          >
            {prof?.photo_url
              ? <img src={prof.photo_url} alt={name} className="w-full h-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold truncate">{name}</div>
            {prof?.is_premium ? (
              <div className="inline-flex items-center gap-[5px] mt-[3px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)' }}>
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: '#4AE885' }} />
                <span className="text-[10px] font-bold tracking-[.5px]" style={{ color: '#4AE885' }}>
                  PREMIUM{prof.premium_until ? ` · до ${prof.premium_until}` : ''}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-[5px] mt-[3px] px-2 py-0.5 rounded-md bg-white/[.06] border border-white/[.08]">
                <span className="text-[10px] font-bold tracking-[.5px] text-gray2">FREE</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats card */}
        <div className="rounded-2xl px-[18px] py-0 mb-3.5" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
          <div className="flex justify-between text-[13px]" style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ color: '#8a8a93' }}>Предложено материалов</span>
            <span className="font-bold">{prof?.contributions_total ?? 0}</span>
          </div>
          <div className="flex justify-between text-[13px]" style={{ padding: '6px 0' }}>
            <span style={{ color: '#8a8a93' }}>Одобрено</span>
            <span className="font-bold" style={{ color: '#4AE885' }}>
              {prof?.contributions_approved ?? 0} · +{(prof?.contributions_approved ?? 0) * 2}д premium
            </span>
          </div>
        </div>

        {/* Предложить материал */}
        {cfg.bot_username && (
          <button
            onClick={openSubmit}
            className="w-full flex items-center gap-3 rounded-2xl mb-5 cursor-pointer transition-colors duration-150 border-white/[.08] active:border-[rgba(34,197,94,.4)] active:bg-[#131318]"
            style={{ padding: '13px 16px', borderWidth: 1, borderStyle: 'solid', background: '#101014' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 baza-ring-pulse"
              style={{ background: 'radial-gradient(circle,rgba(34,197,94,.28),rgba(34,197,94,.05) 65%,transparent)', color: '#4AE885' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[13px] font-bold">Предложить материал</div>
              <div className="text-[11px]" style={{ color: '#8a8a93' }}>После модерации добавим в базу</div>
            </div>
            <span className="font-extrabold" style={{ color: '#6a6a75' }}>›</span>
          </button>
        )}

        {/* Топ контрибьюторов */}
        {top.length > 0 && (
          <div className="mb-6">
            <div className="text-[11px] font-bold uppercase mb-3" style={{ letterSpacing: '1.5px', color: '#9a9aa2' }}>Топ контрибьюторов</div>
            <div className="rounded-[14px]" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014', padding: '0 16px' }}>
              {top.slice(0, 3).map((c, i) => {
                const me = c.user_id === prof?.user_id
                return (
                  <div key={c.user_id} className="flex items-center gap-2.5" style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    <span className="w-[18px] text-center text-[12px] font-mono shrink-0" style={{ color: '#6a6a75' }}>{i + 1}</span>
                    <span className={`flex-1 truncate text-[13px] font-semibold ${me ? 'text-green' : ''}`} style={me ? undefined : { color: '#e4e4e8' }}>
                      {c.username ? `@${c.username}` : 'аноним'}{me ? ' (вы)' : ''}
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: '#4AE885' }}>{c.approved}</span>
                  </div>
                )
              })}
              {myRank !== null && myRank > 3 && (
                <div className="flex items-center gap-2.5" style={{ padding: '9px 0' }}>
                  <span className="w-[18px] text-center text-[12px] font-mono shrink-0" style={{ color: '#6a6a75' }}>{myRank}</span>
                  <span className="flex-1 truncate text-[13px] font-semibold text-green">вы</span>
                  <span className="text-[13px] font-bold" style={{ color: '#4AE885' }}>{myApproved}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans */}
        {cfg.plans.length > 0 && (
          <div ref={plansRef}>
            <div className="text-[11px] font-bold uppercase mb-3" style={{ letterSpacing: '1.5px', color: '#9a9aa2' }}>
              {prof?.is_premium ? 'Продлить premium' : 'Оформить premium'}
            </div>
            {prof?.is_premium && (
              <div className="text-[11px] text-gray mb-2 -mt-1.5">Дни добавятся к текущей подписке</div>
            )}

            {/* Period selector */}
            <div className="flex gap-2 mb-3">
              {cfg.plans.map(p => {
                const active = selected?.days === p.days
                return (
                  <button
                    key={p.days}
                    onClick={() => { setSelected(p); setMsg(null) }}
                    className="flex-1 text-center rounded-xl transition-transform duration-150 active:-translate-y-0.5"
                    style={{
                      padding: '12px 6px',
                      border: `1px solid ${active ? 'rgba(34,197,94,.6)' : 'rgba(255,255,255,.08)'}`,
                      background: '#101014',
                    }}
                  >
                    <div className="text-[13px] font-extrabold text-white">{p.label}</div>
                    <div className="text-[11px] mt-[3px]" style={{ color: '#8a8a93' }}>${p.price}</div>
                  </button>
                )
              })}
            </div>

            {/* Pay */}
            {selected && (
              <button
                disabled={!!paying}
                onClick={buyWithCrypto}
                className="w-full rounded-xl bg-white text-bg text-[14px] font-bold disabled:opacity-50 transition-transform duration-150 active:-translate-y-0.5"
                style={{ padding: 14 }}
              >
                {paying === 'crypto'
                  ? 'Открываю…'
                  : `${prof?.is_premium ? 'Продлить' : 'Оплатить'} ${selected.price}$ · крипто`}
              </button>
            )}

            {/* Status message */}
            {msg && (
              <div className="mt-3 px-4 py-3 rounded-xl text-[13px] text-white/80" style={{ border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.06)' }}>
                {msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
