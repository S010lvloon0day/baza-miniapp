import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Profile, Config, Plan } from '../api/client'

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
  const [paying, setPaying] = useState<'crypto' | 'stars' | 'rub' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
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

  const buyWithStars = async () => {
    if (!selected || paying) return
    setPaying('stars')
    setMsg(null)
    try {
      const { invoice_link } = await api.starsInvoice(selected.days)
      if (tg?.openInvoice) {
        tg.openInvoice(invoice_link, (status: string) => {
          setPaying(null)
          if (status === 'paid') {
            setMsg('✅ Оплата прошла! Premium активируется в течение нескольких секунд.')
            setTimeout(() => {
              api.profile().then(p => { if (p) setProf(p) }).catch(() => {})
            }, 3000)
          } else if (status !== 'cancelled') {
            setMsg('Платёж не завершён. Попробуйте ещё раз.')
          } else {
            setMsg(null)
          }
        })
      } else {
        tg?.openLink?.(invoice_link)
        setPaying(null)
      }
    } catch {
      setMsg('Ошибка создания счёта. Попробуйте позже.')
      setPaying(null)
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
          </div>
        </div>

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

                <div className="h-px bg-bd mx-4" />

                {/* Stars */}
                {selected.stars != null && (
                  <>
                    <button
                      disabled={!!paying}
                      onClick={buyWithStars}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-s2 disabled:opacity-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-[rgba(255,210,80,.10)] border border-[rgba(255,210,80,.3)] flex items-center justify-center text-[16px] shrink-0">
                        ⭐
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-[13px] font-semibold text-white">Telegram Stars</div>
                        <div className="text-[11px] text-gray">{selected.stars} звёзд · мгновенно</div>
                      </div>
                      {paying === 'stars'
                        ? <span className="text-[11px] text-gray animate-pulse">Открываю…</span>
                        : <span className="text-[11px] text-[rgba(255,210,80,1)] font-semibold">{prof?.is_premium ? 'Продлить' : 'Оплатить'}</span>}
                    </button>
                    <div className="h-px bg-bd mx-4" />
                  </>
                )}

                {/* RUB */}
                {selected.rub != null && (
                  <button
                    disabled
                    className="flex items-center gap-3 px-4 py-3.5 opacity-50 cursor-not-allowed transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[rgba(76,175,80,.10)] border border-[rgba(76,175,80,.35)] flex items-center justify-center text-[16px] shrink-0">
                      💳
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[13px] font-semibold text-white">Банковская карта <span className="text-gray font-normal">(временно недоступно)</span></div>
                      <div className="text-[11px] text-gray">Tegro.money · {selected.rub} ₽</div>
                    </div>
                  </button>
                )}
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
