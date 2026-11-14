import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Material } from '../api/client'
import MediaTypeIcon from './MediaTypeIcon'
import PremiumBadge from './PremiumBadge'
import Icon from './Icon'
import { useHideNav } from '../hooks/useHideNav'

type Open = (id: number, sectionId: number) => void

function Rows({ items, onMaterial }: { items: Material[]; onMaterial: Open }) {
  return (
    <div className="list-group">
      {items.map((m, i) => (
        <button key={m.id} onClick={() => onMaterial(m.id, m.section_id)}
          className="w-full flex items-center gap-3 px-3.5 py-[11px] text-left active:bg-white/[.04] transition-colors">
          <span className="w-[26px] text-center text-[13px] font-semibold text-gray tabular-nums shrink-0">{i + 1}</span>
          <span className="flex-1 min-w-0">
            <b className="block text-[14.5px] font-medium leading-snug line-clamp-2">{m.title}</b>
            <span className="flex items-center gap-2 mt-1">
              {m.locked && <PremiumBadge small />}
              <small className="text-[12px] text-gray2 truncate">{m.section_title}</small>
            </span>
          </span>
          <MediaTypeIcon type={m.media_type} size={30} radius={9} iconSize={15} />
        </button>
      ))}
    </div>
  )
}

/** Блок «Популярное» на главной. */
export function PopularBlock({ onMaterial }: { onMaterial: Open }) {
  const [items, setItems] = useState<Material[]>([])
  useEffect(() => { api.popular().then(d => setItems((d.materials || []).slice(0, 5))).catch(() => {}) }, [])
  if (items.length < 3) return null
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between px-1 pb-2">
        <h3 className="text-[17px] font-bold">Популярное за месяц</h3>
      </div>
      <Rows items={items} onMaterial={onMaterial} />
    </section>
  )
}

/** Знакомство для новичка — показывается один раз. */
export function WelcomeSheet({ onMaterial, onSections }: { onMaterial: Open; onSections: () => void }) {
  const [open, setOpen] = useState(() => { try { return !localStorage.getItem('welcome_v1') } catch { return false } })
  const [items, setItems] = useState<Material[]>([])
  useHideNav(open)
  useEffect(() => { if (open) api.popular().then(d => setItems((d.materials || []).slice(0, 4))).catch(() => {}) }, [open])
  const close = () => { try { localStorage.setItem('welcome_v1', '1') } catch { /* */ } setOpen(false) }
  if (!open) return null
  const tips: { icon: 'library' | 'search' | 'bookmark'; t: string; s: string }[] = [
    { icon: 'library', t: 'Разделы', s: 'Вся база по темам: от OSINT и ИИ до курсов с заданиями.' },
    { icon: 'search', t: 'Поиск', s: 'Ищет по названиям, тексту и именам файлов.' },
    { icon: 'bookmark', t: 'Библиотека', s: 'Избранное, история и ваш прогресс по разделам.' },
  ]
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60" onClick={close} />
      <div className="fixed z-[71] left-0 right-0 bottom-0 mx-auto w-full max-w-[600px] max-h-[88vh] overflow-y-auto rounded-t-[26px] bg-s1 border-t border-white/[.08] px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}>
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-[19px] leading-tight">С чего начать</h3>
        <p className="text-[13.5px] text-gray mt-1 mb-3">Коротко о том, как устроена база.</p>
        <div className="flex flex-col gap-2.5 mb-4">
          {tips.map(x => (
            <div key={x.t} className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-[11px] bg-white/[.06] grid place-items-center shrink-0 text-green"><Icon name={x.icon} size={18} /></span>
              <span className="min-w-0"><b className="block text-[14.5px] font-semibold">{x.t}</b><small className="block text-[13px] text-gray leading-snug">{x.s}</small></span>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <>
            <h4 className="text-[14px] font-bold px-1 pb-2">Чаще всего открывают</h4>
            <Rows items={items} onMaterial={(id, sid) => { close(); onMaterial(id, sid) }} />
          </>
        )}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 h-[56px] rounded-[18px] border border-white/[.1] bg-white/[.04] text-[15px] font-semibold" onClick={close}>Понятно</button>
          <button className="btn-gold gold-metal sheen flex-1" onClick={() => { close(); onSections() }}><b>К разделам</b></button>
        </div>
      </div>
    </>
  )
}
