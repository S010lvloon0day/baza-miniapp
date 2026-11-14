import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import type { APrices, APurchases, AAbandoned, AContentStats } from '../../api/admin'
import type { Nav } from './AdminPage'
import { Badge, Empty, Field, Loader, Row, SectionTitle, Sheet, ago, errMsg, fmtDate, num, toast, useConfirm } from './ui'

const DAYS: Record<number, string> = { 30: '1 месяц', 90: '3 месяца', 365: '12 месяцев' }
const who = (u: { username: string; name: string; user_id: number }) => u.username ? '@' + u.username : (u.name || String(u.user_id))

/* ───────────── Цены и курс ───────────── */
export function PricesScreen() {
  const [d, setD] = useState<APrices | null>(null)
  const [rate, setRate] = useState('')
  const [plans, setPlans] = useState<{ days: number; usd: string; rub: string }[]>([])
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => adminApi.prices().then(r => {
    setD(r); setRate(String(r.rub_per_usd)); setPlans(r.plans.map(p => ({ days: p.days, usd: String(p.usd), rub: String(p.rub) })))
  }).catch(e => toast(errMsg(e), true)), [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loader />
  const base = Number(plans[0]?.rub) || 0
  const save = async () => {
    setBusy(true)
    try {
      await adminApi.savePrices({ rub_per_usd: Number(rate.replace(',', '.')), plans: plans.map(p => ({ days: p.days, usd: Number(p.usd.replace(',', '.')), rub: Number(p.rub) })) })
      toast('Цены сохранены'); load()
    } catch (e) { toast(errMsg(e), true) } finally { setBusy(false) }
  }
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <SectionTitle>Курс рубля</SectionTitle>
      <Field label="Рублей за 1 $ — по нему считаются цены курсов и платных разделов" type="number" value={rate} onChange={setRate} />
      <SectionTitle>Тарифы Premium</SectionTitle>
      {plans.map((p, i) => {
        const months = p.days === 365 ? 12 : p.days / 30
        const off = base > 0 && i > 0 ? Math.round((1 - Number(p.rub) / months / base) * 100) : 0
        return (
          <div key={p.days} className="card p-3.5 mb-2">
            <div className="flex items-center justify-between mb-2">
              <b className="text-[14.5px] font-semibold">{DAYS[p.days]}</b>
              {i > 0 && <Badge tone={off >= 5 ? 'green' : 'gray'}>{off > 0 ? `скидка ${off}%` : 'без скидки'}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Рубли (СБП)" type="number" value={p.rub} onChange={v => setPlans(plans.map(x => x.days === p.days ? { ...x, rub: v } : x))} />
              <Field label="USDT (крипта)" type="number" value={p.usd} onChange={v => setPlans(plans.map(x => x.days === p.days ? { ...x, usd: v } : x))} />
            </div>
          </div>
        )
      })}
      <p className="text-[12.5px] text-gray2 px-1 mb-3">Новые цены начинают действовать в течение минуты, перезапуск не нужен. Плашка скидки в профиле появляется, если скидка от 5%.{!d.rub_enabled && ' Оплата рублями сейчас выключена на сервере.'}</p>
      <button className="btn-primary w-full" disabled={busy} onClick={save}>{busy ? 'Сохраняю…' : 'Сохранить'}</button>
    </div>
  )
}

/* ───────────── Покупки разделов ───────────── */
export function PurchasesScreen({ nav }: { nav: Nav }) {
  const [d, setD] = useState<APurchases | null>(null)
  const [sheet, setSheet] = useState(false)
  const [uid, setUid] = useState('')
  const [sid, setSid] = useState('')
  const { ask, node } = useConfirm()
  const load = useCallback(() => adminApi.purchases().then(r => { setD(r); setSid(s => s || String(r.sections[0]?.id ?? '')) }).catch(e => toast(errMsg(e), true)), [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loader />
  const grant = async () => {
    try { await adminApi.grantSection(Number(uid), Number(sid)); toast('Доступ открыт'); setSheet(false); setUid(''); load() } catch (e) { toast(errMsg(e), true) }
  }
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <button className="btn-primary w-full" onClick={() => setSheet(true)}>Выдать доступ вручную</button>
      <SectionTitle>Куплено: {d.purchases.length}</SectionTitle>
      {d.purchases.length ? <div className="list-group">{d.purchases.map(p => (
        <Row key={p.user_id + ':' + p.section_id} icon="book" tone="gold" title={<>{p.title} <span className="text-gray font-normal">· {who(p)}</span></>}
          sub={`${p.how} · ${fmtDate(p.at)}`} onClick={() => nav.push({ k: 'user', id: p.user_id })}
          right={<button className="text-[12.5px] text-[#FF8A8A] font-semibold px-2 py-1" onClick={async e => {
            e.stopPropagation()
            if (await ask(`Забрать у ${who(p)} доступ к «${p.title}»?`, 'Забрать')) { try { await adminApi.revokeSection(p.user_id, p.section_id); toast('Доступ забран'); load() } catch (er) { toast(errMsg(er), true) } }
          }}>Забрать</button>} />
      ))}</div> : <Empty icon="book" text="Покупок пока нет" />}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Выдать доступ">
        {d.sections.length === 0 ? <p className="text-[14px] text-gray mb-4">Разделов с отдельной ценой пока нет.</p> : (<>
          <Field label="ID пользователя" type="number" value={uid} onChange={setUid} />
          <label className="block mb-4">
            <span className="block text-[12.5px] text-gray mb-1.5 px-1">Раздел</span>
            <select className="w-full bg-s2 border border-white/[.08] rounded-[14px] px-3 py-3 text-[15px] outline-none" value={sid} onChange={e => setSid(e.target.value)}>
              {d.sections.map(s => <option key={s.id} value={s.id}>{s.title} — {s.price} $</option>)}
            </select>
          </label>
          <button className="btn-primary w-full" disabled={!uid || !sid} onClick={grant}>Открыть доступ</button>
        </>)}
      </Sheet>
      {node}
    </div>
  )
}

/* ───────────── Брошенные оплаты ───────────── */
export function AbandonedScreen({ nav }: { nav: Nav }) {
  const [d, setD] = useState<AAbandoned | null>(null)
  useEffect(() => { adminApi.abandoned().then(setD).catch(e => toast(errMsg(e), true)) }, [])
  if (!d) return <Loader />
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-4"><span className="text-[12px] text-gray">Начинали оплату, 30 дн.</span><b className="font-display font-semibold text-[20px] block mt-1">{num(d.started)}</b></div>
        <div className="card p-4"><span className="text-[12px] text-gray">Не оплатили</span><b className="font-display font-semibold text-[20px] block mt-1">{num(d.abandoned)}</b></div>
      </div>
      <p className="text-[12.5px] text-gray2 px-1 mt-3">Люди без Premium, у которых после последней попытки не было оплаты. Нажмите на человека, чтобы написать ему от бота.</p>
      <SectionTitle>Кому написать</SectionTitle>
      {d.users.length ? <div className="list-group">{d.users.map(u => (
        <Row key={u.user_id} icon="clock" tone="gold" title={who(u)} sub={`${u.what} · попыток: ${u.tries} · ${ago(u.at)}`} onClick={() => nav.push({ k: 'user', id: u.user_id })} />
      ))}</div> : <Empty icon="card" text="Брошенных оплат нет" />}
    </div>
  )
}

/* ───────────── Статистика контента ───────────── */
export function ContentStatsScreen({ nav }: { nav: Nav }) {
  const [d, setD] = useState<AContentStats | null>(null)
  useEffect(() => { adminApi.contentStats().then(setD).catch(e => toast(errMsg(e), true)) }, [])
  if (!d) return <Loader />
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="grid grid-cols-3 gap-2">
        {([['Читали сегодня', d.readers.d1], ['За 7 дней', d.readers.d7], ['За 30 дней', d.readers.d30]] as [string, number][]).map(([l, v]) => (
          <div key={l} className="card px-3 py-3 text-center"><b className="font-display font-semibold text-[18px] block">{num(v)}</b><span className="text-[11.5px] text-gray">{l}</span></div>
        ))}
      </div>
      <SectionTitle>Чаще всего открывают, 30 дней</SectionTitle>
      {d.top.length ? <div className="list-group">{d.top.map((m, i) => (
        <Row key={m.id} title={`${i + 1}. ${m.title}`} sub={m.section} right={<span className="text-[13px] text-gray tabular-nums">{m.users} чел.</span>} onClick={() => nav.push({ k: 'material', id: m.id })} />
      ))}</div> : <Empty icon="doc" text="Данных пока нет" />}
      <SectionTitle right={<span className="text-[12.5px] text-gray">всего {num(d.never_opened)}</span>}>Ни разу не открывали</SectionTitle>
      {d.dead_sections.length ? <div className="list-group">{d.dead_sections.map(s => (
        <Row key={s.id} icon="folder" tone="gray" title={s.title} right={<span className="text-[13px] text-gray tabular-nums">{s.never} из {s.total}</span>} onClick={() => nav.push({ k: 'section', id: s.id, title: s.title })} />
      ))}</div> : <Empty icon="checkCircle" text="Все материалы хоть раз открывали" />}
      {d.empty_sections.length > 0 && (<>
        <SectionTitle>Пустые разделы</SectionTitle>
        <div className="list-group">{d.empty_sections.map(s => <Row key={s.id} icon="folder" tone="gray" title={s.title} onClick={() => nav.push({ k: 'section', id: s.id, title: s.title })} />)}</div>
      </>)}
      {d.no_description.length > 0 && (<>
        <SectionTitle>Без описания</SectionTitle>
        <div className="list-group">{d.no_description.map(s => <Row key={s.id} icon="folder" tone="gray" title={s.title} onClick={() => nav.push({ k: 'section', id: s.id, title: s.title })} />)}</div>
      </>)}
    </div>
  )
}
