import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api/client'
import type { Profile, Config, Plan } from '../api/client'
import { useRubPayment, fmtRub } from '../hooks/useRubPayment'

const tg = (window as any).Telegram?.WebApp

interface Props {
  scrollToPlans?: boolean
  onScrolled?: () => void
  onCompete?: () => void
}

function RankCard({ onOpen }: { onOpen?: () => void }) {
  const [c, setC] = useState<import('../api/client').Compete | null>(null)
  useEffect(() => { api.compete().then(setC).catch(() => {}) }, [])
  if (!c) return null
  return (
    <div onClick={onOpen}
      className="rounded-2xl px-[18px] py-4 mb-3.5 cursor-pointer transition-transform duration-150 active:-translate-y-0.5"
      style={{ border: '1px solid rgba(74,232,133,.35)', background: 'radial-gradient(130% 120% at 0% 0%, rgba(34,197,94,.16), transparent 60%), #0D0D11' }}>
      <div className="flex items-center gap-3">
        <span className="text-[30px] leading-none">{c.rank.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: '#9a9aa2' }}>Твой ранг</div>
          <div className="text-[16px] font-extrabold text-white leading-tight">{c.rank.name}</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#9a9aa2' }}>
            {c.xp} XP · 🔥 {c.streak} дн · {c.pos_all ? `#${c.pos_all} в топе` : 'ещё не в топе'}
          </div>
        </div>
        <span className="font-extrabold text-[18px] shrink-0 text-green">›</span>
      </div>
    </div>
  )
}

function CertVerifyBox() {
  const [id, setId] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<import('../api/client').CertVerify | null>(null)
  const check = async () => {
    const v = id.trim()
    if (!v) return
    setBusy(true); setRes(null)
    try { setRes(await api.certificateVerify(v)) }
    catch { setRes({ valid: false, reason: 'error' }) }
    finally { setBusy(false) }
  }
  return (
    <div className="mx-4 mt-4 rounded-2xl p-4" style={{ border: '1px solid rgba(212,175,55,.25)', background: 'radial-gradient(120% 120% at 0% 0%, rgba(212,175,55,.06), transparent 60%), #0d0c0a' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[16px]">🔎</span>
        <div className="text-[14px] font-bold text-white">Проверка сертификата</div>
      </div>
      <div className="text-[11px] leading-snug mb-3" style={{ color: '#b8a97a' }}>
        Введи ID сертификата (например BZ-318-2026-7F3A9C), чтобы убедиться, что он настоящий и кому выдан.
      </div>
      <div className="flex gap-2">
        <input value={id} onChange={e => setId(e.target.value)} placeholder="BZ-..."
          className="flex-1 px-3 py-2.5 rounded-xl text-[13px] text-white outline-none"
          style={{ background: '#101014', border: '1px solid rgba(212,175,55,.3)' }} />
        <button onClick={check} disabled={busy}
          className="px-4 py-2.5 rounded-xl font-extrabold text-[13px] disabled:opacity-50"
          style={{ background: 'linear-gradient(180deg,#f3e3a3,#d4af37)', color: '#2a2200' }}>
          {busy ? '…' : 'Проверить'}
        </button>
      </div>
      {res && (
        <div className="mt-3">
          {res.valid ? (
            <div className="rounded-xl p-3 text-[12px]" style={{ background: 'rgba(40,200,64,.08)', border: '1px solid rgba(40,200,64,.4)', color: '#4AE885' }}>
              ✅ Подлинный. Владелец: <b>{res.username}</b> · {res.language} · {res.date}.<br />Уроков: {res.lessons_total}, задач: {res.tasks_total}. Код: {res.code}.
            </div>
          ) : (
            <div className="rounded-xl p-3 text-[12px]" style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.4)', color: '#ff8a8a' }}>
              ⚠️ {res.reason === 'not_found' ? 'Такого сертификата нет в реестре — вероятно, подделка.' : res.revoked ? 'Сертификат отозван.' : 'Не удалось проверить, попробуй ещё раз.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage({ scrollToPlans, onScrolled, onCompete }: Props) {
  const [prof, setProf]   = useState<Profile | null>(null)
  const [cfg, setCfg]     = useState<Config>({ plans: [], currency: 'USDT' })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [paying, setPaying] = useState<'crypto' | 'stars' | 'rub' | null>(null)
  const [rubTx, setRubTx] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
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
      const r = await api.cryptoInvoice(selected.days)
      if (!r.pay_url || !r.invoice_id) { setMsg('Не удалось создать счёт. Попробуйте позже.'); return }
      setInvoiceId(r.invoice_id)
      tg?.openLink ? tg.openLink(r.pay_url) : window.open(r.pay_url, '_blank')
      setMsg('Счёт создан. После оплаты нажмите «Проверить оплату».')
    } catch {
      setMsg('Ошибка создания счёта. Попробуйте позже.')
    } finally {
      setPaying(null)
    }
  }

  const buyWithRub = async () => {
    if (!selected || paying) return
    setPaying('rub')
    setMsg(null)
    try {
      const r = await api.rubInvoice(selected.days)
      if (!r.payment_url || !r.transaction_id) { setMsg('Не удалось создать платёж. Попробуйте позже.'); return }
      setRubTx(r.transaction_id)
      tg?.openLink ? tg.openLink(r.payment_url) : window.open(r.payment_url, '_blank')
      setMsg('Оплатите через приложение банка (СБП) — Premium включится сам, обычно за минуту.')
    } catch {
      setMsg('Ошибка создания платежа. Попробуйте позже.')
    } finally {
      setPaying(null)
    }
  }

  useRubPayment(rubTx, status => {
    setRubTx(null)
    if (status === 'paid') {
      setMsg('✅ Оплата получена, Premium активирован!')
      api.profile().catch(() => null).then(p => { if (p) setProf(p) })
    } else {
      setMsg('Оплата не прошла или отменена. Можно попробовать ещё раз.')
    }
  })

  const buyWithStars = async () => {
    if (!selected || paying) return
    setPaying('stars')
    setMsg(null)
    try {
      const r = await api.starsInvoice(selected.days)
      if (!r.link) { setMsg('Не удалось создать счёт Stars. Попробуйте позже.'); return }
      const done = (status: string) => {
        if (status === 'paid') {
          setMsg('✅ Оплата получена! Обновляю профиль…')
          api.profile().catch(() => null).then(p => { if (p) setProf(p) })
        } else if (status === 'failed') {
          setMsg('Оплата не прошла. Попробуйте ещё раз.')
        }
      }
      if (tg?.openInvoice) tg.openInvoice(r.link, done)
      else window.open(r.link, '_blank')
    } catch {
      setMsg('Ошибка создания счёта Stars. Попробуйте позже.')
    } finally {
      setPaying(null)
    }
  }

  const checkPayment = async () => {
    if (!invoiceId || checking) return
    setChecking(true)
    setMsg(null)
    try {
      const r = await api.cryptoInvoiceConfirm(invoiceId)
      if (r.ok) {
        const p = await api.profile().catch(() => null)
        if (p) setProf(p)
        setInvoiceId(null)
        setMsg('✅ Premium активирован!')
      } else if (r.status && r.status !== 'paid') {
        setMsg('Оплата ещё не поступила — подождите минуту и проверьте снова.')
      } else {
        setMsg('Не удалось подтвердить оплату. Попробуйте позже.')
      }
    } catch {
      setMsg('Ошибка проверки. Попробуйте позже.')
    } finally {
      setChecking(false)
    }
  }

  // Автопроверка после создания счёта: опрашиваем подтверждение и оживаем при
  // возврате в мини-апп из CryptoBot. Останавливаемся, как только premium активирован.
  useEffect(() => {
    if (!invoiceId) return
    let cancelled = false
    let attempts = 0
    const tryConfirm = async () => {
      try {
        const r = await api.cryptoInvoiceConfirm(invoiceId)
        if (!cancelled && r.ok) {
          const p = await api.profile().catch(() => null)
          if (p && !cancelled) setProf(p)
          if (!cancelled) { setInvoiceId(null); setMsg('✅ Premium активирован!') }
        }
      } catch { /* тихо игнорируем во время фонового опроса */ }
    }
    const id = setInterval(() => {
      attempts++
      if (cancelled || attempts > 45) { clearInterval(id); return }  // ~3 мин при 4с
      tryConfirm()
    }, 4000)
    const onFocus = () => tryConfirm()
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [invoiceId])

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

        {/* Мой ранг — вход в рейтинг/соревнование */}
        <RankCard onOpen={onCompete} />

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
                    onClick={() => { setSelected(p); setMsg(null); setPayOpen(false) }}
                    className="flex-1 text-center rounded-xl transition-transform duration-150 active:-translate-y-0.5"
                    style={{
                      padding: '12px 6px',
                      border: `1px solid ${active ? 'rgba(34,197,94,.6)' : 'rgba(255,255,255,.08)'}`,
                      background: '#101014',
                    }}
                  >
                    <div className="text-[13px] font-extrabold text-white">{p.label}</div>
                    {p.rub ? <div className="text-[12.5px] font-bold mt-[3px] text-green">{fmtRub(p.rub)}</div> : null}
                    <div className="text-[11px] mt-[2px]" style={{ color: '#8a8a93' }}>${p.price}</div>
                    {p.stars ? <div className="text-[11px] mt-[1px]" style={{ color: '#E8B84A' }}>{p.stars}⭐</div> : null}
                  </button>
                )
              })}
            </div>

            {/* Pay — одна кнопка, способ выбирается в выпадающем меню */}
            {selected && (() => {
              const act = prof?.is_premium ? 'Продлить' : 'Оплатить'
              const methods = [
                selected.rub ? {
                  key: 'rub', label: 'СБП · банковским приложением', amount: fmtRub(selected.rub),
                  color: '#4AE885', onClick: buyWithRub,
                } : null,
                {
                  key: 'crypto', label: 'Криптовалюта', amount: `${selected.price}$`,
                  color: '#ffffff', onClick: buyWithCrypto,
                },
                selected.stars ? {
                  key: 'stars', label: 'Telegram Stars', amount: `${selected.stars}⭐`,
                  color: '#E8B84A', onClick: buyWithStars,
                } : null,
              ].filter(Boolean) as { key: string; label: string; amount: string; color: string; onClick: () => void }[]
              const primaryAmount = selected.rub ? fmtRub(selected.rub) : `${selected.price}$`

              return (
                <div className="flex flex-col">
                  <button
                    disabled={!!paying}
                    onClick={() => setPayOpen(o => !o)}
                    aria-expanded={payOpen}
                    className="w-full rounded-xl text-[14px] font-extrabold text-black disabled:opacity-50 transition-transform duration-150 active:-translate-y-0.5 flex items-center justify-center gap-2"
                    style={{ padding: 14, background: 'linear-gradient(180deg,#4AE885,#22C55E)', boxShadow: '0 6px 20px rgba(34,197,94,.3)' }}
                  >
                    {paying
                      ? 'Открываю…'
                      : <>{act} · {primaryAmount}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: payOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </>}
                  </button>

                  <AnimatePresence initial={false}>
                    {payOpen && !paying && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="text-[10px] font-bold uppercase tracking-[1.5px] px-1" style={{ color: '#6a6a75' }}>
                            Способ оплаты
                          </div>
                          {methods.map(m => (
                            <button
                              key={m.key}
                              onClick={() => { setPayOpen(false); m.onClick() }}
                              className="w-full flex items-center gap-3 rounded-xl text-left active:-translate-y-0.5 transition-transform duration-150"
                              style={{ padding: '12px 14px', border: '1px solid rgba(255,255,255,.1)', background: '#101014' }}
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                              <span className="flex-1 text-[13.5px] font-semibold text-white">{m.label}</span>
                              <span className="text-[13.5px] font-bold" style={{ color: m.color === '#ffffff' ? '#e4e4e8' : m.color }}>{m.amount}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })()}

            {/* Проверка оплаты — появляется после создания счёта */}
            {invoiceId && (
              <button
                disabled={checking}
                onClick={checkPayment}
                className="w-full mt-2 rounded-xl text-[14px] font-bold disabled:opacity-50 transition-transform duration-150 active:-translate-y-0.5"
                style={{ padding: 14, border: '1px solid rgba(34,197,94,.5)', background: 'rgba(34,197,94,.08)', color: '#4AE885' }}
              >
                {checking ? 'Проверяю…' : 'Проверить оплату'}
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
      <CertVerifyBox />
    </div>
  )
}
