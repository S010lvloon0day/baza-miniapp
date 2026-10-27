import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import BazaMark from '../components/BazaMark'
import PremiumBadge from '../components/PremiumBadge'
import { iconNameFor } from '../components/CategoryIcon'
import { coverClass } from '../components/sectionCover'
import MediaTypeIcon from '../components/MediaTypeIcon'
import { CardSocial } from '../components/MaterialSocial'
import { api } from '../api/client'
import Certificate from '../components/Certificate'
import type { Section, Material } from '../api/client'
import LevelMark from '../components/LevelMark'

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
  viewed_count?: number
}

const ITEMS_PER_PAGE = 10

interface Props {
  section: Section
  initialPage?: number
  onMaterial: (id: number, sectionId: number, page: number) => void
  onSubsection: (s: Section) => void
  onUpgrade: () => void
}

const typeLabel = (t: string) => ({ photo: 'Фото', video: 'Видео', document: 'Файл', text: 'Урок', doc: 'Урок', quiz: 'Тест', task: 'Задание' }[t] ?? 'Материал')
type Filter = 'all' | 'video' | 'lesson' | 'test' | 'file'
const FILTERS: { id: Filter; label: string; match: (t: string) => boolean }[] = [
  { id: 'all', label: 'Все', match: () => true },
  { id: 'video', label: 'Видео', match: t => t === 'video' },
  { id: 'lesson', label: 'Уроки', match: t => t === 'text' || t === 'doc' },
  { id: 'test', label: 'Тесты', match: t => t === 'quiz' || t === 'task' },
  { id: 'file', label: 'Файлы', match: t => t === 'document' || t === 'photo' },
]

/** Крупная шапка-обложка раздела. */
function Cover({ section, children }: { section: Section; children?: React.ReactNode }) {
  return (
    <div className={`${coverClass(section)} relative overflow-hidden px-[18px] pt-10 pb-5 min-h-[178px] flex flex-col justify-end`}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,16,13,0) 25%, #08100D 100%)' }} />
      <Icon name={iconNameFor(section.title)} size={150} className="absolute -right-5 top-1 opacity-[.14] text-white" accent="#fff" strokeWidth={1.3} />
      <div className="relative">{children}</div>
    </div>
  )
}

const BENEFITS = [
  'Полный доступ ко всем закрытым разделам и материалам',
  'Новые материалы раньше всех остальных',
  'Оплата картой через СБП, криптой или Telegram Stars',
]

function PremiumUpsell({ section, onUpgrade }: { section: Section; onUpgrade: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <Cover section={section}>
        <PremiumBadge />
        <h1 className="font-display font-semibold text-[25px] leading-tight mt-2.5" style={{ textWrap: 'balance' } as React.CSSProperties}>{section.title}</h1>
        {section.description && <p className="text-[14px] text-[#CFDAD4] mt-1">{section.description}</p>}
      </Cover>
      <div className="px-3.5 flex flex-col gap-3">
        <div className="card-gold px-4 py-4">
          <div className="font-display font-semibold text-[15px] mb-3">Что даёт Premium</div>
          <div className="flex flex-col gap-2.5">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold grid place-items-center shrink-0 mt-px"><Icon name="check" size={12} strokeWidth={2.2} /></span>
                <span className="text-[14px] text-[#E4E9E6] leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onUpgrade} className="btn-gold gold-metal sheen w-full">
          <b>Открыть Premium</b>
          <small>Подписка на 1, 3 или 12 месяцев</small>
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
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <Cover section={section}>
        <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-black/35 text-[12px] font-semibold text-[#CFDAD4]"><Icon name="lock" size={13} />Платный курс</span>
        <h1 className="font-display font-semibold text-[25px] leading-tight mt-2.5" style={{ textWrap: 'balance' } as React.CSSProperties}>{section.title}</h1>
        {section.description && <p className="text-[14px] text-[#CFDAD4] mt-1">{section.description}</p>}
      </Cover>
      <div className="px-3.5 flex flex-col gap-3">
        <div className="card px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-gray">Стоимость</span>
            <span className="font-display font-semibold text-[22px] tabular-nums">{price} USDT</span>
          </div>
          <p className="text-[13px] text-gray leading-relaxed mt-2">Разовая покупка: доступ к курсу навсегда. Оплата в USDT через CryptoBot.</p>
        </div>
        {!invoice ? (
          <button onClick={buy} disabled={busy} className="btn-gold gold-metal sheen w-full disabled:opacity-60">
            <b>Купить за {price} USDT</b><small>Откроется CryptoBot</small>
          </button>
        ) : (
          <button onClick={check} disabled={busy} className="btn-primary w-full">Я оплатил, проверить</button>
        )}
        {msg && <div className="text-[13px] text-gray leading-relaxed px-1">{msg}</div>}
      </div>
    </div>
  )
}

export default function SectionPage({ section, initialPage = 0, onMaterial, onSubsection, onUpgrade }: Props) {
  const [subs, setSubs] = useState<Section[]>([])
  const [mats, setMats] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(!!section.owned)
  const [viewedCount, setViewedCount] = useState(0)
  const [subscribed, setSubscribed] = useState(false)
  const [subBusy, setSubBusy] = useState(false)
  const [subMsg, setSubMsg] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    api.sectionSub(section.id).then(r => setSubscribed(r.subscribed)).catch(() => {})
  }, [section.id])

  const toggleSub = async () => {
    const next = !subscribed
    setSubscribed(next)
    setSubBusy(true)
    try {
      await api.setSectionSub(section.id, next)
      setSubMsg(next ? 'Пришлём в Telegram, когда здесь появятся новые материалы'
                     : 'Уведомления по разделу выключены')
      tg?.HapticFeedback?.notificationOccurred?.('success')
      setTimeout(() => setSubMsg(null), 3500)
    } catch {
      setSubscribed(!next)
    } finally {
      setSubBusy(false)
    }
  }

  const isPaid = (section.price ?? 0) > 0
  const courseLocked = isPaid && !owned   // платный курс, ещё не куплен

  // Все хуки — до любого conditional return
  useEffect(() => {
    // Платный курс (price>0) открываем только покупкой — там свой экран.
    // Premium-раздел (подписка) грузим всегда: показываем каталог как превью,
    // материалы будут locked — чтобы было видно, за что платят.
    if (courseLocked) { setLoading(false); return }
    setPage(initialPage); setLoading(true)
    Promise.all([
      api.subsections(section.id).catch(() => ({ sections: [] as Section[] })),
      api.materials(section.id, initialPage).catch((): MaterialsResponse => ({ materials: [], total: 0, total_with_premium: 0 })),
    ]).then(([sd, md]) => {
      setSubs(sd.sections)
      setMats(md.materials)
      setTotal(md.total)
      setViewedCount((md as MaterialsResponse).viewed_count ?? 0)
    }).finally(() => setLoading(false))
  }, [section.id, owned])

  const loadPage = async (p: number) => {
    setLoading(true)
    const md: MaterialsResponse = await api.materials(section.id, p).catch((): MaterialsResponse => ({ materials: [], total: 0, total_with_premium: 0 }))
    setMats(md.materials); setPage(p); setLoading(false)
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1

  const [editingPage, setEditingPage] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const commitPageJump = () => {
    const n = parseInt(pageInput, 10)
    if (Number.isFinite(n)) {
      const clamped = Math.min(Math.max(n, 1), totalPages)
      if (clamped - 1 !== page) loadPage(clamped - 1)
    }
    setEditingPage(false)
  }

  // Платный курс — экран покупки (подписка его не открывает)
  if (courseLocked) return <CoursePaywall section={section} onPurchased={() => setOwned(true)} />

  // Полный экран-пейвол показываем только когда превьюить нечего: premium-раздел
  // без материалов и без подразделов. Если есть что показать — рендерим каталог
  // (материалы будут locked) + компактный баннер подписки.
  const lockedPreview = section.locked && !owned
  const showUpsell = lockedPreview && !loading && total === 0 && subs.length === 0
  if (showUpsell) return <PremiumUpsell section={section} onUpgrade={onUpgrade} />

  // Закреплённые «важные» материалы — рендерятся отдельной карточкой сверху
  // (помечаются ведущим значком 🧭 в названии), из обычного списка исключаются.
  // значок приходит в title_icon (эмодзи из названий вырезаются при загрузке, см. utils/title.ts)
  const isFeatured = (m: Material) => (m as { title_icon?: string }).title_icon === '🧭' || (m.title || '').trimStart().startsWith('🧭')
  const featured = mats.filter(isFeatured)
  const listMats = mats.filter(m => !featured.includes(m))
  const present = FILTERS.filter(f => f.id !== 'all' && listMats.some(m => f.match(m.media_type)))
  const shown = filter === 'all' ? listMats : listMats.filter(m => FILTERS.find(f => f.id === filter)!.match(m.media_type))
  const anyViewed = mats.some(m => m.viewed)
  let lastViewed = -1
  mats.forEach((m, i) => { if (m.viewed) lastViewed = i })
  const currentId = anyViewed ? (mats.slice(lastViewed + 1).find(m => !m.viewed && !m.locked) ?? mats.find(m => !m.viewed && !m.locked))?.id : undefined
  const doneCount = Math.max(viewedCount, mats.filter(m => m.viewed).length)
  const pct = total > 0 ? Math.min(100, (doneCount / total) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <Cover section={section}>
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-[26px] leading-tight break-words" style={{ textWrap: 'balance' } as React.CSSProperties}>{section.title}</h1>
            {section.description && <p className="text-[14px] text-[#CFDAD4] mt-1 line-clamp-2">{section.description}</p>}
          </div>
          <button onClick={toggleSub} disabled={subBusy} aria-label={subscribed ? 'Отключить уведомления раздела' : 'Уведомлять о новых материалах'}
            className={`shrink-0 w-11 h-11 rounded-full grid place-items-center transition-colors active:opacity-80 ${subscribed ? 'bg-green text-ink' : 'bg-black/35 text-white border border-white/15'}`}>
            <Icon name={subscribed ? 'bellRing' : 'bell'} size={20} accent={subscribed ? '#03200F' : 'brand'} />
          </button>
        </div>
      </Cover>
      {subMsg && <div className="mx-[18px] -mt-2 mb-3 text-[13px] text-green">{subMsg}</div>}

      <div className="px-3.5 flex flex-col gap-4">
        {featured.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {featured.map(m => (
              <button key={m.id} onClick={() => onMaterial(m.id, section.id, page)}
                className="card-gold relative w-full text-left overflow-hidden active:scale-[.99] transition-transform"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,223,128,.18), 0 10px 28px rgba(0,0,0,.35)' }}>
                {/* фирменный знак на фоне */}
                <span className="absolute -right-6 -bottom-8 pointer-events-none" style={{ opacity: .1 }}><BazaMark size={150} color="#F5C25A" /></span>
                <span className="relative flex items-center gap-3.5 p-4">
                  <span className="gold-metal sheen w-[54px] h-[54px] rounded-[16px] grid place-items-center shrink-0">
                    <Icon name="compass" size={28} accent="#3A2300" style={{ position: 'relative', zIndex: 1, color: '#3A2300' }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 mb-1">
                      <span className="text-[11.5px] font-semibold text-gold">Важное</span>
                      <span className="w-1 h-1 rounded-full bg-gold/60" />
                      <span className="text-[11.5px] font-medium text-[#CDBB8E]">интерактивный каталог</span>
                    </span>
                    <b className="block font-display font-semibold text-[16px] leading-snug text-fg line-clamp-2">{m.title.replace(/^🧭\s*/, '')}</b>
                    <span className="block text-[12.5px] text-gray mt-1">1 170 инструментов · 33 раздела</span>
                  </span>
                  <span className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(245,194,90,.14)', color: '#F5C25A' }}>
                    <Icon name="chevR" size={18} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center gap-3 px-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/[.08] overflow-hidden">
              <div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[12.5px] text-gray tabular-nums shrink-0">{Math.min(doneCount, total)} из {total} пройдено</span>
          </div>
        )}

        {section.parent_id === 303 && (
          <Certificate parentId={section.id} language={section.title} />
        )}

        {lockedPreview && (
          <div className="flex items-center gap-3 rounded-[20px] px-4 py-3.5 border border-white/[.11]"
            style={{ background: 'linear-gradient(120deg,rgba(245,194,90,.20),rgba(245,194,90,.03) 60%),#111C17' }}>
            <div className="flex-1 min-w-0">
              <PremiumBadge small />
              <div className="text-[13.5px] text-[#E4E9E6] leading-snug mt-1.5">Посмотрите, что внутри. Материалы откроются по подписке.</div>
            </div>
            <button onClick={onUpgrade} className="gold-metal shrink-0 h-9 px-4 rounded-[12px] font-display font-semibold text-[12.5px]">Открыть</button>
          </div>
        )}

        {subs.length > 0 && (
          <section>
            <h3 className="px-1 pb-2 text-[17px] font-bold">Подразделы</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {subs.map(s => (
                <button key={s.id} onClick={() => onSubsection(s)}
                  className={`${coverClass(s)} relative h-[92px] rounded-[18px] p-3 flex flex-col justify-between text-left border border-white/[.07] overflow-hidden active:scale-[.98] transition-transform`}>
                  <Icon name={iconNameFor(s.title)} size={22} style={{ color: 'var(--cv)' }} accent="var(--cv)" />
                  <b className="text-[14px] font-semibold leading-tight line-clamp-2 break-words">{s.title}</b>
                  {s.locked && <span className="absolute top-3 right-3 opacity-80"><Icon name="lock" size={14} accent="var(--cv)" style={{ color: 'var(--cv)' }} /></span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
          </div>
        ) : mats.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            {present.length > 1 && (
              <div className="-mx-3.5 px-3.5 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {[FILTERS[0], ...present].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'on' : ''}`}>{f.label}</button>
                ))}
              </div>
            )}
            <div className="flex items-baseline justify-between px-1">
              <h3 className="text-[17px] font-bold">Материалы</h3>
              <span className="text-[13px] text-gray tabular-nums">{total}</span>
            </div>
            <div className="list-group">
              {shown.map(m => {
                const n = page * ITEMS_PER_PAGE + listMats.indexOf(m) + 1
                const isCur = m.id === currentId
                return (
                  <button key={m.id} onClick={() => onMaterial(m.id, section.id, page)}
                    className="w-full flex items-center gap-3 px-3.5 py-[11px] text-left active:bg-white/[.04] transition-colors"
                    style={isCur ? { background: 'linear-gradient(90deg,rgba(23,229,132,.14),transparent 70%)' } : undefined}>
                    <span className={`w-[38px] h-[38px] rounded-full grid place-items-center shrink-0 text-[13px] font-semibold tabular-nums
                      ${isCur ? 'bg-green text-ink' : m.viewed ? 'bg-green/15 text-green' : 'bg-white/[.06] text-gray'}`}>
                      {m.viewed && !isCur ? <Icon name="check" size={16} strokeWidth={2.3} /> : n}
                    </span>
                    <span className="flex-1 min-w-0">
                      <b className={`block text-[14.5px] font-medium leading-snug line-clamp-2 ${m.locked ? 'text-fg/60' : ''}`}><LevelMark level={(m as { title_level?: string }).title_level} />{m.title}</b>
                      <span className="flex items-center gap-2 mt-1 text-[12px] text-gray2 min-w-0">
                        {m.locked && <PremiumBadge small />}
                        {isCur
                          ? <span className="text-green">Продолжите здесь</span>
                          : <span className="truncate">{m.is_archive ? 'Архив' : typeLabel(m.media_type)}{(m.files_count ?? 0) > 1 ? ` · ${m.files_count} файла` : ''}</span>}
                        <CardSocial rating={m.rating} ratingCount={m.rating_count} comments={m.comments_count} />
                      </span>
                    </span>
                    <MediaTypeIcon type={m.media_type} size={30} radius={9} iconSize={15} />
                  </button>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-3">
                <button disabled={page === 0} onClick={() => loadPage(page - 1)} aria-label="Предыдущая страница"
                  className="w-10 h-10 rounded-full bg-s1 border border-white/[.08] grid place-items-center text-fg disabled:opacity-30"><Icon name="chevL" size={18} /></button>
                {editingPage ? (
                  <span className="flex items-center gap-1.5">
                    <input
                      type="number" inputMode="numeric" min={1} max={totalPages} autoFocus
                      id="section-page"
                      value={pageInput}
                      onChange={e => setPageInput(e.target.value)}
                      onFocus={e => e.currentTarget.select()}
                      onBlur={commitPageJump}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingPage(false)
                      }}
                      className="w-12 h-10 bg-s1 border border-green/50 rounded-[12px] text-[14px] text-fg text-center outline-none tabular-nums"
                    />
                    <span className="text-[13.5px] text-gray tabular-nums">/ {totalPages}</span>
                  </span>
                ) : (
                  <button onClick={() => { setPageInput(String(page + 1)); setEditingPage(true) }}
                    className="h-10 min-w-[64px] px-3 rounded-full bg-s1 border border-white/[.08] text-[13.5px] text-gray tabular-nums active:text-fg">
                    {page + 1} / {totalPages}
                  </button>
                )}
                <button disabled={page >= totalPages - 1} onClick={() => loadPage(page + 1)} aria-label="Следующая страница"
                  className="w-10 h-10 rounded-full bg-s1 border border-white/[.08] grid place-items-center text-fg disabled:opacity-30"><Icon name="chevR" size={18} /></button>
              </div>
            )}
          </section>
        ) : !subs.length && (
          <div className="flex flex-col items-center text-center gap-3 py-14">
            <span className="w-14 h-14 rounded-[18px] bg-s1 border border-white/[.07] grid place-items-center text-[#CFDAD4]"><Icon name="folder" size={26} /></span>
            <div className="font-display font-semibold text-[15px]">Раздел пока пуст</div>
            <div className="text-[13.5px] text-gray">Скоро здесь появятся материалы.</div>
          </div>
        )}
      </div>
    </div>
  )
}
