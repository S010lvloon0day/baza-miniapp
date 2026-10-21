import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Profile, Config, Plan } from '../api/client'
import { useRubPayment, fmtRub } from '../hooks/useRubPayment'
import Icon from '../components/Icon'
import PremiumBadge from '../components/PremiumBadge'

const tg = (window as any).Telegram?.WebApp

interface Props {
  scrollToPlans?: boolean
  onScrolled?: () => void
  onCompete?: () => void
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
function fmtUntil(v?: string) {
  if (!v) return ''
  const d = new Date(v.replace(' ', 'T'))
  if (isNaN(d.getTime())) return v
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`
}

type Compete = import('../api/client').Compete

function StatsRow({ c }: { c: Compete }) {
  const cells = [
    { v: c.xp.toLocaleString('ru-RU'), l: 'опыта', cls: 'text-violet' },
    { v: c.pos_all ? String(c.pos_all) : '—', l: 'место', cls: 'text-gold' },
    { v: String(c.streak), l: 'дней подряд', cls: 'text-[#FFB25B]', icon: true },
    { v: String(c.best_streak), l: 'рекорд', cls: 'text-fg' },
  ]
  return (
    <div className="mx-4 mt-4 card grid grid-cols-4 overflow-hidden">
      {cells.map((x, i) => (
        <div key={x.l} className={`py-3 px-1 text-center ${i ? 'border-l border-white/[.07]' : ''}`}>
          <div className={`font-display font-semibold text-[16px] tabular-nums flex items-center justify-center gap-0.5 ${x.cls}`}>
            {x.v}{x.icon && <Icon name="streak" size={12} accent="#FFB25B" />}
          </div>
          <div className="text-[11px] text-gray mt-0.5">{x.l}</div>
        </div>
      ))}
    </div>
  )
}

function RankCard({ c, onOpen }: { c: Compete; onOpen?: () => void }) {
  const raw = c.rank.progress > 1 ? c.rank.progress : c.rank.progress * 100
  const pct = Math.round(Math.max(0, Math.min(100, raw)))
  return (
    <button onClick={onOpen} className="mx-4 mt-2.5 block w-[calc(100%-2rem)] text-left rounded-[18px] px-3.5 py-3 active:scale-[.99] transition-transform"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(108,76,255,.24), transparent 70%), #111C17', border: '1px solid rgba(160,135,255,.3)' }}>
      <div className="flex items-center gap-2.5">
        <span className="tile-violet w-[34px] h-[34px] shrink-0"><Icon name="shield" size={17} accent="#fff" /></span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[14px] truncate">{c.rank.name}</div>
          <div className="text-[12px] text-gray truncate">{c.rank.next_name ? `Следующий ранг — ${c.rank.next_name}` : 'Высший ранг'}</div>
        </div>
        {c.rank.next_name && <span className="text-[12.5px] font-semibold text-violet tabular-nums shrink-0">{c.rank.to_next} XP</span>}
        <Icon name="chevR" size={16} className="text-gray2" />
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-white/[.08] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6E4CF5,#A58BFF)' }} />
      </div>
    </button>
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
    <div className="px-3.5 py-3.5">
      <div className="flex items-center gap-3 mb-2.5">
        <span className="w-[38px] h-[38px] rounded-[11px] bg-white/[.06] flex items-center justify-center text-[#CFDAD4] shrink-0"><Icon name="cert" size={19} /></span>
        <div className="min-w-0">
          <div className="text-[14.5px] font-medium">Проверка сертификата</div>
          <div className="text-[12.5px] text-gray">По ID из документа, например BZ-318-2026-7F3A9C</div>
        </div>
      </div>
      <div className="flex gap-2">
        <input id="cert-id" value={id} onChange={e => setId(e.target.value)} placeholder="BZ-…"
          className="flex-1 min-w-0 h-11 px-3.5 rounded-[14px] text-[14px] text-fg outline-none bg-white/[.06] border border-white/[.08] focus:border-green/50 placeholder:text-gray2" />
        <button onClick={check} disabled={busy} className="btn-secondary px-4 shrink-0 disabled:opacity-50">
          {busy ? 'Проверяю…' : 'Проверить'}
        </button>
      </div>
      {res && (
        <div className="mt-2.5">
          {res.valid ? (
            <div className="rounded-[14px] p-3 text-[13px] leading-snug flex gap-2.5 bg-green/10 text-[#9FF0C6]">
              <Icon name="checkCircle" size={18} accent="current" className="text-green shrink-0" />
              <div>Подлинный. Владелец: <b className="text-fg">{res.username}</b> · {res.language} · {res.date}.<br />Уроков: {res.lessons_total}, задач: {res.tasks_total}. Код: {res.code}.</div>
            </div>
          ) : (
            <div className="rounded-[14px] p-3 text-[13px] leading-snug flex gap-2.5 bg-[#FF6B6B]/10 text-[#FFB0B0]">
              <Icon name="warn" size={18} accent="#FF8A8A" className="text-[#FF8A8A] shrink-0" />
              <div>{res.reason === 'not_found' ? 'Такого сертификата нет в реестре — вероятно, подделка.' : res.revoked ? 'Сертификат отозван.' : 'Не удалось проверить, попробуй ещё раз.'}</div>
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
  const [method, setMethod] = useState<'rub' | 'stars' | 'crypto' | null>(null)
  const [comp, setComp] = useState<Compete | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const plansRef = useRef<HTMLDivElement>(null)

  useEffect(() => { api.compete().then(setComp).catch(() => {}) }, [])

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
      setMsg('Оплата получена, Premium активирован!')
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
          setMsg('Оплата получена! Обновляю профиль…')
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
        setMsg('Premium активирован!')
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
          if (!cancelled) { setInvoiceId(null); setMsg('Premium активирован!') }
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
  const initials = name.slice(0, 1).toUpperCase()
  const premium = !!prof?.is_premium

  // Доступные способы оплаты для выбранного тарифа
  const methods = selected ? ([
    selected.rub ? { key: 'rub' as const, label: 'СБП', icon: 'card' as const, amount: fmtRub(selected.rub), via: 'через СБП', run: buyWithRub } : null,
    selected.stars ? { key: 'stars' as const, label: 'Stars', icon: 'stars' as const, amount: `${selected.stars.toLocaleString('ru-RU')} ⭐`, via: 'через Telegram Stars', run: buyWithStars } : null,
    { key: 'crypto' as const, label: 'Крипта', icon: 'coin' as const, amount: `${selected.price} $`, via: 'в USDT через CryptoBot', run: buyWithCrypto },
  ].filter(Boolean) as { key: 'rub' | 'stars' | 'crypto'; label: string; icon: 'card' | 'stars' | 'coin'; amount: string; via: string; run: () => void }[]) : []
  const cur = methods.find(m => m.key === method) ?? methods[0]

  // Цена тарифа в выбранной валюте и цена за месяц
  const unit = (p: Plan) => cur?.key === 'stars' && p.stars ? p.stars : cur?.key === 'rub' && p.rub ? p.rub : p.price
  const fmtUnit = (v: number) => cur?.key === 'stars' ? `${Math.round(v).toLocaleString('ru-RU')} ⭐` : cur?.key === 'rub' ? fmtRub(Math.round(v)) : `${Math.round(v * 100) / 100} $`
  const base = cfg.plans[0] ? unit(cfg.plans[0]) / Math.max(1, cfg.plans[0].days / 30) : 0
  const months = (p: Plan) => Math.max(1, Math.round(p.days / 30))

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      {/* Шапка */}
      <div className="flex flex-col items-center text-center px-4 pt-5 pb-1"
        style={{ background: 'radial-gradient(70% 60% at 50% 20%, rgba(245,194,90,.16), transparent 70%), radial-gradient(60% 50% at 80% 60%, rgba(118,87,255,.14), transparent 70%)' }}>
        <div className="rounded-full p-[3px]" style={{ background: premium ? 'conic-gradient(from 200deg,#FFF0BE,#F5C25A,#C8912B,#FFE08A,#FFF0BE)' : 'rgba(255,255,255,.12)' }}>
          <div className="w-[84px] h-[84px] rounded-full overflow-hidden flex items-center justify-center font-display font-semibold text-[28px] text-[#9FF0C6] bg-[#1F3B30] border-[3px] border-bg">
            {prof?.photo_url ? <img src={prof.photo_url} alt={name} className="w-full h-full object-cover" /> : initials}
          </div>
        </div>
        <h1 className="font-display font-semibold text-[22px] mt-3 leading-tight max-w-full truncate">{name}</h1>
        {premium ? (
          <div className="flex items-center gap-2 mt-3">
            <PremiumBadge />
            {prof?.premium_until && <span className="text-[12.5px] text-[#E9D59E]">до {fmtUntil(prof.premium_until)}</span>}
          </div>
        ) : cfg.plans.length > 0 && (
          <button onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="mt-3 h-9 px-4 rounded-full text-[13px] font-semibold text-gold bg-gold/10 border border-gold/30 flex items-center gap-1.5">
            <Icon name="crown" size={14} accent="current" /> Оформить Premium
          </button>
        )}
      </div>

      {comp && <StatsRow c={comp} />}
      {comp && <RankCard c={comp} onOpen={onCompete} />}

      {/* Тарифы */}
      {cfg.plans.length > 0 && (
        <div ref={plansRef} className="scroll-mt-4">
          <div className="flex items-baseline justify-between mx-[18px] mt-6 mb-3">
            <h2 className="text-[17px] font-bold">{premium ? 'Продлить Premium' : 'Оформить Premium'}</h2>
            {premium && <span className="text-[12px] text-gray2">дни добавятся к текущим</span>}
          </div>
          <div className="grid gap-2 mx-4" style={{ gridTemplateColumns: `repeat(${Math.min(3, cfg.plans.length)}, 1fr)` }}>
            {cfg.plans.map((p, i) => {
              const on = selected?.days === p.days
              const perMonth = unit(p) / months(p)
              const off = base > 0 ? Math.round((1 - perMonth / base) * 100) : 0
              const last = i === cfg.plans.length - 1 && cfg.plans.length > 1
              const tag = last && off > 0 ? `−${off}%` : i === 1 && cfg.plans.length > 2 ? 'Выгодно' : null
              return (
                <button key={p.days} onClick={() => { setSelected(p); setMsg(null) }}
                  className="relative rounded-2xl pt-3.5 pb-3 px-2 text-center flex flex-col gap-[3px] transition-transform active:scale-[.98]"
                  style={on
                    ? { background: 'radial-gradient(100% 90% at 50% 0%, rgba(245,194,90,.22), transparent 70%), #17140A', border: '1px solid #F5C25A' }
                    : { background: '#111C17', border: '1px solid rgba(255,255,255,.07)' }}>
                  {tag && (
                    <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 z-10">
                      <span className={`block whitespace-nowrap text-[10px] font-bold px-2 py-[3px] rounded-full ${tag === 'Выгодно' ? 'gold-metal' : 'bg-green text-ink'}`}
                        style={tag === 'Выгодно' ? { boxShadow: 'none' } : undefined}>{tag}</span>
                    </span>
                  )}
                  <span className="text-[12px] text-gray">{p.label}</span>
                  <span className={`font-display font-semibold text-[15px] tabular-nums ${on ? 'text-[#FFE7A8]' : ''}`}>{fmtUnit(unit(p))}</span>
                  {months(p) > 1 && <span className="text-[11px] text-gray2 tabular-nums">{fmtUnit(perMonth)}/мес</span>}
                </button>
              )
            })}
          </div>

          {methods.length > 1 && (
            <div className="flex gap-1.5 mx-4 mt-2.5 p-1 rounded-[14px] bg-s1 border border-white/[.07]">
              {methods.map(m => (
                <button key={m.key} onClick={() => { setMethod(m.key); setMsg(null) }}
                  className={`flex-1 h-9 rounded-[10px] flex items-center justify-center gap-1.5 text-[13px] font-medium transition-colors ${cur?.key === m.key ? 'bg-white/10 text-fg' : 'text-gray'}`}>
                  <Icon name={m.icon} size={15} accent={m.key === 'stars' ? '#F5C25A' : 'current'} className={m.key === 'stars' ? 'text-gold' : ''} />
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {selected && cur && (
            <button disabled={!!paying} onClick={cur.run}
              className="btn-gold gold-metal sheen sheen-d1 mx-4 mt-2.5 w-[calc(100%-2rem)] disabled:opacity-60 active:scale-[.99] transition-transform"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(90,50,0,.4), 0 10px 24px rgba(240,170,40,.28)' }}>
              <b>{paying ? 'Открываю…' : `${premium ? 'Продлить' : 'Оплатить'} ${cur.amount}`}</b>
              <small>{months(selected)} {months(selected) === 1 ? 'месяц' : months(selected) < 5 ? 'месяца' : 'месяцев'} Premium · {cur.via}</small>
            </button>
          )}

          {invoiceId && (
            <button disabled={checking} onClick={checkPayment} className="btn-secondary mx-4 mt-2 w-[calc(100%-2rem)] disabled:opacity-50">
              {checking ? 'Проверяю…' : 'Проверить оплату'}
            </button>
          )}

          {msg && (
            <div className="mx-4 mt-2.5 px-3.5 py-3 rounded-[14px] text-[13px] leading-snug bg-white/[.05] border border-white/[.08] text-fg/85">{msg}</div>
          )}
        </div>
      )}

      {/* Сертификаты */}
      <div className="flex items-baseline justify-between mx-[18px] mt-6 mb-3">
        <h2 className="text-[17px] font-bold">Сертификаты</h2>
      </div>
      <div className="list-group mx-4">
        <CertVerifyBox />
      </div>
    </div>
  )
}
