import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, CaretDown } from '@phosphor-icons/react'
import { api } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'
import type { Section, Material, Banner } from '../api/client'
import BannerCard from '../components/BannerCard'
import CategoryIcon from '../components/CategoryIcon'
import BazaMark from '../components/BazaMark'

interface Props {
  onSection: (s: Section) => void
  onMaterial: (id: number, sectionId: number) => void
  onTabCats: () => void
  botUsername?: string
}

export default function HomePage({ onSection, onMaterial, onTabCats, botUsername }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [recent, setRecent] = useState<Material[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, b, rd] = await Promise.all([
        api.sections().catch(() => ({ sections: [] as Section[] })),
        api.banner().catch(() => ({ banners: [] as Banner[] })),
        api.recent().catch(() => ({ materials: [] as Material[], today_count: 0, today_sections: [], total_count: 0 })),
      ])
      if (!alive) return
      setSections(d.sections.filter(s => !s.parent_id))
      setBanners(b.banners ?? [])
      setRecent((rd.materials ?? []).slice(0, 4))
      setTotalCount(rd.total_count ?? 0)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const openSubmit = () => {
    if (!botUsername) return
    const url = `https://t.me/${botUsername}?start=submit`
    const tg = (window as any).Telegram?.WebApp
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

  const featured = sections.find(s => s.title === 'Знания S010lvloon')

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3">

        {/* Hero */}
        <div
          className="relative overflow-hidden rounded-[22px] px-5 pt-6 pb-6 mb-5"
          style={{ border: '1px solid rgba(255,255,255,.08)', background: 'radial-gradient(120% 100% at 100% 0%, rgba(34,197,94,.14), transparent 55%), #0D0D11' }}
        >
          {/* Decorative orbit rings + particles */}
          <svg width="260" height="260" viewBox="0 0 260 260" fill="none" className="absolute pointer-events-none" style={{ right: -70, top: -60, opacity: .5 }}>
            <circle cx="130" cy="130" r="90" stroke="#22C55E" strokeOpacity=".18" strokeWidth="1" />
            <circle cx="130" cy="130" r="115" stroke="#22C55E" strokeOpacity=".1" strokeWidth="1" />
            <circle cx="215" cy="60" r="3" fill="#4AE885" fillOpacity=".6" />
            <circle cx="240" cy="130" r="2" fill="#4AE885" fillOpacity=".5" />
            <circle cx="190" cy="20" r="2" fill="#4AE885" fillOpacity=".5" />
          </svg>
          {/* Diamond watermark */}
          <div className="absolute pointer-events-none" style={{ right: 6, top: 26, opacity: .06 }}>
            <BazaMark size={150} color="#fff" />
          </div>
          {/* Animated light streak */}
          <svg width="140" height="220" viewBox="0 0 140 220" fill="none" className="absolute pointer-events-none" style={{ right: 14, top: -10 }}>
            <path d="M110 0 C90 60 130 110 100 220" stroke="#4AE885" strokeWidth="2" strokeLinecap="round" opacity=".3" />
            <path
              d="M110 0 C90 60 130 110 100 220"
              stroke="#9FFFC2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 260"
              style={{ filter: 'drop-shadow(0 0 6px rgba(74,232,133,.85))', animation: 'bazaLinePulse 2.6s linear infinite' }}
            />
          </svg>
          <div className="baza-grain" />

          <div className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mb-[18px]" style={{ border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)' }}>
            <span className="w-1.5 h-1.5 rounded-full baza-dot-pulse" style={{ background: '#22C55E' }} />
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#cfcfd4]">База знаний S010lvloon</span>
          </div>

          <div className="relative uppercase mb-2.5" style={{ fontFamily: "'Anton', sans-serif", fontSize: 35, lineHeight: 1.12, letterSpacing: '-1.6px' }}>
            <span
              className="relative inline-block"
              style={{ color: '#fff', WebkitTextStroke: '1.9px #fff', textShadow: '1px 2px 0 rgba(0,0,0,.55), -1px 0 0 rgba(0,0,0,.15), 0 -1px 0 rgba(255,255,255,.5)' }}
            >
              Все материалы
            </span>
            <br />
            <span
              className="relative inline-block baza-flicker"
              style={{ color: '#3EEB73', WebkitTextStroke: '1.9px #3EEB73', textShadow: '0 0 1px #7dffab, 0 0 3px rgba(62,235,115,.4), 0 0 5px rgba(62,235,115,.25)' }}
            >
              в одном месте
            </span>
          </div>
          <div className="relative text-[13px] text-[#9a9aa2] leading-relaxed mb-5 max-w-[270px]">
            Гайды, инструменты и разборы по темам. Открывай раздел или ищи материал по названию.
          </div>

          <div className="relative flex gap-2.5">
            <button
              onClick={onTabCats}
              className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-[13px] text-bg text-[12px] whitespace-nowrap font-extrabold transition-transform duration-150 active:-translate-y-0.5"
              style={{ background: 'linear-gradient(180deg,#ffffff,#e8ebe9)', boxShadow: '0 8px 20px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.4) inset' }}
            >
              Смотреть разделы
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button
              onClick={openSubmit}
              className="flex-1 flex items-center justify-center py-3.5 rounded-[13px] text-white text-[12px] whitespace-nowrap font-bold transition-transform duration-150 active:bg-white/[.1] active:border-white/30 active:-translate-y-0.5"
              style={{ border: '1px solid rgba(255,255,255,.14)', background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))', boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}
            >
              Предложить материал
            </button>
          </div>
        </div>

        {/* Banner slot */}
        {banners.length > 0 && (
          <div className="rounded-[18px] overflow-hidden mb-5" style={{ border: '1px solid rgba(255,255,255,.08)' }}>
            <BannerCard banners={banners} />
          </div>
        )}

        {/* Новое — collapsible */}
        <div onClick={() => setNewOpen(o => !o)} className="flex items-center justify-between mb-3 cursor-pointer">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2] font-mono">
            <motion.span animate={{ rotate: newOpen ? 0 : -90 }} transition={{ duration: 0.2 }} className="flex">
              <CaretDown size={12} weight="bold" />
            </motion.span>
            // Новое
          </span>
          <button onClick={e => { e.stopPropagation(); onTabCats() }} className="text-white text-[12px] font-bold active:opacity-70 transition-opacity">
            Смотреть все ›
          </button>
        </div>

        {newOpen && (
          <div className="rounded-2xl mb-7 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
            <div className="px-[18px] py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-1.5" style={{ color: '#7a7a83' }}>Всего материалов</div>
              <div className="text-[32px] font-extrabold text-white">{totalCount}</div>
            </div>
            {recent.length > 0 && (
              <>
                <div className="px-[18px] pt-3.5 pb-1.5 text-[10px] font-bold tracking-[1.2px] uppercase" style={{ color: '#7a7a83' }}>Последние добавленные</div>
                <div className="flex flex-col">
                  {recent.map(m => (
                    <div
                      key={m.id}
                      onClick={() => onMaterial(m.id, m.section_id)}
                      className="flex items-center gap-3 px-[18px] py-3 cursor-pointer transition-colors duration-150 active:bg-white/[.04]"
                    >
                      <MediaTypeIcon type={m.media_type} size={36} radius={10} iconSize={16} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#8a8a93] mb-0.5 truncate">{m.section_title}</div>
                        <div className="text-[14px] font-semibold truncate">{m.title}</div>
                      </div>
                      {m.locked && <Crown size={14} weight="fill" className="shrink-0 text-violet opacity-80" />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Featured — авторский раздел S010lvloon */}
        {featured && (
            <div
              onClick={() => onSection(featured)}
              className="relative mb-5 cursor-pointer overflow-hidden rounded-md active:opacity-80 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, rgba(255,188,46,.12), rgba(255,140,0,.05))',
                border: '1px solid rgba(255,188,46,.45)',
                boxShadow: '0 0 22px rgba(255,188,46,.12)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,188,46,.8), transparent)' }} />
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,188,46,.14)', border: '1px solid rgba(255,188,46,.35)', color: '#FFCB57' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ filter: 'drop-shadow(0 0 5px rgba(255,188,46,.9))' }}>
                    <path d="M12 2l2.6 6.6L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.4-.4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded-sm" style={{ background: 'rgba(255,188,46,.18)' }}>
                    <span className="text-[8px] font-bold tracking-[2px] uppercase" style={{ color: '#FFBC2E' }}>★ Автор</span>
                  </div>
                  <div className="text-[14px] font-bold text-white leading-tight truncate">{featured.title}</div>
                  <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,188,46,.7)' }}>// курс · публикации · фишки</div>
                </div>
                <span className="font-bold text-[20px] shrink-0" style={{ color: '#FFBC2E' }}>›</span>
              </div>
            </div>
        )}

        {/* Categories */}
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2] mb-3.5">Разделы</div>
        <div className="grid grid-cols-4 gap-2 pb-4">
          {sections.filter(s => s.title !== 'Знания S010lvloon').slice(0, 8).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSection(s)}
              className="relative rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer overflow-hidden transition-transform duration-150 active:-translate-y-0.5 active:border-green/50"
              style={{ border: '1px solid rgba(255,255,255,.09)', background: 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.05), transparent 60%), #101014' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent)' }} />
              <span className="absolute top-1.5 left-1.5 font-mono text-[8px] text-gray2/60 leading-none tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="w-10 h-10 flex items-center justify-center">
                <CategoryIcon title={s.title} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#d4d4d8] text-center leading-tight w-full line-clamp-2">
                {s.title}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Ad contact */}
        <div
          onClick={() => {
            const tg = (window as any).Telegram?.WebApp
            if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/S010lvloon_bot')
            else window.open('https://t.me/S010lvloon_bot', '_blank')
          }}
          className="relative mb-6 flex items-center gap-3.5 cursor-pointer overflow-hidden rounded-2xl transition-transform duration-150 active:-translate-y-0.5"
          style={{
            padding: '14px 16px',
            border: '1px solid rgba(255,188,46,.4)',
            background: 'linear-gradient(135deg,rgba(255,188,46,.1),rgba(20,15,4,.4) 60%)',
            boxShadow: '0 8px 20px rgba(255,140,0,.08)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,188,46,.6),transparent)' }} />
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: 'radial-gradient(circle,rgba(255,188,46,.32),rgba(255,188,46,.06) 68%,transparent)', boxShadow: '0 0 16px rgba(255,188,46,.35)', color: '#FFCB57' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11v2a2 2 0 0 0 2 2h2l4 4V5L7 9H5a2 2 0 0 0-2 2z" />
              <path d="M16 8a4 4 0 0 1 0 8" />
              <path d="M18.5 5.5a8 8 0 0 1 0 13" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: '#FFCB57' }}>По вопросам рекламы</div>
            <div className="text-[13px] font-semibold text-white mt-0.5">@S010lvloon_bot</div>
          </div>
          <span className="font-extrabold text-[18px] shrink-0" style={{ color: '#FFCB57' }}>›</span>
        </div>
      </div>
    </div>
  )
}
