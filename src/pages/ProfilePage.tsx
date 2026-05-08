import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Profile, Config } from '../api/client'

const tg = (window as any).Telegram?.WebApp

interface Props {
  scrollToPlans?: boolean
  onScrolled?: () => void
}

export default function ProfilePage({ scrollToPlans, onScrolled }: Props) {
  const [prof, setProf]     = useState<Profile | null>(null)
  const [cfg, setCfg]       = useState<Config>({ plans: [], currency: 'USDT' })
  const [loading, setLoading] = useState(true)
  const [buying, setBuying]   = useState<number | null>(null)
  const [buyingCrypto, setBuyingCrypto] = useState<number | null>(null)
  const [starsMsg, setStarsMsg] = useState<string | null>(null)
  const plansRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.profile().catch(() => null), api.config().catch(() => null)])
      .then(([p, c]) => {
        if (p) setProf(p)
        if (c) setCfg(c)
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

  const buyWithCrypto = async (days: number) => {
    if (buyingCrypto === days) return
    setBuyingCrypto(days)
    setStarsMsg(null)
    try {
      const { pay_url } = await api.cryptoInvoice(days)
      if (tg?.openLink) {
        tg.openLink(pay_url)
      } else {
        window.open(pay_url, '_blank')
      }
      setStarsMsg(`Счёт создан. После оплаты напишите /start боту для проверки.`)
    } catch {
      setStarsMsg('Ошибка создания счёта. Попробуйте позже.')
    } finally {
      setBuyingCrypto(null)
    }
  }

  // Telegram Stars payment via openInvoice
  const buyWithStars = async (days: number) => {
    if (buying === days) return
    setBuying(days)
    setStarsMsg(null)
    try {
      const { invoice_link } = await api.starsInvoice(days)
      if (tg?.openInvoice) {
        tg.openInvoice(invoice_link, (status: string) => {
          setBuying(null)
          if (status === 'paid') {
            setStarsMsg('✅ Оплата прошла! Premium активируется в течение нескольких секунд.')
            // Refresh profile after a short delay so the bot can process the payment
            setTimeout(() => {
              api.profile().then(p => { if (p) setProf(p) }).catch(() => {})
            }, 3000)
          } else if (status === 'cancelled') {
            setStarsMsg(null)
          } else {
            setStarsMsg('Платёж не завершён. Попробуйте ещё раз.')
          }
        })
      } else {
        // Fallback for older Telegram versions
        tg?.openLink?.(invoice_link)
        setBuying(null)
      }
    } catch {
      setStarsMsg('Ошибка создания счёта. Попробуйте позже.')
      setBuying(null)
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

        {/* Profile card */}
        <div className="relative premium-surface premium-glow border border-bd rounded p-6 text-center overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #C7A6FF, #F3C77A, transparent)' }} />
          <div className="w-[72px] h-[72px] bg-[rgba(157,92,255,.12)] border-2 border-green rounded-full flex items-center justify-center mx-auto mb-4 text-[28px] font-bold text-violet shadow-glow">
            {name[0].toUpperCase()}
          </div>
          <div className="text-[18px] font-bold mb-1">{name}</div>
          <div className="text-[12px] text-gray2 tracking-wider mb-3">ID: {prof?.user_id || '—'}</div>
          {prof?.is_premium ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(157,92,255,.12)] border border-green rounded-sm text-[11px] font-bold text-violet tracking-wider uppercase">
              💎 Premium · до {prof.premium_until || '—'}
            </span>
          ) : (
            <span className="inline-flex px-3 py-1 border border-bd2 rounded-sm text-[11px] text-gray tracking-wide">
              Бесплатный доступ
            </span>
          )}
        </div>

        {/* Stars message */}
        {starsMsg && (
          <div className="px-4 py-3 rounded border border-green bg-[rgba(157,92,255,.08)] text-[13px] text-white/80">
            {starsMsg}
          </div>
        )}

        {/* Plans */}
        {!prof?.is_premium && cfg.plans.length > 0 && (
          <>
            <div ref={plansRef} className="text-[11px] font-bold tracking-[2px] uppercase text-gray pt-1">Тарифные планы</div>
            {cfg.plans.map(p => (
              <div key={p.days} className="premium-surface border border-bd rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[14px] font-semibold mb-0.5">{p.label}</div>
                    <div className="text-[12px] text-gray">{p.price} {cfg.currency}</div>
                  </div>
                  <button
                    disabled={buyingCrypto === p.days}
                    onClick={() => buyWithCrypto(p.days)}
                    className="px-4 py-2 border border-green text-violet text-[12px] font-semibold uppercase tracking-wide rounded-sm active:bg-[rgba(157,92,255,.12)] disabled:opacity-50">
                    {buyingCrypto === p.days ? '...' : 'Купить'}
                  </button>
                </div>

                {/* Stars payment row */}
                {p.stars != null && (
                  <button
                    disabled={buying === p.days}
                    onClick={() => buyWithStars(p.days)}
                    className="w-full h-10 flex items-center justify-center gap-2 border border-[rgba(255,210,80,.4)] text-[rgba(255,210,80,1)] text-[12px] font-semibold uppercase tracking-wide rounded-sm active:bg-[rgba(255,210,80,.08)] disabled:opacity-50">
                    {buying === p.days ? (
                      <span className="animate-pulse">Открываю...</span>
                    ) : (
                      <>⭐ {p.stars} звёзд</>
                    )}
                  </button>
                )}
              </div>
            ))}

            <p className="text-[11px] text-gray leading-relaxed">
              Оплата звёздами проходит мгновенно прямо в Telegram. Доступ активируется автоматически.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
