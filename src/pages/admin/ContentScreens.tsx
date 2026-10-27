import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import MediaTypeIcon from '../../components/MediaTypeIcon'
import { adminApi } from '../../api/admin'
import type { ASection, AMaterial, AMaterialRow, AQuestion, AQuestions } from '../../api/admin'
import { uploadFile } from '../../api/upload'
import { Badge, Empty, Field, IconBtn, Loader, Row, SectionTitle, Sheet, Toggle, errMsg, toast, useConfirm, fmtDate } from './ui'
import type { Nav } from './AdminPage'

const TYPE_LABEL: Record<string, string> = { text: 'Текст', photo: 'Фото', video: 'Видео', document: 'Файл', doc: 'Урок', quiz: 'Тест', task: 'Задача' }

/* ───────────── Раздел: подразделы + материалы ───────────── */

export function SectionsScreen({ nav, parentId }: { nav: Nav; parentId: number | null }) {
  const [all, setAll] = useState<ASection[] | null>(null)
  const [mats, setMats] = useState<AMaterialRow[] | null>(null)
  const [edit, setEdit] = useState<Partial<ASection> | null>(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState<AMaterialRow[] | null>(null)
  const { ask, node } = useConfirm()

  const load = useCallback(async () => {
    try {
      const t = await adminApi.tree(); setAll(t.sections)
      if (parentId) setMats((await adminApi.materials(parentId)).materials)
    } catch (e) { toast(errMsg(e), true) }
  }, [parentId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!q.trim()) { setFound(null); return }
    const id = setTimeout(() => adminApi.searchMaterials(q).then(r => setFound(r.materials)).catch(() => {}), 300)
    return () => clearTimeout(id)
  }, [q])

  const me = all?.find(s => s.id === parentId)
  const kids = useMemo(() => (all || []).filter(s => (s.parent_id ?? null) === parentId).sort((a, b) => a.position - b.position || a.id - b.id), [all, parentId])

  const move = async (list: { id: number }[], i: number, d: -1 | 1, kind: 'sec' | 'mat') => {
    const j = i + d; if (j < 0 || j >= list.length) return
    const ids = list.map(x => x.id); [ids[i], ids[j]] = [ids[j], ids[i]]
    try {
      if (kind === 'sec') { await adminApi.reorderSections(ids) } else { await adminApi.reorderMaterials(ids) }
      load()
    } catch (e) { toast(errMsg(e), true) }
  }

  const saveSection = async () => {
    if (!edit) return
    try {
      if (edit.id) await adminApi.updateSection(edit.id, edit)
      else await adminApi.createSection({ ...edit, parent_id: parentId })
      toast(edit.id ? 'Раздел сохранён' : 'Раздел создан'); setEdit(null); load()
    } catch (e) { toast(errMsg(e), true) }
  }
  const removeSection = async (s: ASection) => {
    if (!await ask(`Удалить «${s.title}» вместе со всеми подразделами и материалами (${s.materials} шт. в нём)? Это необратимо.`)) return
    try { await adminApi.deleteSection(s.id); toast('Раздел удалён'); if (s.id === parentId) nav.back(); else load() } catch (e) { toast(errMsg(e), true) }
  }

  if (!all) return <Loader />
  return (
    <div className="px-4 pt-3 pb-navsafe">
      {parentId === null && (
        <label className="flex items-center gap-2.5 bg-s2 border border-white/[.08] rounded-[14px] px-3.5 h-11 mb-1">
          <Icon name="search" size={17} className="text-gray" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Найти материал по названию или ID" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-gray2" />
        </label>
      )}
      {found ? (
        <>
          <SectionTitle>Найдено: {found.length}</SectionTitle>
          {found.length ? <div className="list-group">{found.map(m => (
            <Row key={m.id} title={m.title} sub={`#${m.id} · ${m.section_title}`} onClick={() => nav.push({ k: 'material', id: m.id })}
              right={m.is_premium ? <Badge tone="gold">Premium</Badge> : undefined} />
          ))}</div> : <Empty icon="search" text="Ничего не найдено" />}
        </>
      ) : (
        <>
          {me && (() => {
            const path: ASection[] = []; let c = all.find(x => x.id === me.parent_id)
            for (let i = 0; c && i < 8; i++) { path.unshift(c); c = all.find(x => x.id === c!.parent_id) }
            return path.length ? (
              <div className="flex items-center gap-1 text-[12px] text-gray mb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                {path.map(x => <span key={x.id} className="flex items-center gap-1">{x.emoji} {x.title}<Icon name="chevR" size={12} className="text-gray2" /></span>)}
                <span className="text-fg">{me.title}</span>
              </div>) : null
          })()}
          {me && (
            <div className="card p-4 mb-1">
              <div className="flex items-start gap-3">
                <span className="text-[26px] leading-none">{me.emoji}</span>
                <div className="flex-1 min-w-0">
                  <b className="font-display font-semibold text-[17px] block">{me.title}</b>
                  {me.description && <p className="text-[13px] text-gray mt-1 line-clamp-3">{me.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {me.is_premium && <Badge tone="gold">Premium</Badge>}
                    {!me.is_active && <Badge tone="red">Скрыт</Badge>}
                    {me.price > 0 && <Badge tone="violet">{me.price} USDT</Badge>}
                    <Badge tone="gray">ID {me.id}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3.5">
                <button className="btn-secondary flex-1 h-10 text-[13.5px]" onClick={() => setEdit({ ...me })}><Icon name="edit" size={15} />Изменить</button>
                <button className="btn-secondary h-10 px-4 text-[#FF8080]" onClick={() => removeSection(me)}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          )}

          <SectionTitle right={<button className="text-green text-[13px] font-semibold flex items-center gap-1" onClick={() => setEdit({ title: '', emoji: '📁', description: '', is_premium: false, is_active: true, price: 0 })}><Icon name="plus" size={15} />Раздел</button>}>
            {parentId ? 'Подразделы' : 'Разделы'} · {kids.length}
          </SectionTitle>
          {kids.length ? (
            <div className="list-group">
              {kids.map((s, i) => (
                <div key={s.id} className="flex items-center pr-3">
                  <button className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left active:bg-white/[.04]" onClick={() => nav.push({ k: 'section', id: s.id, title: s.title })}>
                    <span className="w-9 h-9 rounded-[11px] bg-white/[.06] grid place-items-center text-[18px] shrink-0">{s.emoji || '📁'}</span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[14.5px] font-medium truncate ${s.is_active ? '' : 'opacity-50'}`}>{s.title}</span>
                      <span className="block text-[12px] text-gray truncate">{s.children ? `${s.children} подр. · ` : ''}{s.materials} мат.{s.is_premium ? ' · Premium' : ''}{!s.is_active ? ' · скрыт' : ''}</span>
                    </span>
                  </button>
                  <div className="flex gap-1">
                    <IconBtn name="arrowU" label="Выше" disabled={i === 0} onClick={() => move(kids, i, -1, 'sec')} />
                    <IconBtn name="arrowD" label="Ниже" disabled={i === kids.length - 1} onClick={() => move(kids, i, 1, 'sec')} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[13px] text-gray2 px-1">Подразделов нет</p>}

          {parentId !== null && (
            <>
              <SectionTitle right={<button className="text-green text-[13px] font-semibold flex items-center gap-1" onClick={() => nav.push({ k: 'upload', sectionId: parentId })}><Icon name="plus" size={15} />Материал</button>}>
                Материалы · {mats?.length ?? '…'}
              </SectionTitle>
              {!mats ? <Loader /> : mats.length ? (
                <div className="list-group">
                  {mats.map((m, i) => (
                    <div key={m.id} className="flex items-center pr-3">
                      <button className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left active:bg-white/[.04]" onClick={() => nav.push({ k: 'material', id: m.id })}>
                        <span className="w-6 text-[12px] text-gray2 tabular-nums text-right shrink-0">{i + 1}</span>
                        <MediaTypeIcon type={m.media_type} size={32} radius={9} iconSize={16} tone="green" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-medium truncate">{m.title}</span>
                          <span className="block text-[11.5px] text-gray truncate">{TYPE_LABEL[m.media_type] || m.media_type}{m.files ? ` · ${m.files} влож.` : ''}{m.is_premium ? ' · Premium' : ''}</span>
                        </span>
                      </button>
                      <div className="flex gap-1">
                        <IconBtn name="arrowU" label="Выше" disabled={i === 0} onClick={() => move(mats, i, -1, 'mat')} />
                        <IconBtn name="arrowD" label="Ниже" disabled={i === mats.length - 1} onClick={() => move(mats, i, 1, 'mat')} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty icon="doc" text="В разделе пока нет материалов" />}
            </>
          )}
        </>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Редактировать раздел' : 'Новый раздел'}>
        {edit && (
          <>
            <div className="flex gap-2">
              <div className="w-[76px]"><Field label="Значок" value={edit.emoji || ''} onChange={v => setEdit({ ...edit, emoji: v })} /></div>
              <div className="flex-1"><Field label="Название" value={edit.title || ''} onChange={v => setEdit({ ...edit, title: v })} /></div>
            </div>
            <Field label="Описание" multiline rows={3} value={edit.description || ''} onChange={v => setEdit({ ...edit, description: v })} />
            <Field label="Цена курса, USDT (0 — не продаётся отдельно)" type="number" value={String(edit.price ?? 0)} onChange={v => setEdit({ ...edit, price: Number(v) || 0 })} />
            {edit.id && (
              <label className="block mb-3">
                <span className="block text-[12.5px] text-gray mb-1.5 px-1">Где находится</span>
                <select className="w-full bg-s2 border border-white/[.08] rounded-[14px] px-3 py-3 text-[15px] outline-none"
                  value={edit.parent_id ?? ''} onChange={e => setEdit({ ...edit, parent_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— Верхний уровень —</option>
                  {all.filter(s => s.id !== edit.id).map(s => <option key={s.id} value={s.id}>{s.emoji} {s.title}</option>)}
                </select>
              </label>
            )}
            <div className="list-group mb-4">
              <Toggle label="Premium" sub="Доступ только с подпиской" tone="gold" value={!!edit.is_premium} onChange={v => setEdit({ ...edit, is_premium: v })} />
              <Toggle label="Показывать" sub="Скрытый раздел не виден пользователям" value={edit.is_active !== false} onChange={v => setEdit({ ...edit, is_active: v })} />
            </div>
            <button className="btn-primary w-full" onClick={saveSection}>{edit.id ? 'Сохранить' : 'Создать'}</button>
          </>
        )}
      </Sheet>
      {node}
    </div>
  )
}

/* ───────────── Редактор материала ───────────── */

export function MaterialScreen({ nav, id }: { nav: Nav; id: number }) {
  const [m, setM] = useState<AMaterial | null>(null)
  const [dirty, setDirty] = useState(false)
  const [sections, setSections] = useState<ASection[]>([])
  const [busy, setBusy] = useState(false)
  const [upl, setUpl] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { ask, node } = useConfirm()

  const load = useCallback(() => adminApi.material(id).then(x => { setM(x); setDirty(false) }).catch(e => toast(errMsg(e), true)), [id])
  useEffect(() => { load(); adminApi.tree().then(t => setSections(t.sections)).catch(() => {}) }, [load])

  if (!m) return <Loader />
  const set = (p: Partial<AMaterial>) => { setM({ ...m, ...p }); setDirty(true) }

  const save = async () => {
    setBusy(true)
    try { await adminApi.updateMaterial(m.id, { title: m.title, content: m.content, is_premium: m.is_premium, section_id: m.section_id, media_type: m.media_type }); toast('Сохранено'); setDirty(false) }
    catch (e) { toast(errMsg(e), true) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!await ask(`Удалить материал «${m.title}»? Комментарии и прогресс по нему потеряют привязку.`)) return
    try { await adminApi.deleteMaterial(m.id); toast('Материал удалён'); nav.back() } catch (e) { toast(errMsg(e), true) }
  }
  const addFile = async (f: File) => {
    setUpl(0)
    try {
      const r = await uploadFile(f, p => setUpl(p))
      await adminApi.addFile(m.id, { kind: r.kind, file_id: r.file_id, channel_message_id: r.channel_message_id, name: r.name })
      toast('Файл добавлен'); load()
    } catch (e) { toast(errMsg(e), true) } finally { setUpl(null) }
  }
  const addText = async () => {
    try { await adminApi.addFile(m.id, { kind: 'text', text: 'Новый текстовый блок' }); load() } catch (e) { toast(errMsg(e), true) }
  }
  const moveFile = async (fid: number, pos: number) => { try { await adminApi.updateFile(fid, { position: pos }); load() } catch (e) { toast(errMsg(e), true) } }
  const delFile = async (fid: number, name: string) => {
    if (!await ask(`Удалить вложение «${name}»?`)) return
    try { await adminApi.deleteFile(fid); load() } catch (e) { toast(errMsg(e), true) }
  }
  const editFileText = async (fid: number, patch: Record<string, string>) => {
    try { await adminApi.updateFile(fid, patch); toast('Вложение сохранено') } catch (e) { toast(errMsg(e), true) }
  }

  return (
    <div className="px-4 pt-3 pb-navsafe">
      <div className="flex items-center gap-2 mb-3 text-[12.5px] text-gray">
        <Badge tone="gray">ID {m.id}</Badge><span>создан {fmtDate(m.created_at)}</span>
      </div>
      <Field label="Название" value={m.title} onChange={v => set({ title: v })} />
      <Field label="Текст / описание (Markdown)" multiline rows={8} value={m.content} onChange={v => set({ content: v })} />
      <label className="block mb-3">
        <span className="block text-[12.5px] text-gray mb-1.5 px-1">Раздел</span>
        <select className="w-full bg-s2 border border-white/[.08] rounded-[14px] px-3 py-3 text-[15px] outline-none" value={m.section_id} onChange={e => set({ section_id: Number(e.target.value) })}>
          {sections.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.title} (#{s.id})</option>)}
        </select>
      </label>
      <label className="block mb-3">
        <span className="block text-[12.5px] text-gray mb-1.5 px-1">Тип</span>
        <select className="w-full bg-s2 border border-white/[.08] rounded-[14px] px-3 py-3 text-[15px] outline-none" value={m.media_type} onChange={e => set({ media_type: e.target.value })}>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <div className="list-group mb-4"><Toggle label="Premium" tone="gold" value={m.is_premium} onChange={v => set({ is_premium: v })} /></div>
      <div className={`flex gap-2 ${dirty ? 'sticky z-20 p-2 -mx-2 rounded-[20px] glass' : ''}`} style={dirty ? { bottom: 'calc(env(safe-area-inset-bottom,0px) + 92px)' } : undefined}>
        <button className="btn-primary flex-1" disabled={!dirty || busy} onClick={save}>{busy ? 'Сохраняю…' : dirty ? 'Сохранить' : 'Сохранено'}</button>
        <button className="btn-secondary px-4 text-[#FF8080]" onClick={remove}><Icon name="trash" size={17} /></button>
      </div>

      <SectionTitle right={
        <div className="flex gap-3">
          <button className="text-violet text-[13px] font-semibold flex items-center gap-1" onClick={addText}><Icon name="text" size={15} />Текст</button>
          <button className="text-green text-[13px] font-semibold flex items-center gap-1" onClick={() => fileRef.current?.click()}><Icon name="attach" size={15} />Файл</button>
        </div>
      }>Вложения · {m.files.length}</SectionTitle>
      <input ref={fileRef} type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) addFile(f); e.target.value = '' }} />
      {upl !== null && (
        <div className="card px-4 py-3 mb-2 flex items-center gap-3">
          <span className="text-[13px] flex-1">Загрузка файла…</span>
          <span className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden"><span className="block h-full bg-green" style={{ width: `${upl}%` }} /></span>
          <span className="text-[12px] text-gray tabular-nums w-9 text-right">{upl}%</span>
        </div>
      )}
      {m.files.length ? (
        <div className="list-group">
          {m.files.map((f, i) => <FileRow key={f.id} f={f} first={i === 0} last={i === m.files.length - 1}
            onUp={() => moveFile(f.id, i - 1)} onDown={() => moveFile(f.id, i + 1)} onDelete={() => delFile(f.id, f.name || f.kind)} onSave={p => editFileText(f.id, p)} />)}
        </div>
      ) : <p className="text-[13px] text-gray2 px-1">Вложений нет</p>}
      <QuestionsBlock mid={m.id} />
      {node}
    </div>
  )
}

const KIND_LABEL: Record<string, string> = { lesson: 'Урок: время чтения + вопрос', video: 'Видео: досмотреть до конца', quiz: 'Тест: верный ответ', task: 'Задача: решить', tasks: 'Задания в тексте: решить', glance: 'Файл/фото: короткий просмотр' }

function QuestionsBlock({ mid }: { mid: number }) {
  const [d, setD] = useState<AQuestions | null>(null)
  const [edit, setEdit] = useState<AQuestion[] | null>(null)
  const load = useCallback(() => adminApi.questions(mid).then(setD).catch(() => setD(null)), [mid])
  useEffect(() => { load() }, [load])
  if (!d) return null
  const save = async () => {
    if (!edit) return
    try { setD(await adminApi.saveQuestions(mid, edit)); setEdit(null); toast('Вопросы сохранены') } catch (e) { toast(errMsg(e), true) }
  }
  const regen = async () => { try { setD(await adminApi.regenQuestions(mid)); toast('Вопросы пересозданы по тексту') } catch (e) { toast(errMsg(e), true) } }
  const upd = (i: number, p: Partial<AQuestion>) => edit && setEdit(edit.map((q, j) => j === i ? { ...q, ...p } : q))
  return (
    <>
      <SectionTitle right={d.kind === 'lesson' ? <button className="text-green text-[13px] font-semibold" onClick={() => setEdit(d.questions.length ? d.questions.map(q => ({ ...q, options: [...q.options] })) : [{ q: '', options: ['', '', '', ''], correct: 0 }])}>Изменить</button> : undefined}>
        Зачёт
      </SectionTitle>
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <b className="text-[14px]">{KIND_LABEL[d.kind] || d.kind}</b>
          <Badge tone="gold">+{d.xp} XP</Badge>
        </div>
        {d.seconds > 0 && <p className="text-[12.5px] text-gray mt-1">Минимум {Math.floor(d.seconds / 60) ? `${Math.floor(d.seconds / 60)} мин ` : ''}{d.seconds % 60 ? `${d.seconds % 60} с` : ''} на материале</p>}
        {d.kind === 'lesson' && (d.questions.length ? d.questions.map((q, i) => (
          <div key={i} className="mt-3 pt-3 border-t border-white/[.06]">
            <div className="flex items-center gap-2 mb-1.5"><span className="text-[11.5px] text-gray">Вариант {i + 1}</span>{q.source === 'admin' ? <Badge tone="violet">ваш</Badge> : <Badge tone="gray">авто</Badge>}</div>
            <p className="text-[13.5px] font-medium whitespace-pre-line">{q.q}</p>
            <ul className="mt-1.5 flex flex-col gap-1">{q.options.map((o, j) => (
              <li key={j} className={`text-[12.5px] flex gap-1.5 ${j === q.correct ? 'text-green' : 'text-gray'}`}>
                <Icon name={j === q.correct ? 'check' : 'close'} size={13} className="mt-[2px] shrink-0" />{o}
              </li>))}</ul>
          </div>
        )) : <p className="text-[12.5px] text-gold mt-2">Вопрос по тексту не получился — урок засчитывается по времени и прокрутке. Можно добавить свой.</p>)}
        {d.kind === 'lesson' && <button className="btn-secondary w-full h-10 mt-3 text-[13px]" onClick={regen}><Icon name="refresh" size={15} />Пересоздать по тексту урока</button>}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Проверочные вопросы">
        {edit && (<>
          <p className="text-[12.5px] text-gray mb-3">Ученику показывается один вариант; после неверного ответа — следующий. Отметьте верный ответ кружком.</p>
          {edit.map((q, i) => (
            <div key={i} className="card p-3 mb-3">
              <div className="flex items-center justify-between mb-2"><b className="text-[13px]">Вариант {i + 1}</b>
                {edit.length > 1 && <button className="text-[12.5px] text-[#FF8A8A]" onClick={() => setEdit(edit.filter((_, j) => j !== i))}>Удалить</button>}</div>
              <Field label="Вопрос" multiline rows={2} value={q.q} onChange={v => upd(i, { q: v })} />
              {q.options.map((o, j) => (
                <div key={j} className="flex items-center gap-2 mb-2">
                  <button onClick={() => upd(i, { correct: j })} aria-label="Верный ответ"
                    className={`w-6 h-6 rounded-full border-2 shrink-0 grid place-items-center ${q.correct === j ? 'border-green bg-green' : 'border-white/25'}`}>
                    {q.correct === j && <Icon name="check" size={13} className="text-ink" strokeWidth={2.6} />}</button>
                  <input className="flex-1 bg-s2 border border-white/[.08] rounded-[12px] px-3 py-2.5 text-[14px] outline-none" value={o}
                    placeholder={`Ответ ${j + 1}`} onChange={e => upd(i, { options: q.options.map((x, k) => k === j ? e.target.value : x) })} />
                </div>
              ))}
            </div>
          ))}
          {edit.length < 5 && <button className="btn-secondary w-full mb-3" onClick={() => setEdit([...edit, { q: '', options: ['', '', '', ''], correct: 0 }])}><Icon name="plus" size={15} />Ещё вариант</button>}
          <button className="btn-primary w-full" onClick={save}>Сохранить вопросы</button>
        </>)}
      </Sheet>
    </>
  )
}

function FileRow({ f, first, last, onUp, onDown, onDelete, onSave }: {
  f: AMaterial['files'][number]; first: boolean; last: boolean; onUp: () => void; onDown: () => void; onDelete: () => void; onSave: (p: Record<string, string>) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(f.kind === 'text' ? f.text : f.caption)
  const [name, setName] = useState(f.name)
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        <MediaTypeIcon type={f.kind} size={32} radius={9} iconSize={16} tone={f.kind === 'text' ? 'plain' : 'green'} />
        <button className="flex-1 min-w-0 text-left" onClick={() => setOpen(!open)}>
          <span className="block text-[14px] font-medium truncate">{f.kind === 'text' ? (f.text.slice(0, 60) || 'Текстовый блок') : (f.name || f.kind)}</span>
          <span className="block text-[11.5px] text-gray">{TYPE_LABEL[f.kind] || f.kind} · нажми, чтобы изменить</span>
        </button>
        <IconBtn name="arrowU" label="Выше" disabled={first} onClick={onUp} />
        <IconBtn name="arrowD" label="Ниже" disabled={last} onClick={onDown} />
        <IconBtn name="trash" label="Удалить" onClick={onDelete} />
      </div>
      {open && (
        <div className="px-4 pb-4">
          {f.kind !== 'text' && <Field label="Имя файла" value={name} onChange={setName} />}
          <Field label={f.kind === 'text' ? 'Текст блока' : 'Подпись'} multiline rows={f.kind === 'text' ? 6 : 2} value={text} onChange={setText} />
          <button className="btn-secondary w-full h-10 text-[13.5px]" onClick={() => onSave(f.kind === 'text' ? { text } : { caption: text, name })}>Сохранить вложение</button>
        </div>
      )}
    </div>
  )
}
