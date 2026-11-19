import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Profile, Config, Plan, ReferralInfo } from '../api/client'
import { useRubPayment, fmtRub } from '../hooks/useRubPayment'
import Icon from '../components/Icon'
import BazaMark from '../components/BazaMark'
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
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(108,76,255,.24), transparent 70%), #121318', border: '1px solid rgba(160,135,255,.3)' }}>
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
        <span className="w-[38px] h-[38px] rounded-[11px] bg-white/[.06] flex items-center justify-center text-[#D3D6DC] shrink-0"><Icon name="cert" size={19} /></span>
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
            <div className="rounded-[14px] p-3 text-[13px] leading-snug flex gap-2.5 bg-green/10 text-[#B9C8FF]">
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

function ReferralCard() {
  const [r, setR] = useState<ReferralInfo | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => { api.referral().then(setR).catch(() => {}) }, [])
  if (!r || !r.link || !r.bonus_days) return null
  const tg = (window as any).Telegram?.WebApp
  const share = () => {
    const text = 'База знаний: курсы, OSINT, пентест, код — заходи'
    const url = `https://t.me/share/url?url=${encodeURIComponent(r.link)}&text=${encodeURIComponent(text)}`
    try { tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank') } catch { window.open(url, '_blank') }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(r.link); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* */ }
  }
  return (
    <div className="mx-4 mt-6 card p-4" style={{ background: 'linear-gradient(160deg, rgba(118,87,255,.16), rgba(22,24,30,.6) 60%)' }}>
      <div className="flex items-center gap-3">
        <span className="tile-violet w-10 h-10 rounded-[13px] shrink-0"><Icon name="gift" size={19} accent="#fff" /></span>
        <div className="min-w-0">
          <div className="text-[15.5px] font-bold leading-tight">Пригласи друга</div>
          <div className="text-[12.5px] text-gray mt-0.5">Друг оформит подписку — тебе <span className="text-gold font-semibold">+{r.bonus_days} дн. Premium</span></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3.5 text-center">
        {([['Пришли', r.invited], ['Оплатили', r.paid], ['Получено дн.', r.days]] as const).map(([l, v]) => (
          <div key={l} className="rounded-[12px] py-2 bg-white/[.05]">
            <div className="font-display font-semibold text-[17px] tabular-nums">{v}</div>
            <div className="text-[11px] text-gray mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3.5">
        <button onClick={share} className="btn-primary flex-1 h-11 text-[14px]">Поделиться ссылкой</button>
        <button onClick={copy} aria-label="Скопировать" className="btn-secondary w-11 h-11 shrink-0 flex items-center justify-center">
          <Icon name={copied ? 'check' : 'copy'} size={18} />
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage({ scrollToPlans, onScrolled, onCompete }: Props) {
  const [prof, setProf]   = useState<Profile | null>(null)
  const [cfg, setCfg]     = useState<Config>({ plans: [], currency: 'USDT' })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [paying, setPaying] = useState<'crypto' | 'rub' | null>(null)
  const [rubTx, setRubTx] = useState<string | null>(null)
  const [method, setMethod] = useState<'rub' | 'crypto' | null>(null)
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
      setMsg('Оплата не завершена: счёт СБП действует несколько минут. Нажмите «Оплатить» ещё раз — создастся новый.')
    }
  })

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
    { key: 'crypto' as const, label: 'Крипта', icon: 'coin' as const, amount: `${selected.price} $`, via: 'в USDT через CryptoBot', run: buyWithCrypto },
  ].filter(Boolean) as { key: 'rub' | 'crypto'; label: string; icon: 'card' | 'coin'; amount: string; via: string; run: () => void }[]) : []
  const cur = methods.find(m => m.key === method) ?? methods[0]

  // Цена тарифа в выбранной валюте и цена за месяц
  const unit = (p: Plan) => cur?.key === 'rub' && p.rub ? p.rub : p.price
  const fmtUnit = (v: number) => cur?.key === 'rub' ? fmtRub(Math.round(v)) : `${Math.round(v * 100) / 100} $`
  const base = cfg.plans[0] ? unit(cfg.plans[0]) / Math.max(1, cfg.plans[0].days / 30) : 0
  const months = (p: Plan) => Math.max(1, Math.round(p.days / 30))

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      {/* Шапка */}
      <div className="flex flex-col items-center text-center px-4 pt-5 pb-1"
        style={{ background: 'radial-gradient(70% 60% at 50% 20%, rgba(122,77,255,.22), transparent 70%), radial-gradient(60% 50% at 80% 60%, rgba(61,139,255,.14), transparent 70%)' }}>
        <div className="rounded-full p-[3px]" style={{ background: premium ? 'conic-gradient(from 200deg,#FFF1C9,#B26BFF,#3D8BFF,#3DFFC8,#FFF1C9)' : 'rgba(255,255,255,.12)' }}>
          <div className="w-[84px] h-[84px] rounded-full overflow-hidden flex items-center justify-center font-display font-semibold text-[28px] text-white border-[3px] border-bg avatar-neo">
            {prof?.photo_url ? <img src={prof.photo_url} alt={name} className="w-full h-full object-cover" /> : initials}
          </div>
        </div>
        <h1 className="font-display font-extrabold tracking-[-.03em] text-[24px] mt-3 leading-tight max-w-full truncate">{name}</h1>
        {premium ? (
          <div className="flex items-center gap-2 mt-3">
            <PremiumBadge />
            {prof?.premium_until && <span className="text-[12.5px] text-[#E9D59E]">до {fmtUntil(prof.premium_until)}</span>}
          </div>
        ) : cfg.plans.length > 0 && (
          <button onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="mt-3 h-9 px-4 rounded-full text-[13px] font-semibold flex items-center gap-1.5 pcta">
            <Icon name="crown" size={14} accent="current" /> Оформить Premium
          </button>
        )}
      </div>

      {comp && <StatsRow c={comp} />}
      {comp && <RankCard c={comp} onOpen={onCompete} />}
      {premium && <ReferralCard />}

      {/* Тарифы — как экран Premium в прототипе */}
      {cfg.plans.length > 0 && (
        <div ref={plansRef} className="scroll-mt-4 px-4 mt-6 flex flex-col gap-4">
          <div className="pcard anim-up">
            <i className="pcard-sheen" />
            <span className="flex items-center justify-between relative">
              <b className="pcard-k">PREMIUM</b>
              <BazaMark size={26} color="url(#pbGold2)" />
              <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden><defs><linearGradient id="pbGold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1C9" /><stop offset="1" stopColor="#D9A94E" /></linearGradient></defs></svg>
            </span>
            <span className="relative flex flex-col gap-1">
              <b className="pcard-t">База знаний</b>
              <span className="pcard-s">{premium && prof?.premium_until ? `Активен до ${fmtUntil(prof.premium_until)}` : 'S010lvloon · доступ без ограничений'}</span>
            </span>
          </div>
          <h2 className="ph2 anim-up" style={{ animationDelay: '.08s' }}>{premium ? <>Продлите доступ.<br /><span>Дни добавятся к текущим.</span></> : <>Откройте всё.<br /><span>Одной подпиской.</span></>}</h2>
          {!premium && (
            <ul className="flex flex-col gap-2.5 anim-up" style={{ animationDelay: '.14s' }}>
              {['Все материалы базы — их больше 4 000', 'Поиск курсов: 5 в день из 100 000+', 'Оценки и комментарии к материалам'].map(t => (
                <li key={t} className="pli"><Icon name="check" size={16} accent="current" />{t}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 anim-up" style={{ animationDelay: '.2s' }}>
            {[...cfg.plans].sort((a, b) => b.days - a.days).map((p) => {
              const on = selected?.days === p.days
              const perMonth = unit(p) / months(p)
              const off = base > 0 ? Math.round((1 - perMonth / base) * 100) : 0
              return (
                <button key={p.days} onClick={() => { setSelected(p); setMsg(null) }} className={`plan ${on ? 'on' : ''}`} aria-pressed={on}>
                  <span className="plan-r">{on && <i />}</span>
                  <span className="flex-1 min-w-0 text-left">
                    <b className="plan-t">{p.label}{off >= 5 && <em className="plan-off">−{off}%</em>}</b>
                    <small className="plan-s">{months(p) > 1 ? `${fmtUnit(perMonth)} в месяц` : 'Разовый платёж'}</small>
                  </span>
                  <b className="plan-p">{fmtUnit(unit(p))}</b>
                </button>
              )
            })}
          </div>

          {methods.length > 1 && (
            <div className="pseg">
              {methods.map(m => (
                <button key={m.key} onClick={() => { setMethod(m.key); setMsg(null) }} className={cur?.key === m.key ? 'on' : ''}>
                  <Icon name={m.icon} size={15} accent="current" />{m.label}
                </button>
              ))}
            </div>
          )}

          {selected && cur && (
            <button disabled={!!paying} onClick={cur.run} className="ppay disabled:opacity-60">
              <i className="ppay-sheen" />
              <b>{paying ? 'Открываю…' : `${premium ? 'Продлить' : 'Оплатить'} ${cur.amount}`}</b>
              <small>{months(selected)} {months(selected) === 1 ? 'месяц' : months(selected) < 5 ? 'месяца' : 'месяцев'} · {cur.via}</small>
            </button>
          )}
          <p className="pnote">Без автопродления. Premium включится сам, обычно за минуту.</p>

          {invoiceId && (
            <button disabled={checking} onClick={checkPayment} className="btn-secondary w-full disabled:opacity-50">
              {checking ? 'Проверяю…' : 'Проверить оплату'}
            </button>
          )}

          {msg && (
            <div className="px-3.5 py-3 rounded-[14px] text-[13px] leading-snug bg-white/[.05] border border-white/[.08] text-fg/85">{msg}</div>
          )}
        </div>
      )}

      {!premium && <ReferralCard />}

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
