import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../api/admin'
import type { ACodes, ACodeBatch, ACodeRow } from '../../api/admin'
import Icon from '../../components/Icon'
import { Badge, Empty, Field, Loader, Row, SectionTitle, Segmented, Sheet, ago, errMsg, fmtDate, num, toast, useConfirm } from './ui'

const DUR: [string, string][] = [['0', 'Навсегда'], ['7', '7 дн'], ['30', '30 дн'], ['90', '90 дн'], ['365', 'Год'], ['x', 'Своё']]
const durText = (d: number | null) => !d ? 'навсегда' : d % 365 === 0 ? `${d / 365} г.` : `${d} дн.`
const copy = async (t: string, msg = 'Скопировано') => {
  try { await navigator.clipboard.writeText(t); toast(msg) } catch {
    const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select()
    try { document.execCommand('copy'); toast(msg) } catch { toast('Не удалось скопировать', true) } finally { a.remove() }
  }
}

/* ───────────── Коды доступа к разделам ───────────── */
export function CodesScreen() {
  const [d, setD] = useState<ACodes | null>(null)
  const [create, setCreate] = useState(false)
  const [open, setOpen] = useState<ACodeBatch | null>(null)
  const load = useCallback(() => adminApi.codes().then(setD).catch(e => toast(errMsg(e), true)), [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loader />
  const used = d.batches.reduce((s, b) => s + b.used, 0), total = d.batches.reduce((s, b) => s + b.total, 0)
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="card p-4 mb-3" style={{ borderColor: 'rgba(233,201,135,.25)' }}>
        <p className="text-[13px] text-gray leading-relaxed">Код открывает <b className="text-fg">только один выбранный раздел</b> со всеми подразделами — остальная База остаётся закрытой. Человек вводит код в разделе («Есть код доступа?») или открывает ссылку.</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {([['Создано', num(total)], ['Активировано', num(used)], ['С доступом', num(d.people)]] as const).map(([l, v]) => (
            <div key={l} className="rounded-[12px] bg-black/25 px-3 py-2"><b className="block text-[16px] font-semibold text-gold">{v}</b><span className="text-[11.5px] text-gray">{l}</span></div>
          ))}
        </div>
      </div>
      <button className="btn-primary w-full gap-1.5" onClick={() => setCreate(true)}><Icon name="plus" size={16} />Создать коды</button>

      <SectionTitle>Партии кодов</SectionTitle>
      {d.batches.length === 0 ? <Empty icon="gift" text="Кодов пока нет" /> : (
        <div className="card overflow-hidden">
          {d.batches.map(b => (
            <Row key={b.batch} icon="gift" tone="gold" onClick={() => setOpen(b)}
              title={b.section}
              sub={`${durText(b.days)} · ${b.note || fmtDate(b.created_at)}`}
              right={<Badge tone={b.used >= b.total ? 'gray' : 'gold'}>{b.used}/{b.total}</Badge>} />
          ))}
        </div>
      )}
      <CreateSheet open={create} onClose={() => setCreate(false)} sections={d.sections} onDone={load} />
      <BatchSheet batch={open} onClose={() => setOpen(null)} onChange={load} />
    </div>
  )
}

function CreateSheet({ open, onClose, sections, onDone }: { open: boolean; onClose: () => void; sections: ACodes['sections']; onDone: () => void }) {
  const [sid, setSid] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [dur, setDur] = useState('0')
  const [custom, setCustom] = useState('14')
  const [count, setCount] = useState('1')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ codes: { code: string; link: string }[]; sent: boolean; total: number; title: string } | null>(null)
  const sec = sections.find(s => s.id === sid)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (t ? sections.filter(s => (s.title + ' ' + s.path).toLowerCase().includes(t)) : sections.filter(s => s.depth === 0)).slice(0, 60)
  }, [q, sections])
  const days = dur === 'x' ? Number(custom) || 0 : Number(dur)
  const close = () => { onClose(); setRes(null) }
  const submit = async () => {
    if (!sid) return toast('Выберите раздел', true)
    setBusy(true)
    try {
      const r = await adminApi.codesCreate({ section_id: sid, days, count: Number(count) || 1, note })
      setRes({ codes: r.codes, sent: r.sent, total: Number(count) || 1, title: sec?.title || '' }); onDone()
    } catch (e) { toast(errMsg(e), true) } finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onClose={close} title={res ? 'Коды готовы' : 'Новые коды'}>
      {res ? (
        <>
          <p className="text-[13.5px] text-gray mb-3">«{res.title}» · {durText(days)} · {res.total} шт.{res.sent ? ' Файл со всеми кодами и ссылками отправлен вам в бот.' : ''}</p>
          {res.codes.length <= 20 && res.codes.map(c => (
            <div key={c.code} className="card px-3.5 py-2.5 mb-2 flex items-center gap-2">
              <b className="flex-1 font-mono tracking-[.08em] text-[15px]">{c.code}</b>
              <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => copy(c.code, 'Код скопирован')}>Код</button>
              <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => copy(c.link, 'Ссылка скопирована')}>Ссылка</button>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button className="btn-secondary" onClick={() => copy(res.codes.map(c => c.code).join('\n'), 'Коды скопированы')}>Копировать коды</button>
            <button className="btn-secondary" onClick={() => copy(res.codes.map(c => `${c.code} — ${c.link}`).join('\n'), 'Скопировано')}>Коды + ссылки</button>
          </div>
          {res.total > res.codes.length && <p className="text-[12px] text-gray2 mt-2">Здесь показаны первые {res.codes.length} — полный список в файле в боте.</p>}
          <button className="btn-primary w-full mt-3" onClick={() => setRes(null)}>Создать ещё</button>
        </>
      ) : (
        <>
          <span className="block text-[12.5px] text-gray mb-1.5 px-1">Раздел</span>
          {sec ? (
            <button className="card w-full px-3.5 py-3 mb-3 flex items-center gap-2 text-left" style={{ borderColor: 'rgba(233,201,135,.35)' }} onClick={() => setSid(null)}>
              <span className="flex-1 min-w-0"><b className="block text-[14.5px] truncate">{sec.emoji} {sec.title}</b>{sec.path && <small className="block text-[12px] text-gray truncate">{sec.path}</small>}</span>
              <span className="text-[12.5px] text-gold">изменить</span>
            </button>
          ) : (
            <>
              <Field value={q} onChange={setQ} placeholder="Поиск раздела или подраздела…" />
              <div className="card overflow-hidden mb-3 max-h-[260px] overflow-y-auto -mt-1">
                {list.map(s => (
                  <Row key={s.id} title={`${s.emoji} ${s.title}`} sub={s.path || (s.closed ? 'закрытый раздел' : 'открытый раздел')} onClick={() => { setSid(s.id); setQ('') }} />
                ))}
                {list.length === 0 && <p className="px-4 py-3 text-[13px] text-gray">Ничего не найдено</p>}
              </div>
            </>
          )}
          <span className="block text-[12.5px] text-gray mb-1.5 px-1">Срок доступа</span>
          <Segmented value={dur} onChange={setDur} items={DUR} />
          {dur === 'x' && <div className="mt-2"><Field label="Дней" type="number" value={custom} onChange={setCustom} /></div>}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Field label="Сколько кодов" type="number" value={count} onChange={setCount} />
            <Field label="Заметка (для себя)" value={note} onChange={setNote} placeholder="розыгрыш, Иван…" />
          </div>
          <div className="flex gap-2 -mt-1 mb-3">{['1', '10', '100', '500'].map(n => <button key={n} className={`chip ${count === n ? 'on' : ''}`} onClick={() => setCount(n)}>{n}</button>)}</div>
          <button className="btn-primary w-full" disabled={busy || !sid} onClick={submit}>{busy ? 'Создаю…' : `Создать ${Number(count) || 1} шт. · ${durText(days)}`}</button>
        </>
      )}
    </Sheet>
  )
}

function BatchSheet({ batch, onClose, onChange }: { batch: ACodeBatch | null; onClose: () => void; onChange: () => void }) {
  const [rows, setRows] = useState<ACodeRow[] | null>(null)
  const [f, setF] = useState<'all' | 'free' | 'used'>('all')
  const { ask, node } = useConfirm()
  const load = useCallback(() => { if (batch) adminApi.codesBatch(batch.batch).then(r => setRows(r.codes)).catch(e => toast(errMsg(e), true)) }, [batch])
  useEffect(() => { setRows(null); setF('all'); load() }, [load])
  const free = rows?.filter(r => !r.used_by) || []
  const shown = (rows || []).filter(r => f === 'all' || (f === 'free' ? !r.used_by : !!r.used_by)).slice(0, 300)
  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    try { return await adminApi.codesAction({ batch: batch!.batch, action, ...extra }) } catch (e) { toast(errMsg(e), true) }
  }
  return (
    <Sheet open={!!batch} onClose={onClose} title={batch?.section || ''}>
      {batch && <p className="text-[13px] text-gray mb-3">{durText(batch.days)} · создано {fmtDate(batch.created_at)}{batch.note ? ` · ${batch.note}` : ''}</p>}
      {!rows ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button className="btn-secondary text-[13.5px]" onClick={() => copy(free.map(r => r.code).join('\n'), `Скопировано ${free.length} свободных`)}>Копировать свободные</button>
            <button className="btn-secondary text-[13.5px]" onClick={async () => { const r = await act('send'); if (r?.ok) toast('Файл отправлен в бот') }}>Файлом в бот</button>
          </div>
          <Segmented value={f} onChange={setF} items={[['all', 'Все', rows.length], ['free', 'Свободные', free.length], ['used', 'Активированы', rows.length - free.length]]} />
          <div className="card overflow-hidden mt-2">
            {shown.map(r => (
              <div key={r.code} className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[.04] last:border-0">
                <span className="flex-1 min-w-0">
                  <b className={`block font-mono tracking-[.06em] text-[14px] ${r.used_by ? 'text-gray line-through' : ''}`}>{r.code}</b>
                  {r.used_by && <small className="block text-[12px] text-gray truncate">{r.username ? '@' + r.username : r.name || r.used_by} · {ago(r.used_at)}</small>}
                </span>
                {r.used_by
                  ? <button className="text-[12.5px] text-[#FF8080] px-2" onClick={async () => {
                      if (!await ask(`Забрать доступ к «${batch!.section}» у ${r.username ? '@' + r.username : r.used_by}?`, 'Забрать')) return
                      const x = await act('revoke_user', { user_id: r.used_by, section_id: batch!.section_id }); if (x?.ok) toast('Доступ забран')
                    }}>забрать</button>
                  : <button className="text-[12.5px] text-gold px-2" onClick={() => copy(r.link, 'Ссылка скопирована')}>ссылка</button>}
              </div>
            ))}
          </div>
          {free.length > 0 && (
            <button className="w-full h-11 mt-3 rounded-[14px] text-[14px] font-semibold text-[#FF8080] bg-[rgba(255,107,107,.1)]" onClick={async () => {
              if (!await ask(`Удалить ${free.length} неактивированных кодов? Ими больше нельзя будет воспользоваться. Уже выданный доступ останется.`)) return
              const x = await act('revoke_unused'); if (x?.ok) { toast(`Удалено: ${x.deleted}`); onChange(); x.deleted === rows.length ? onClose() : load() }
            }}>Отозвать свободные коды</button>
          )}
        </>
      )}
      {node}
    </Sheet>
  )
}
