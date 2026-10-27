import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import { API_BASE } from '../../api/client'
import { adminApi } from '../../api/admin'
import type { ABanner, APinned, ABroadcast, APayment, ALog, ALimits, ALimitUser, AWeek } from '../../api/admin'
import type { Nav } from './AdminPage'
import { uploadFile } from '../../api/upload'
import { Badge, Empty, Field, IconBtn, Loader, Row, SectionTitle, Segmented, Sheet, ago, errMsg, fmtDate, num, toast, useConfirm } from './ui'

/* ───────────── Баннеры на главной ───────────── */

export function BannersScreen() {
  const [list, setList] = useState<ABanner[] | null>(null)
  const [edit, setEdit] = useState<{ i: number; b: ABanner } | null>(null)
  const [upl, setUpl] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { ask, node } = useConfirm()
  useEffect(() => { adminApi.banners().then(r => setList(r.banners)).catch(e => toast(errMsg(e), true)) }, [])

  const persist = async (next: ABanner[]) => {
    try { const r = await adminApi.saveBanners(next); setList(r.banners); toast('Баннеры сохранены') } catch (e) { toast(errMsg(e), true) }
  }
  const saveOne = async () => {
    if (!edit || !list) return
    const next = [...list]
    if (edit.i < 0) next.push(edit.b); else next[edit.i] = edit.b
    await persist(next); setEdit(null)
  }
  const upload = async (f: File) => {
    if (!edit) return
    setUpl(0)
    try { const r = await uploadFile(f, setUpl); setEdit({ ...edit, b: { ...edit.b, file_id: r.file_id } }) } catch (e) { toast(errMsg(e), true) } finally { setUpl(null) }
  }
  const move = (i: number, d: -1 | 1) => { if (!list) return; const n = [...list]; [n[i], n[i + d]] = [n[i + d], n[i]]; persist(n) }

  if (!list) return <Loader />
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <p className="text-[13px] text-gray px-1 mb-3">Карточки-баннеры на главном экране мини-приложения. Показываются по порядку.</p>
      {list.length ? (
        <div className="list-group">{list.map((b, i) => (
          <div key={i} className="flex items-center pr-3">
            <button className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left" onClick={() => setEdit({ i, b: { ...b } })}>
              {b.file_id ? <img src={`${API_BASE}/api/banner/image?index=${i}`} className="w-12 h-12 rounded-[10px] object-cover bg-s2" alt="" />
                : <span className="w-12 h-12 rounded-[10px] bg-s2 grid place-items-center text-[20px]">{b.emoji || '📣'}</span>}
              <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-medium truncate">{b.title || 'Без заголовка'}</span>
                <span className="block text-[12px] text-gray truncate">{b.text || b.link || '—'}</span>
              </span>
            </button>
            <div className="flex gap-1">
              <IconBtn name="arrowU" label="Выше" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconBtn name="arrowD" label="Ниже" disabled={i === list.length - 1} onClick={() => move(i, 1)} />
              <IconBtn name="trash" label="Удалить" onClick={async () => { if (await ask('Удалить баннер?')) persist(list.filter((_, j) => j !== i)) }} />
            </div>
          </div>
        ))}</div>
      ) : <Empty icon="image" text="Баннеров нет" />}
      <button className="btn-primary w-full mt-3" onClick={() => setEdit({ i: -1, b: { emoji: '', title: '', text: '', link: '', file_id: '' } })}><Icon name="plus" size={17} />Добавить баннер</button>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && edit.i >= 0 ? 'Баннер' : 'Новый баннер'}>
        {edit && (<>
          <div className="flex gap-2">
            <div className="w-[76px]"><Field label="Значок" value={edit.b.emoji} onChange={v => setEdit({ ...edit, b: { ...edit.b, emoji: v } })} /></div>
            <div className="flex-1"><Field label="Заголовок" value={edit.b.title} onChange={v => setEdit({ ...edit, b: { ...edit.b, title: v } })} /></div>
          </div>
          <Field label="Подпись" multiline rows={2} value={edit.b.text} onChange={v => setEdit({ ...edit, b: { ...edit.b, text: v } })} />
          <Field label="Ссылка (https://…)" value={edit.b.link} onChange={v => setEdit({ ...edit, b: { ...edit.b, link: v } })} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
          <div className="flex gap-2 mb-4">
            <button className="btn-secondary flex-1 h-10 text-[13.5px]" onClick={() => fileRef.current?.click()}>
              <Icon name="image" size={16} />{upl !== null ? `Загрузка ${upl}%` : edit.b.file_id ? 'Заменить картинку' : 'Добавить картинку'}
            </button>
            {edit.b.file_id && <button className="btn-secondary h-10 px-4" onClick={() => setEdit({ ...edit, b: { ...edit.b, file_id: '' } })}>Убрать</button>}
          </div>
          <button className="btn-primary w-full" onClick={saveOne}>Сохранить</button>
        </>)}
      </Sheet>
      {node}
    </div>
  )
}

/* ───────────── Закреплённое сообщение бота ───────────── */

export function PinnedScreen() {
  const [p, setP] = useState<APinned | null>(null)
  const [upl, setUpl] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { adminApi.pinned().then(setP).catch(e => toast(errMsg(e), true)) }, [])
  if (!p) return <Loader />
  const save = async (x: APinned) => { try { await adminApi.savePinned(x); setP(x); toast(x.content ? 'Закреп обновлён' : 'Закреп отключён') } catch (e) { toast(errMsg(e), true) } }
  const upload = async (f: File) => {
    setUpl(0)
    try { const r = await uploadFile(f, setUpl); if (r.kind !== 'photo') { toast('Нужна картинка до 9 МБ', true); return } setP({ ...p, type: 'photo', content: r.file_id }) }
    catch (e) { toast(errMsg(e), true) } finally { setUpl(null) }
  }
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <p className="text-[13px] text-gray px-1 mb-3">Сообщение, которое бот закрепляет у пользователя в чате при /start.</p>
      <Segmented value={p.type} onChange={t => setP({ ...p, type: t, content: t === p.type ? p.content : '' })}
        items={[['text', 'Текст'], ['photo', 'Фото'], ['animation', 'GIF'], ['sticker', 'Стикер']]} />
      <div className="mt-3" />
      {p.type === 'text' ? (
        <Field label="Текст (HTML)" multiline rows={6} value={p.content} onChange={v => setP({ ...p, content: v })} />
      ) : p.type === 'photo' ? (<>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        <button className="btn-secondary w-full mb-3" onClick={() => fileRef.current?.click()}><Icon name="image" size={16} />{upl !== null ? `Загрузка ${upl}%` : p.content ? 'Фото выбрано · заменить' : 'Выбрать фото'}</button>
        <Field label="Подпись" multiline rows={3} value={p.caption} onChange={v => setP({ ...p, caption: v })} />
      </>) : (<>
        <Field label="file_id" value={p.content} onChange={v => setP({ ...p, content: v })} />
        <p className="text-[12px] text-gray2 px-1 mb-3">GIF и стикер удобнее задать через бота: /admin → Закреп. Здесь можно вставить file_id.</p>
        {p.type === 'animation' && <Field label="Подпись" multiline rows={2} value={p.caption} onChange={v => setP({ ...p, caption: v })} />}
      </>)}
      <button className="btn-primary w-full" onClick={() => save(p)}>Сохранить</button>
      <button className="btn-secondary w-full mt-2" onClick={() => save({ type: 'text', content: '', caption: '' })}>Отключить закреп</button>
    </div>
  )
}

/* ───────────── Рассылка ───────────── */

export function BroadcastScreen() {
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'all' | 'premium' | 'free'>('all')
  const [photo, setPhoto] = useState('')
  const [st, setSt] = useState<ABroadcast | null>(null)
  const [upl, setUpl] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { ask, node } = useConfirm()
  const poll = useCallback(() => adminApi.broadcastStatus().then(setSt).catch(() => {}), [])
  useEffect(() => { poll(); const id = setInterval(poll, 3000); return () => clearInterval(id) }, [poll])

  const send = async (test: boolean) => {
    if (!text.trim()) return
    if (!test && !await ask(`Отправить рассылку ${target === 'all' ? 'всем пользователям' : target === 'premium' ? 'всем с Premium' : 'всем без Premium'}? Отменить её будет нельзя.`, 'Отправить')) return
    try { await adminApi.broadcast(text, target, test, photo || undefined); toast(test ? 'Тест отправлен вам в бота' : 'Рассылка запущена'); poll() } catch (e) { toast(errMsg(e), true) }
  }
  const upload = async (f: File) => {
    setUpl(0)
    try { const r = await uploadFile(f, setUpl); if (r.kind !== 'photo') { toast('Нужна картинка до 9 МБ', true); return } setPhoto(r.file_id) } catch (e) { toast(errMsg(e), true) } finally { setUpl(null) }
  }
  const pct = st && st.total ? Math.round((st.sent + st.failed) / st.total * 100) : 0

  return (
    <div className="px-4 pt-3 pb-navsafe">
      {st && (st.running || st.finished) && (
        <div className="card p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <b className="text-[14px]">{st.running ? 'Рассылка идёт…' : 'Последняя рассылка'}</b>
            <span className="text-[12px] text-gray">{fmtDate(st.finished || st.started)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2"><div className="h-full bg-green transition-all" style={{ width: `${st.running ? pct : 100}%` }} /></div>
          <span className="text-[12.5px] text-gray">Доставлено {num(st.sent)} · ошибок {num(st.failed)} · всего {num(st.total)}</span>
        </div>
      )}
      <Segmented value={target} onChange={setTarget} items={[['all', 'Всем'], ['premium', 'Premium'], ['free', 'Без Premium']]} />
      <div className="mt-3" />
      <Field label="Текст (HTML: <b>, <i>, <a href>)" multiline rows={8} value={text} onChange={setText} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <div className="flex gap-2 mb-4">
        <button className="btn-secondary flex-1 h-10 text-[13.5px]" onClick={() => fileRef.current?.click()}><Icon name="image" size={16} />{upl !== null ? `Загрузка ${upl}%` : photo ? 'Картинка добавлена' : 'Добавить картинку'}</button>
        {photo && <button className="btn-secondary h-10 px-4" onClick={() => setPhoto('')}>Убрать</button>}
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" disabled={!text.trim()} onClick={() => send(true)}>Тест себе</button>
        <button className="btn-primary flex-1" disabled={!text.trim() || !!st?.running} onClick={() => send(false)}><Icon name="send" size={16} />Отправить</button>
      </div>
      {node}
    </div>
  )
}

/* ───────────── Оплаты ───────────── */

export function PaymentsScreen() {
  const [d, setD] = useState<{ payments: APayment[]; total_rub: number; total_other: number; count_other: number } | null>(null)
  const [st, setSt] = useState<'all' | 'paid' | 'pending' | 'failed'>('all')
  useEffect(() => { adminApi.payments().then(setD).catch(e => toast(errMsg(e), true)) }, [])
  if (!d) return <Loader />
  const list = d.payments.filter(p => st === 'all' || (st === 'failed' ? !['paid', 'pending'].includes(p.status) : p.status === st))
  const cnt = (f: typeof st) => d.payments.filter(p => f === 'all' || (f === 'failed' ? !['paid', 'pending'].includes(p.status) : p.status === f)).length
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-4"><span className="text-[12px] text-gray">Рубли, всего</span><b className="font-display font-semibold text-[20px] block mt-1">{num(d.total_rub)} ₽</b></div>
        <div className="card p-4"><span className="text-[12px] text-gray">Stars / крипта</span><b className="font-display font-semibold text-[20px] block mt-1">{num(d.count_other)}</b><span className="text-[11.5px] text-gray2">оплат</span></div>
      </div>
      <div className="mt-4"><Segmented value={st} onChange={setSt} items={[['all', 'Все', cnt('all')], ['paid', 'Оплачено', cnt('paid')], ['pending', 'Ожидают', cnt('pending')], ['failed', 'Не прошли', cnt('failed')]]} /></div>
      <SectionTitle>{st === 'paid' ? `Оплачено на ${num(list.filter(p => p.src === 'rub').reduce((a, p) => a + p.amount, 0))} ₽` : 'Последние платежи'}</SectionTitle>
      {list.length ? <div className="list-group">{list.map((p, i) => (
        <Row key={i} title={<>{p.amount}{p.src === 'rub' ? ' ₽' : ''} <span className="text-gray font-normal">· {p.username ? '@' + p.username : p.user_id}</span></>}
          sub={`${p.src === 'rub' ? 'Карта/СБП' : 'Stars/крипта'} · ${p.kind === 'course' ? 'курс' : (p.days ? p.days + ' дн.' : p.kind)} · ${fmtDate(p.at)}`}
          right={<Badge tone={p.status === 'paid' ? 'green' : p.status === 'pending' ? 'gold' : 'gray'}>{p.status === 'paid' ? 'оплачено' : p.status === 'pending' ? 'ожидает' : p.status === 'failed' ? 'не прошла' : p.status === 'canceled' || p.status === 'cancelled' ? 'отменена' : p.status}</Badge>} />
      ))}</div> : <Empty icon="card" text="Платежей нет" />}
    </div>
  )
}

/* ───────────── Журнал ───────────── */

export function LogsScreen() {
  const [mode, setMode] = useState<'admin' | 'all' | 'pay'>('admin')
  const [user, setUser] = useState('')
  const [logs, setLogs] = useState<ALog[] | null>(null)
  useEffect(() => {
    setLogs(null)
    const o = mode === 'admin' ? { admin: '1' } : mode === 'pay' ? { action: 'premium' } : {}
    const id = setTimeout(() => adminApi.logs({ ...o, user: user || undefined }).then(r => setLogs(r.logs)).catch(e => toast(errMsg(e), true)), user ? 300 : 0)
    return () => clearTimeout(id)
  }, [mode, user])
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <Segmented value={mode} onChange={setMode} items={[['admin', 'Действия админов'], ['all', 'Все события'], ['pay', 'Premium']]} />
      <div className="mt-3" />
      <Field placeholder="Фильтр по ID пользователя" value={user} onChange={v => setUser(v.replace(/\D/g, ''))} />
      {!logs ? <Loader /> : logs.length ? <div className="list-group">{logs.map(l => (
        <div key={l.id} className="px-4 py-2.5">
          <div className="flex justify-between gap-2"><b className="text-[13px] font-medium">{l.action}</b><span className="text-[11.5px] text-gray2 shrink-0">{fmtDate(l.at)}</span></div>
          <p className="text-[12px] text-gray break-words">{l.user_id} {l.detail && '· ' + l.detail}</p>
        </div>
      ))}</div> : <Empty icon="history" text="Записей нет" />}
    </div>
  )
}

/* ───────────── Лимиты чтения ───────────── */

function Meter({ label, v, max }: { label: string; v: number; max: number }) {
  const p = Math.min(1, v / max)
  const c = p >= 1 ? '#FF6B6B' : p >= .75 ? '#F5C25A' : '#17E584'
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[11px] mb-1"><span className="text-gray">{label}</span><span className="tabular-nums" style={{ color: p >= .75 ? c : '#CFDAD4' }}>{v}/{max}</span></div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: c }} /></div>
    </div>
  )
}

export function LimitsScreen({ nav }: { nav: Nav }) {
  const [filter, setFilter] = useState<'active' | 'paused' | 'banned' | 'all'>('active')
  const [d, setD] = useState<ALimits | null>(null)
  const [q, setQ] = useState('')
  const [cur, setCur] = useState<ALimitUser | null>(null)
  const load = useCallback(() => { adminApi.limits(filter).then(setD).catch(e => toast(errMsg(e), true)) }, [filter])
  useEffect(() => { setD(null); load() }, [load])
  const reset = async (u: ALimitUser, scope: 'hour' | 'day' | 'all') => {
    try { await adminApi.limitReset(u.id, scope); toast(scope === 'all' ? 'Полный сброс, бан снят' : scope === 'day' ? 'Суточный счётчик обнулён' : 'Часовой счётчик обнулён'); setCur(null); load() }
    catch (e) { toast(errMsg(e), true) }
  }
  const L = d?.limits
  const list = (d?.users || []).filter(u => !q || String(u.id).includes(q) || u.username.toLowerCase().includes(q.toLowerCase().replace('@', '')) || u.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="card p-4 mb-3">
        <p className="text-[13px] text-gray leading-relaxed">Считаются <b className="text-fg font-medium">разные</b> материалы. Час и сутки — мягкая пауза, снимается сама. 30 дней — автобан.</p>
        {L && <div className="flex gap-2 mt-3">
          {[['Час', L.hour], ['Сутки', L.day], ['30 дней', L.month]].map(([l, v]) => (
            <div key={l as string} className="flex-1 rounded-[12px] bg-white/[.04] px-3 py-2"><b className="font-display font-semibold text-[16px]">{v}</b><span className="block text-[11px] text-gray">{l}</span></div>
          ))}
        </div>}
      </div>
      <Segmented value={filter} onChange={setFilter} items={[['active', 'Под нагрузкой'], ['paused', 'На паузе', d?.counts.paused], ['banned', 'Автобан', d?.counts.banned], ['all', 'Все за 30 дн.']]} />
      <div className="mt-3" />
      <Field placeholder="Найти по ID или @username" value={q} onChange={setQ} />
      {!d || !L ? <Loader /> : list.length ? list.map(u => (
        <button key={u.id} onClick={() => setCur(u)} className="card w-full text-left p-4 mb-2 active:scale-[.99] transition-transform">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex-1 min-w-0">
              <b className="block text-[14.5px] font-semibold truncate">{u.name || u.username || u.id}</b>
              <span className="block text-[12px] text-gray truncate">{u.username ? '@' + u.username + ' · ' : ''}{u.id} · {ago(u.last)}</span>
            </span>
            {u.autoban ? <Badge tone="red">Автобан</Badge> : u.paused ? <Badge tone="gold">Пауза: {u.paused === 'day' ? 'сутки' : 'час'}</Badge> : null}
          </div>
          <div className="flex gap-3">
            <Meter label="Час" v={u.hour} max={L.hour} /><Meter label="Сутки" v={u.day} max={L.day} /><Meter label="30 дней" v={u.month} max={L.month} />
          </div>
          {(u.unlock_at || u.blocked_24h > 0) && <p className="text-[12px] text-gray mt-2.5">
            {u.unlock_at ? `Пауза снимется сама: ${fmtDate(u.unlock_at)}` : ''}{u.unlock_at && u.blocked_24h ? ' · ' : ''}{u.blocked_24h ? `не открылось за сутки: ${u.blocked_24h}` : ''}
          </p>}
        </button>
      )) : <Empty icon="checkCircle" text={filter === 'paused' ? 'Сейчас никто не на паузе' : filter === 'banned' ? 'Автобанов нет' : 'Никто не приближается к лимитам'} />}

      <Sheet open={!!cur} onClose={() => setCur(null)} title={cur ? (cur.name || cur.username || String(cur.id)) : ''}>
        {cur && L && (<>
          <div className="flex gap-3 mb-4"><Meter label="Час" v={cur.hour} max={L.hour} /><Meter label="Сутки" v={cur.day} max={L.day} /><Meter label="30 дней" v={cur.month} max={L.month} /></div>
          {cur.autoban && <p className="text-[13px] text-[#FF8A8A] mb-3">Забанен автоматически: {cur.ban_reason}</p>}
          <div className="list-group mb-3">
            <Row icon="clock" tone="green" title="Сбросить час" sub="снимает паузу «час»" onClick={() => reset(cur, 'hour')} />
            <Row icon="refresh" tone="gold" title="Сбросить сутки" sub="снимает паузу «сутки», месячный счётчик остаётся" onClick={() => reset(cur, 'day')} />
            <Row icon="unlock" tone="violet" title="Полный сброс" sub={cur.autoban ? 'обнулить всё и снять автобан' : 'обнулить все счётчики'} onClick={() => reset(cur, 'all')} />
          </div>
          <button className="btn-secondary w-full" onClick={() => { setCur(null); nav.push({ k: 'user', id: cur.id }) }}>Открыть карточку пользователя</button>
        </>)}
      </Sheet>
    </div>
  )
}

/* ───────────── Итоги недели ───────────── */

export function WeekScreen({ nav }: { nav: Nav }) {
  const [d, setD] = useState<AWeek | null>(null)
  const { ask, node } = useConfirm()
  const load = useCallback(() => { adminApi.week().then(setD).catch(e => toast(errMsg(e), true)) }, [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loader />
  const fmtW = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Europe/Moscow' })
  let place = 0
  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <b className="text-[14.5px]">Неделя с {fmtW(d.week_start)}</b>
          <span className="text-[12px] text-gray">итоги {fmtW(d.week_end)} в 00:05</span>
        </div>
        <p className="text-[12.5px] text-gray mt-1.5">
          {d.rules_active ? 'Призы 3 / 2 / 1 дня Premium выдаются автоматически трём первым честным участникам. Вам придёт отчёт в бот.'
            : `Призы начнутся с недели от ${fmtW(d.rules_from)}. Сейчас — предпросмотр, кто был бы в тройке.`}
        </p>
      </div>
      <SectionTitle>Текущий рейтинг</SectionTitle>
      {d.rows.length ? <div className="list-group">{d.rows.map((r, i) => {
        const ok = r.issues.length === 0
        const prize = ok && place < 3 ? [3, 2, 1][place++] : 0
        return (
          <button key={r.id} onClick={() => nav.push({ k: 'user', id: r.id })} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/[.04]">
            <span className="w-6 text-[13px] font-bold tabular-nums text-center" style={{ color: i < 3 ? '#F5C25A' : '#6E8478' }}>{i + 1}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium truncate">{r.name}{r.username ? <span className="text-gray font-normal"> · @{r.username}</span> : null}</span>
              <span className={`block text-[11.5px] truncate ${ok ? 'text-green' : 'text-[#FF8A8A]'}`}>{ok ? (prize ? `получит +${prize} дн.` : 'честный участник') : r.issues.join(' · ')}</span>
            </span>
            <span className="text-[13px] tabular-nums text-gray">{num(r.xp)} XP</span>
          </button>
        )
      })}</div> : <Empty icon="trophy" text="На этой неделе пока никого" />}

      <SectionTitle>Выданные призы</SectionTitle>
      {d.history.length ? <div className="list-group">{d.history.map(h => (
        <Row key={h.id} title={`${h.place} место · ${h.name}`} sub={`неделя ${fmtW(h.week_start)} · ${num(h.xp)} XP · +${h.days} дн.`}
          right={h.status === 'paid'
            ? <button className="h-8 px-3 rounded-full bg-white/[.06] text-[12.5px] text-[#FF8A8A]" onClick={async () => {
                if (await ask(`Отменить приз «${h.name}» (+${h.days} дн.)? Эти дни будут списаны с его Premium.`, 'Отменить приз')) {
                  try { await adminApi.revokePrize(h.id); toast('Приз отменён'); load() } catch (e) { toast(errMsg(e), true) }
                }
              }}>Отменить</button>
            : <Badge tone="gray">отменён</Badge>} />
      ))}</div> : <p className="text-[13px] text-gray2 px-1">Пока не выдавались</p>}
      {node}
    </div>
  )
}
