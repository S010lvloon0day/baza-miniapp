import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { api, API_BASE } from '../api/client'
import type { PaidOfferData } from '../api/client'
import { useRubPayment, fmtRub } from '../hooks/useRubPayment'

const tg = (window as any).Telegram?.WebApp

function openUrl(url: string) {
  try {
    if (url.startsWith('https://t.me/') && tg?.openTelegramLink) tg.openTelegramLink(url)
    else if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  } catch { window.open(url, '_blank') }
}

/**
 * Экран отдельно продаваемого продукта (платный раздел, sections.price > 0).
 * Обложка + описание + оплата СБП (₽) или криптой. Подтверждение — автоматически:
 * мини-апп опрашивает статус, а сервер параллельно сверяет платежи сам.
 */
export default function PaidOffer({ offer, onPaid }: { offer: PaidOfferData; onPaid: () => void }) {
  const [busy, setBusy] = useState<'' | 'rub' | 'crypto'>('')
  const [txId, setTxId] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [err, setErr] = useState('')
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    try { tg?.HapticFeedback?.notificationOccurred('success') } catch { /* */ }
    onPaid()
  }

  // рубли: опрос статуса SecretPay
  useRubPayment(txId, status => {
    if (status === 'paid') finish()
    else { setWaiting(false); setTxId(null); setErr('Оплата не завершена: счёт СБП действует несколько минут. Нажмите «Оплатить» ещё раз — создастся новый.') }
  })

  // крипта: опрос CryptoBot каждые 4 с (до 15 мин) + сразу при возврате в приложение
  useEffect(() => {
    if (!invoiceId) return
    let stop = false
    let n = 0
    const check = async () => {
      if (stop) return
      try {
        const r = await api.courseConfirm(invoiceId)
        if (r.ok) { stop = true; finish() }
        else if (r.status === 'expired') { stop = true; setWaiting(false); setInvoiceId(null); setErr('Счёт истёк. Создайте новый.') }
      } catch { /* сеть — повторим */ }
    }
    const id = window.setInterval(() => { if (++n > 225 || stop) { window.clearInterval(id); return } check() }, 4000)
    const onFocus = () => { check() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      stop = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [invoiceId])

  const payRub = async () => {
    setBusy('rub'); setErr('')
    try {
      const r = await api.sectionRubInvoice(offer.section_id)
      if (r.error === 'already_owned') { finish(); return }
      if (!r.payment_url || !r.transaction_id) throw new Error(r.error || 'fail')
      setTxId(r.transaction_id); setWaiting(true)
      openUrl(r.payment_url)
    } catch { setErr('Не удалось создать счёт. Попробуйте позже.') }
    finally { setBusy('') }
  }

  const payCrypto = async () => {
    setBusy('crypto'); setErr('')
    try {
      const r = await api.courseInvoice(offer.section_id)
      if (r.error === 'already_owned') { finish(); return }
      if (!r.pay_url || !r.invoice_id) throw new Error(r.error || 'fail')
      setInvoiceId(r.invoice_id); setWaiting(true)
      openUrl(r.pay_url)
    } catch { setErr('Не удалось создать счёт. Попробуйте позже.') }
    finally { setBusy('') }
  }

  return (
    <div className="mx-4 mt-4 flex flex-col gap-3">
      <div className="card-gold overflow-hidden">
        {offer.cover && (
          <img src={offer.cover.startsWith('api:') ? API_BASE + offer.cover.slice(4) : import.meta.env.BASE_URL + offer.cover} alt="" loading="lazy"
            className="w-full max-h-[340px] object-cover object-top border-b border-white/[.06]" />
        )}
        <div className="px-5 pt-5 pb-5 text-center">
          <span className="text-[12.5px] text-gold font-semibold">Отдельный продукт</span>
          <h2 className="font-display font-semibold text-[21px] leading-tight mt-1 mb-3"
            style={{ textWrap: 'balance' } as React.CSSProperties}>
            {offer.emoji ? `${offer.emoji} ` : ''}{offer.title}
          </h2>
          {offer.description && (
            <p className="text-[14px] text-gray leading-relaxed whitespace-pre-line text-left">{offer.description}</p>
          )}
        </div>
      </div>

      <div className="list-group">
        <div className="flex items-center gap-3 px-4 py-3">
          <Icon name="check" size={18} className="text-gold" accent="#F5C25A" />
          <span className="text-[14px] text-fg/90">Разовая покупка — доступ навсегда</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Icon name="library" size={18} className="text-gold" accent="#F5C25A" />
          <span className="text-[14px] text-fg/90">Файл и инструкция сразу после оплаты</span>
        </div>
      </div>

      {offer.rub ? (
        <button onClick={payRub} disabled={!!busy || waiting} className="btn-gold gold-metal sheen w-full disabled:opacity-60">
          <b>{busy === 'rub' ? 'Создаю счёт…' : `Оплатить ${fmtRub(offer.rub)}`}</b>
          <small>СБП · любой банк</small>
        </button>
      ) : null}
      <button onClick={payCrypto} disabled={!!busy || waiting}
        className="w-full rounded-[18px] border border-white/[.1] bg-white/[.04] py-3.5 active:opacity-80 disabled:opacity-60">
        <b className="block text-[15px] font-semibold">{busy === 'crypto' ? 'Создаю счёт…' : `Оплатить ${offer.price} USDT`}</b>
        <small className="block text-[12.5px] text-gray">Криптовалютой через CryptoBot</small>
      </button>

      {waiting && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-gray py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          Ждём оплату — доступ откроется автоматически
        </div>
      )}
      {err && <p className="text-[13px] text-[#FF8A8A] text-center">{err}</p>}
    </div>
  )
}
