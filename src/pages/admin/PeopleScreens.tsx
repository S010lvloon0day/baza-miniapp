import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { adminApi } from '../../api/admin'
import type { AUser, AUserFull, ASubmission, AComment, ASection } from '../../api/admin'
import { Badge, Empty, Field, Loader, Row, SectionTitle, Segmented, Sheet, Toggle, errMsg, fmtDate, fmtDay, num, toast, useConfirm } from './ui'
import type { Nav } from './AdminPage'

const initials = (u: { name: string; username: string; id: number }) =>
  (u.name || u.username || String(u.id)).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

function Avatar({ u, size = 40 }: { u: { name: string; username: string; id: number; premium?: boolean }; size?: number }) {
  return (
    <span className="rounded-full grid place-items-center font-semibold shrink-0 relative"
      style={{ width: size, height: size, fontSize: size * .36, background: u.premium ? 'linear-gradient(135deg,#F5C25A,#B8862B)' : '#20302A', color: u.premium ? '#2A1C00' : '#CFDAD4' }}>
      {initials(u)}
    </span>
  )
}

/* ───────────── Пользователи ───────────── */

export function UsersScreen({ nav }: { nav: Nav }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'premium' | 'new' | 'banned'>('all')
  const [data, setData] = useState<{ total: number; users: AUser[] } | null>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    setData(null)
    const id = setTimeout(() => adminApi.users(q, filter).then(setData).catch(e => toast(errMsg(e), true)), q ? 300 : 0)
    return () => clearTimeout(id)
  }, [q, filter])

  const loadMore = async () => {
    if (!data) return
    setMore(true)
    try { const r = await adminApi.users(q, filter, data.users.length); setData({ total: r.total, users: [...data.users, ...r.users] }) }
    catch (e) { toast(errMsg(e), true) } finally { setMore(false) }
  }

  return (
    <div className="px-4 pt-3 pb-navsafe">
      <label className="flex items-center gap-2.5 bg-s2 border border-white/[.08] rounded-[14px] px-3.5 h-11 mb-3">
        <Icon name="search" size={17} className="text-gray" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ID, @username или имя" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-gray2" />
      </label>
      <Segmented value={filter} onChange={setFilter} items={[['all', 'Все'], ['premium', 'Premium'], ['new', 'Новые 7 дн.'], ['banned', 'Баны']]} />
      <SectionTitle>{data ? `Найдено: ${num(data.total)}` : 'Загрузка…'}</SectionTitle>
      {!data ? <Loader /> : data.users.length ? (
        <>
          <div className="list-group">
            {data.users.map(u => (
              <button key={u.id} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/[.04]" onClick={() => nav.push({ k: 'user', id: u.id })}>
                <Avatar u={u} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] font-medium truncate">{u.name || u.username || u.id}</span>
                  <span className="block text-[12px] text-gray truncate">{u.username ? '@' + u.username + ' · ' : ''}{u.id}</span>
                </span>
                {u.banned ? <Badge tone="red">Бан</Badge> : u.premium ? <Badge tone="gold">Premium</Badge> : null}
              </button>
            ))}
          </div>
          {data.users.length < data.total && <button className="btn-secondary w-full mt-3" disabled={more} onClick={loadMore}>{more ? 'Загружаю…' : 'Показать ещё'}</button>}
        </>
      ) : <Empty icon="users" text="Никого не нашлось" />}
    </div>
  )
}

export function UserScreen({ id }: { id: number }) {
  const [u, setU] = useState<AUserFull | null>(null)
  const [sheet, setSheet] = useState<'premium' | 'ban' | 'msg' | null>(null)
  const [days, setDays] = useState('30')
  const [notify, setNotify] = useState(true)
  const [reason, setReason] = useState('')
  const [text, setText] = useState('')
  const { ask, node } = useConfirm()
  const load = useCallback(() => adminApi.user(id).then(setU).catch(e => toast(errMsg(e), true)), [id])
  useEffect(() => { load() }, [load])
  if (!u) return <Loader />

  const run = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); toast(ok); setSheet(null); load() } catch (e) { toast(errMsg(e), true) }
  }

  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="card p-4 flex items-center gap-3.5">
        <Avatar u={u} size={56} />
        <div className="flex-1 min-w-0">
          <b className="font-display font-semibold text-[17px] block truncate">{u.name || u.username || u.id}</b>
          <span className="block text-[13px] text-gray truncate">{u.username ? '@' + u.username + ' · ' : ''}ID {u.id}</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {u.premium ? <Badge tone="gold">Premium до {fmtDay(u.premium_until)}</Badge> : <Badge tone="gray">Без Premium</Badge>}
            {u.banned && <Badge tone="red">Забанен</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        {[['Просмотры', u.views], ['XP', u.xp?.xp ?? 0], ['Серия', u.xp?.streak ?? 0]].map(([l, v]) => (
          <div key={l as string} className="card px-3 py-3 text-center">
            <b className="font-display font-semibold text-[18px] block">{num(v as number)}</b>
            <span className="text-[11.5px] text-gray">{l}</span>
          </div>
        ))}
      </div>

      <SectionTitle>Действия</SectionTitle>
      <div className="list-group">
        <Row icon="crown" tone="gold" title="Выдать Premium" sub="Добавить дни к подписке" onClick={() => setSheet('premium')} />
        {u.premium && <Row icon="close" tone="gray" title="Забрать Premium" onClick={async () => { if (await ask('Отключить Premium у пользователя сейчас?', 'Отключить')) run(() => adminApi.revokePremium(u.id), 'Premium отключён') }} />}
        <Row icon="send" tone="violet" title="Написать от бота" onClick={() => setSheet('msg')} />
        <Row icon="refresh" tone="green" title="Сбросить лимит чтения" sub={u.limits ? `час ${u.limits.hour ?? 0} · сутки ${u.limits.day ?? 0} · 30 дн. ${u.limits.month ?? 0}` : undefined}
          onClick={() => run(() => adminApi.resetLimit(u.id), 'Лимит сброшен')} />
        {u.banned
          ? <Row icon="unlock" tone="green" title="Разбанить" sub={u.ban_reason ? `Причина: ${u.ban_reason}` : `с ${fmtDate(u.banned_at)}`} onClick={() => run(() => adminApi.unban(u.id), 'Разбанен')} />
          : <Row icon="lock" danger title="Забанить" onClick={() => setSheet('ban')} />}
      </div>

      <SectionTitle>Сведения</SectionTitle>
      <div className="list-group">
        <Row title="Пришёл" right={<span className="text-[13px] text-gray">{fmtDate(u.joined_at)}</span>} />
        <Row title="Был активен" right={<span className="text-[13px] text-gray">{fmtDate(u.last_seen)}</span>} />
        <Row title="В избранном" right={<span className="text-[13px] text-gray">{u.favorites}</span>} />
        {u.xp && <Row title="Лучшая серия" right={<span className="text-[13px] text-gray">{u.xp.best} дн.</span>} />}
      </div>

      {u.payments.length > 0 && (<>
        <SectionTitle>Оплаты</SectionTitle>
        <div className="list-group">{u.payments.map((p, i) => (
          <Row key={i} title={`${p.amount} ${p.src === 'rub' ? '₽' : ''}`} sub={`${p.src} · ${p.days ? p.days + ' дн. · ' : ''}${fmtDate(p.at)}`}
            right={<Badge tone={p.status === 'paid' ? 'green' : 'gray'}>{p.status === 'paid' ? 'оплачено' : p.status}</Badge>} />
        ))}</div>
      </>)}
      {u.courses.length > 0 && (<>
        <SectionTitle>Купленные курсы</SectionTitle>
        <div className="list-group">{u.courses.map(c => <Row key={c.section_id} icon="book" title={c.title || `#${c.section_id}`} sub={fmtDate(c.at)} />)}</div>
      </>)}
      <SectionTitle>Последние действия</SectionTitle>
      {u.logs.length ? <div className="list-group">{u.logs.map((l, i) => (
        <div key={i} className="px-4 py-2.5"><div className="flex justify-between gap-2"><b className="text-[13px] font-medium">{l.action}</b><span className="text-[11.5px] text-gray2 shrink-0">{fmtDate(l.at)}</span></div>
          {l.detail && <p className="text-[12px] text-gray truncate">{l.detail}</p>}</div>
      ))}</div> : <p className="text-[13px] text-gray2 px-1">Нет записей</p>}

      <Sheet open={sheet === 'premium'} onClose={() => setSheet(null)} title="Выдать Premium">
        <div className="flex gap-2 mb-3">{['7', '30', '90', '365'].map(d => <button key={d} className={`chip flex-1 justify-center ${days === d ? 'on' : ''}`} onClick={() => setDays(d)}>{d} дн.</button>)}</div>
        <Field label="Дней" type="number" value={days} onChange={setDays} />
        <div className="list-group mb-4"><Toggle label="Уведомить пользователя" value={notify} onChange={setNotify} /></div>
        <button className="btn-gold gold-metal w-full h-12 rounded-[14px] font-semibold text-[#2A1C00]" onClick={() => run(() => adminApi.premium(u.id, Number(days), notify), 'Premium выдан')}>Выдать на {days} дн.</button>
      </Sheet>
      <Sheet open={sheet === 'ban'} onClose={() => setSheet(null)} title="Забанить">
        <Field label="Причина (видна только вам)" value={reason} onChange={setReason} />
        <button className="w-full h-12 rounded-[14px] font-semibold text-white" style={{ background: '#E5484D' }} onClick={() => run(() => adminApi.ban(u.id, reason), 'Пользователь забанен')}>Забанить</button>
      </Sheet>
      <Sheet open={sheet === 'msg'} onClose={() => setSheet(null)} title="Сообщение от бота">
        <Field label="Текст (поддерживается HTML: <b>, <i>, <a>)" multiline rows={5} value={text} onChange={setText} />
        <button className="btn-primary w-full" disabled={!text.trim()} onClick={() => run(() => adminApi.message(u.id, text), 'Отправлено').then(() => setText(''))}>Отправить</button>
      </Sheet>
      {node}
    </div>
  )
}

/* ───────────── Заявки ───────────── */

export function SubmissionsScreen() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [list, setList] = useState<ASubmission[] | null>(null)
  const [sections, setSections] = useState<ASection[]>([])
  const [cur, setCur] = useState<{ s: ASubmission; mode: 'approve' | 'reject' } | null>(null)
  const [sec, setSec] = useState<number>(0)
  const [prem, setPrem] = useState(false)
  const [reason, setReason] = useState('')
  const load = useCallback(() => { setList(null); adminApi.submissions(status).then(r => setList(r.submissions)).catch(e => toast(errMsg(e), true)) }, [status])
  useEffect(() => { load() }, [load])
  useEffect(() => { adminApi.tree().then(t => setSections(t.sections)).catch(() => {}) }, [])

  const open = (s: ASubmission, mode: 'approve' | 'reject') => { setCur({ s, mode }); setSec(s.section_id || 0); setPrem(false); setReason('') }
  const act = async () => {
    if (!cur) return
    try {
      if (cur.mode === 'approve') { if (!sec) { toast('Выберите раздел', true); return } await adminApi.approve(cur.s.id, sec, prem); toast('Одобрено, автору +2 дня Premium') }
      else { await adminApi.reject(cur.s.id, reason); toast('Отклонено') }
      setCur(null); load()
    } catch (e) { toast(errMsg(e), true) }
  }

  return (
    <div className="px-4 pt-3 pb-navsafe">
      <Segmented value={status} onChange={setStatus} items={[['pending', 'Ожидают'], ['approved', 'Одобрены'], ['rejected', 'Отклонены']]} />
      <div className="mt-3" />
      {!list ? <Loader /> : list.length ? list.map(s => (
        <div key={s.id} className="card p-4 mb-2">
          <div className="flex items-center gap-2 text-[12px] text-gray mb-1.5">
            <span>#{s.id}</span><span>·</span><span className="truncate">{s.username ? '@' + s.username : s.user_id}</span><span>·</span><span>{fmtDate(s.created_at)}</span>
          </div>
          <b className="text-[15px] font-semibold block">{s.title}</b>
          {s.content && <p className="text-[13px] text-gray mt-1 line-clamp-4 whitespace-pre-line">{s.content}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {s.files > 0 && <Badge tone="gray">Файлов: {s.files}</Badge>}
            {s.section_title && <Badge tone="violet">{s.section_title}</Badge>}
            {s.reject_reason && <Badge tone="red">{s.reject_reason}</Badge>}
          </div>
          {status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1 h-10" onClick={() => open(s, 'approve')}>Одобрить</button>
              <button className="btn-secondary flex-1 h-10" onClick={() => open(s, 'reject')}>Отклонить</button>
            </div>
          )}
        </div>
      )) : <Empty icon="checkCircle" text={status === 'pending' ? 'Новых заявок нет' : 'Пусто'} />}

      <Sheet open={!!cur} onClose={() => setCur(null)} title={cur?.mode === 'approve' ? 'Одобрить заявку' : 'Отклонить заявку'}>
        {cur?.mode === 'approve' ? (
          <>
            <label className="block mb-3">
              <span className="block text-[12.5px] text-gray mb-1.5 px-1">Куда добавить</span>
              <select className="w-full bg-s2 border border-white/[.08] rounded-[14px] px-3 py-3 text-[15px] outline-none" value={sec} onChange={e => setSec(Number(e.target.value))}>
                <option value={0}>— выберите раздел —</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.title}</option>)}
              </select>
            </label>
            <div className="list-group mb-4"><Toggle label="Premium-материал" tone="gold" value={prem} onChange={setPrem} /></div>
            <p className="text-[12.5px] text-gray mb-3">Автор получит уведомление и +2 дня Premium.</p>
          </>
        ) : <Field label="Причина (уйдёт автору, можно пусто)" multiline rows={3} value={reason} onChange={setReason} />}
        <button className="btn-primary w-full" onClick={act}>{cur?.mode === 'approve' ? 'Одобрить и опубликовать' : 'Отклонить'}</button>
      </Sheet>
    </div>
  )
}

/* ───────────── Комментарии ───────────── */

export function CommentsScreen({ nav }: { nav: Nav }) {
  const [filter, setFilter] = useState<'recent' | 'reported' | 'hidden'>('reported')
  const [list, setList] = useState<AComment[] | null>(null)
  const { ask, node } = useConfirm()
  const load = useCallback(() => { setList(null); adminApi.comments(filter).then(r => setList(r.comments)).catch(e => toast(errMsg(e), true)) }, [filter])
  useEffect(() => { load() }, [load])
  const act = async (c: AComment, a: 'hide' | 'show' | 'delete') => {
    if (a === 'delete' && !await ask('Удалить комментарий и ответы на него?')) return
    try { await adminApi.comment(c.id, a); toast(a === 'hide' ? 'Скрыт' : a === 'show' ? 'Восстановлен' : 'Удалён'); load() } catch (e) { toast(errMsg(e), true) }
  }
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <Segmented value={filter} onChange={setFilter} items={[['reported', 'Жалобы'], ['recent', 'Все'], ['hidden', 'Скрытые']]} />
      <div className="mt-3" />
      {!list ? <Loader /> : list.length ? list.map(c => (
        <div key={c.id} className="card p-4 mb-2">
          <div className="flex items-center gap-2 text-[12px] text-gray mb-1">
            <b className="text-fg font-medium">{c.author}</b><span>·</span><span>{fmtDate(c.created_at)}</span>
            {c.reports > 0 && <Badge tone="red">жалоб: {c.reports}</Badge>}{c.hidden && <Badge tone="gray">скрыт</Badge>}
          </div>
          <p className="text-[14px] whitespace-pre-line">{c.text}</p>
          <button className="text-[12px] text-violet mt-1.5 truncate max-w-full" onClick={() => nav.push({ k: 'material', id: c.material_id })}>{c.material_title || `материал #${c.material_id}`} ›</button>
          <div className="flex gap-2 mt-3">
            {c.hidden || c.reports ? <button className="btn-secondary flex-1 h-9 text-[13px]" onClick={() => act(c, 'show')}>Оставить</button> : null}
            {!c.hidden && <button className="btn-secondary flex-1 h-9 text-[13px]" onClick={() => act(c, 'hide')}>Скрыть</button>}
            <button className="btn-secondary h-9 px-4 text-[#FF8080]" onClick={() => act(c, 'delete')}><Icon name="trash" size={15} /></button>
          </div>
        </div>
      )) : <Empty icon="chat" text={filter === 'reported' ? 'Жалоб нет' : 'Пусто'} />}
      {node}
    </div>
  )
}
