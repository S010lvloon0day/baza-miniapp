import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Image, Video, File, Article, Star, Lock, Check } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section, Material } from '../api/client'

const tg = (window as any).Telegram?.WebApp
const openPay = (url: string) => {
  if (url.includes('t.me') && tg?.openTelegramLink) tg.openTelegramLink(url)
  else if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank')
}

interface MaterialsResponse {
  materials: Material[]
  total: number
  total_with_premium?: number
}

const ITEMS_PER_PAGE = 10

interface Props {
  section: Section
  initialPage?: number
  onMaterial: (id: number, sectionId: number, page: number) => void
  onSubsection: (s: Section) => void
  onUpgrade: () => void
}

const typeLabel = (t: string) => ({ photo:'ФОТО', video:'ВИДЕО', document:'ДОКУМЕНТ', text:'ТЕКСТ' }[t] ?? t.toUpperCase())
const TypeIcon = ({ t }: { t: string }) => {
  const props = { size: 22, weight: 'duotone' as const, className: 'text-green' }
  if (t === 'photo')  return <Image   {...props} />
  if (t === 'video')  return <Video   {...props} />
  if (t === 'text')   return <Article {...props} />
  return <File {...props} />
}

const BENEFITS = [
  'Полный доступ ко всем закрытым курсам',
  'Новые материалы раньше всех остальных',
  'Без ограничений — навсегда',
]

function PremiumUpsell({ section, onUpgrade }: { section: Section; onUpgrade: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="flex flex-col items-center px-5 py-10 text-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-[rgba(157,92,255,.10)] border border-[rgba(199,166,255,.25)] rounded-2xl flex items-center justify-center text-5xl">
            {section.emoji || '📁'}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet rounded-full flex items-center justify-center shadow-lg">
            <Lock size={16} weight="fill" className="text-white" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="font-display text-[18px] tracking-[2px] uppercase leading-snug text-white max-w-[260px]">
            {section.title}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(157,92,255,.15)] border border-[rgba(157,92,255,.3)]">
            <Star size={11} weight="fill" className="text-violet" />
            <span className="text-[10px] font-bold tracking-[1.5px] text-violet uppercase">Premium раздел</span>
          </div>
        </div>

        {section.description && (
          <div className="text-[13px] text-gray leading-relaxed max-w-[280px]">
            {section.description}
          </div>
        )}

        <div className="w-full premium-surface border border-bd rounded-xl p-4 flex flex-col gap-3 text-left">
          <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray mb-1">Что даёт Premium</div>
          {BENEFITS.map(b => (
            <div key={b} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-[rgba(157,92,255,.2)] rounded-full flex items-center justify-center shrink-0">
                <Check size={11} weight="bold" className="text-violet" />
              </div>
              <span className="text-[13px] text-white/80">{b}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-4 bg-violet rounded-xl font-bold text-[15px] text-white tracking-wide active:opacity-80 transition-opacity"
        >
          💎 Получить Premium доступ
        </button>
      </div>
    </div>
  )
}

function CoursePaywall({ section, onPurchased }: { section: Section; onPurchased: () => void }) {
  const price = section.price ?? 0
  const [invoice, setInvoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const buy = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.courseInvoice(section.id)
      if (r.error === 'already_owned') { onPurchased(); return }
      if (!r.pay_url || !r.invoice_id) { setMsg('Не удалось создать счёт. Попробуй позже.'); return }
      setInvoice(r.invoice_id)
      openPay(r.pay_url)
    } catch { setMsg('Ошибка оплаты. Попробуй позже.') } finally { setBusy(false) }
  }

  const check = async () => {
    if (!invoice) return
    setBusy(true); setMsg(null)
    try {
      const r = await api.courseConfirm(invoice)
      if (r.ok) { onPurchased(); return }
      if (r.status && r.status !== 'paid') setMsg('Оплата ещё не поступила — подожди минуту и проверь снова.')
      else setMsg('Не удалось подтвердить оплату.')
    } catch { setMsg('Ошибка проверки. Попробуй позже.') } finally { setBusy(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="flex flex-col items-center px-5 py-10 text-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-[rgba(40,200,64,.08)] border border-[rgba(40,200,64,.25)] rounded-2xl flex items-center justify-center text-5xl">
            {section.emoji || '📁'}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green rounded-full flex items-center justify-center shadow-lg">
            <Lock size={16} weight="fill" className="text-bg" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="font-display text-[18px] tracking-[2px] uppercase leading-snug text-white max-w-[260px]">
            {section.title}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(40,200,64,.12)] border border-[rgba(40,200,64,.3)]">
            <span className="text-[11px] font-bold tracking-[1px] text-green uppercase">💰 Платный курс</span>
          </div>
        </div>

        {section.description && (
          <div className="text-[13px] text-gray leading-relaxed max-w-[280px]">{section.description}</div>
        )}

        <div className="w-full border border-bd rounded-xl p-4 flex flex-col gap-2 text-left" style={{ background: 'rgba(40,200,64,.04)' }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-gray uppercase tracking-[1px]">Стоимость</span>
            <span className="text-[22px] font-bold text-white">{price} USDT</span>
          </div>
          <div className="text-[12px] text-white/70">Разовая покупка — доступ к курсу навсегда. Оплата криптовалютой (USDT) через CryptoBot.</div>
        </div>

        {!invoice ? (
          <button
            onClick={buy} disabled={busy}
            className="w-full py-4 bg-green rounded-xl font-bold text-[15px] text-bg tracking-wide active:opacity-80 transition-opacity disabled:opacity-50"
          >
            💰 Купить за {price} USDT
          </button>
        ) : (
          <button
            onClick={check} disabled={busy}
            className="w-full py-4 bg-white rounded-xl font-bold text-[15px] text-bg tracking-wide active:opacity-80 transition-opacity disabled:opacity-50"
          >
            ✅ Я оплатил — проверить
          </button>
        )}
        {msg && <div className="text-[12px] text-gray2 leading-relaxed">{msg}</div>}
      </div>
    </div>
  )
}

export default function SectionPage({ section, initialPage = 0, onMaterial, onSubsection, onUpgrade }: Props) {
  const [subs, setSubs] = useState<Section[]>([])
  const [mats, setMats] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [totalWithPremium, setTotalWithPremium] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(!!section.owned)

  const isPaid = (section.price ?? 0) > 0
  const courseLocked = isPaid && !owned   // платный курс, ещё не куплен

  // Все хуки — до любого conditional return
  useEffect(() => {
    if ((section.locked && !owned) || courseLocked) { setLoading(false); return }
    setPage(initialPage); setLoading(true)
    Promise.all([
      api.subsections(section.id).catch(() => ({ sections: [] as Section[] })),
      api.materials(section.id, initialPage).catch((): MaterialsResponse => ({ materials: [], total: 0, total_with_premium: 0 })),
    ]).then(([sd, md]) => {
      setSubs(sd.sections)
      setMats(md.materials)
      setTotal(md.total)
      setTotalWithPremium((md as MaterialsResponse).total_with_premium ?? md.total)
    }).finally(() => setLoading(false))
  }, [section.id, owned])

  const loadPage = async (p: number) => {
    setLoading(true)
    const md: MaterialsResponse = await api.materials(section.id, p).catch((): MaterialsResponse => ({ materials: [], total: 0, total_with_premium: 0 }))
    setMats(md.materials); setPage(p); setLoading(false)
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1

  // Платный курс — экран покупки (подписка его не открывает)
  if (courseLocked) return <CoursePaywall section={section} onPurchased={() => setOwned(true)} />

  // Показываем upsell если раздел locked ИЛИ все материалы premium (пусто для не-премиум)
  const showUpsell = (section.locked && !owned) || (!loading && total === 0 && totalWithPremium > 0 && subs.length === 0)
  if (showUpsell) return <PremiumUpsell section={section} onUpgrade={onUpgrade} />

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      {/* Section header */}
      <div className="mx-4 mt-3 mb-2 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex items-stretch">
          {/* Emoji block */}
          <div className="w-16 shrink-0 flex items-center justify-center text-[28px]" style={{ background: 'rgba(255,255,255,.04)', borderRight: '1px solid rgba(255,255,255,.07)' }}>
            {section.emoji || '📁'}
          </div>
          {/* Info */}
          <div className="flex-1 p-3 min-w-0" style={{ background: 'rgba(255,255,255,.02)' }}>
            <div className="text-[9px] font-mono text-gray2 mb-1 truncate">
              $ ls -la ~/{section.title.toLowerCase().replace(/\s+/g, '_')}/
            </div>
            <div className="font-display text-[20px] tracking-[2px] uppercase leading-tight truncate">
              {section.title}
            </div>
            {section.description && (
              <div className="text-[11px] text-gray leading-snug mt-1 line-clamp-2">{section.description}</div>
            )}
          </div>
        </div>
      </div>

      {/* Subsections */}
      {subs.length > 0 && (
        <section>
          <div className="px-4 pt-4 pb-2 text-[11px] font-mono tracking-[1px] text-green/70">// ПОДРАЗДЕЛЫ</div>
          <div className="grid grid-cols-4 gap-2 px-4 pb-2">
            {subs.map(s => (
              <div key={s.id} onClick={() => onSubsection(s)}
                className={`relative p-2.5 flex flex-col items-center gap-1.5 cursor-pointer overflow-hidden transition-colors
                  ${s.locked
                    ? 'border border-[rgba(157,92,255,.2)] active:bg-[rgba(157,92,255,.07)]'
                    : 'border border-bd active:border-white/30 active:bg-white/[.03]'}`}
                style={{ background: s.locked ? 'rgba(157,92,255,.04)' : 'rgba(255,255,255,.02)' }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{
                  background: s.locked
                    ? 'linear-gradient(90deg, transparent, rgba(157,92,255,.4), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)'
                }} />
                <div className="relative w-10 h-10 flex items-center justify-center text-xl">
                  <span className={s.locked ? 'opacity-50' : ''}>{s.emoji || '📁'}</span>
                  {s.locked && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#9D5CFF] rounded-full flex items-center justify-center">
                      <Lock size={8} weight="fill" className="text-white" />
                    </div>
                  )}
                </div>
                <span className={`text-[9px] font-mono uppercase tracking-[.5px] text-center leading-tight w-full line-clamp-2
                  ${s.locked ? 'text-violet/50' : 'text-gray'}`}>{s.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Materials */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
        </div>
      ) : mats.length > 0 ? (
        <section>
          <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
            <span className="text-[11px] font-mono text-gray2">[{total}] файлов</span>
          </div>
          <div className="mx-4 flex flex-col divide-y divide-bd">
            {mats.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onMaterial(m.id, section.id, page)}
                className={`flex items-center gap-3 py-3 cursor-pointer -mx-4 px-4 transition-colors border-l-2
                  ${m.locked ? 'active:bg-[rgba(157,92,255,.04)] border-[rgba(157,92,255,.25)]' : 'active:bg-white/[.03]'}`}
                style={m.locked ? {} : { borderLeftColor: { photo:'#60A5FA', video:'#F87171', document:'#FBBF24', text:'rgba(255,255,255,.3)' }[m.media_type] ?? 'rgba(255,255,255,.2)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold leading-snug line-clamp-2 mb-1
                    ${m.locked ? 'text-white/35' : 'text-white'}`}>
                    {m.title}
                  </div>
                  {m.locked ? (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 border border-[rgba(157,92,255,.3)]" style={{ background: 'rgba(157,92,255,.08)' }}>
                      <Star size={9} weight="fill" className="text-violet" />
                      <span className="text-[9px] font-mono tracking-[1px] text-violet uppercase">premium</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-gray2 tracking-[1px]">{typeLabel(m.media_type)}</span>
                  )}
                </div>
                <TypeIcon t={m.media_type} />
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button disabled={page === 0} onClick={() => loadPage(page - 1)}
                className="w-9 h-9 bg-s1 border border-bd2 rounded text-white text-lg flex items-center justify-center disabled:opacity-30">‹</button>
              <span className="text-[13px] text-gray tracking-wider min-w-[48px] text-center">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => loadPage(page + 1)}
                className="w-9 h-9 bg-s1 border border-bd2 rounded text-white text-lg flex items-center justify-center disabled:opacity-30">›</button>
            </div>
          )}
        </section>
      ) : !subs.length && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray">
          <span className="text-4xl opacity-30">📂</span>
          <span className="text-[12px] tracking-[2px] uppercase">Раздел пуст</span>
        </div>
      )}
    </div>
  )
}
