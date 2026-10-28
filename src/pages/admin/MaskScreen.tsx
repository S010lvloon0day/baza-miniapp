import { useCallback, useEffect, useState } from 'react'
import { maskAdmin } from '../../api/mask'
import type { AMask, AMaskClue } from '../../api/mask'
import { Loader, Field, Toggle, Segmented, SectionTitle, Badge, Sheet, toast, errMsg, num, fmtDate, useConfirm } from './ui'

const ST: Record<string, [string, 'green' | 'gold' | 'gray' | 'violet' | 'red']> = {
  draft: ['черновик', 'gray'], live: ['идёт', 'green'], solved: ['разгадан', 'gold'], closed: ['закрыт', 'gray'],
}

function ClueSheet({ open, onClose, roundId, clue, onSaved }: { open: boolean; onClose: () => void; roundId: number; clue: AMaskClue | null; onSaved: () => void }) {
  const [f, setF] = useState({ pos: '1', kind: 'text', question: '', options: '', answer: '', reward: '', points: '20', opens_at: '' })
  useEffect(() => {
    if (!open) return
    setF(clue ? {
      pos: String(clue.pos), kind: clue.kind, question: clue.question, options: clue.options.join('\n'), answer: '',
      reward: clue.reward, points: String(clue.points), opens_at: clue.opens_at ? new Date(clue.opens_at + 'Z').toISOString().slice(0, 16) : '',
    } : { pos: '1', kind: 'text', question: '', options: '', answer: '', reward: '', points: '20', opens_at: '' })
  }, [open, clue])
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }))
  const save = async () => {
    try {
      await maskAdmin.clue({
        id: clue?.id, round_id: roundId, pos: +f.pos || 0, kind: f.kind, question: f.question,
        options: f.kind === 'choice' ? f.options.split('\n').map(s => s.trim()).filter(Boolean) : [],
        answer: f.answer || undefined, reward: f.reward, points: +f.points || 0,
        opens_at: f.opens_at ? new Date(f.opens_at).toISOString().slice(0, 19) : '',
      })
      toast('Сохранено'); onSaved(); onClose()
    } catch (e) { toast(errMsg(e), true) }
  }
  return (
    <Sheet open={open} onClose={onClose} title={clue ? 'Улика' : 'Новая улика'}>
      <Segmented value={f.kind as 'text' | 'choice'} onChange={set('kind')} items={[['text', 'Ответ словом'], ['choice', 'Выбор варианта']]} />
      <div className="h-3" />
      <Field label="Номер" value={f.pos} onChange={set('pos')} type="number" />
      <Field label="Загадка / вопрос" value={f.question} onChange={set('question')} multiline rows={3} />
      {f.kind === 'choice' && <Field label="Варианты (каждый с новой строки)" value={f.options} onChange={set('options')} multiline rows={4} />}
      <Field label={f.kind === 'choice' ? 'Номер верного варианта (с 0)' : 'Верный ответ'} value={f.answer} onChange={set('answer')}
        placeholder={clue ? 'не меняется, если пусто' : ''} />
      <Field label="Подсказка после решения" value={f.reward} onChange={set('reward')} multiline rows={2} placeholder="например: в имени 5 букв" />
      <Field label="Очки" value={f.points} onChange={set('points')} type="number" />
      <Field label="Откроется (твоё местное время, пусто — сразу)" value={f.opens_at} onChange={set('opens_at')} type="datetime-local" />
      <button onClick={save} className="btn-primary w-full mt-1">Сохранить</button>
    </Sheet>
  )
}

export function MaskScreen() {
  const [d, setD] = useState<AMask | null>(null)
  const [answers, setAnswers] = useState('')
  const [test, setTest] = useState('')
  const [sheet, setSheet] = useState<{ open: boolean; clue: AMaskClue | null }>({ open: false, clue: null })
  const [edit, setEdit] = useState({ title: '', intro: '', prize: '' })
  const { ask, node } = useConfirm()
  const load = useCallback(() => { maskAdmin.get().then(x => { setD(x); const r = x.rounds[0]; if (r) setEdit({ title: r.title, intro: r.intro, prize: r.prize }) }).catch(e => toast(errMsg(e), true)) }, [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loader />
  const r = d.rounds[0]
  const clues = r ? d.clues.filter(c => c.round_id === r.id) : []

  const newRound = async () => {
    try { await maskAdmin.round({ title: 'Сними маску', prize: '80 USDT' }); toast('Раунд создан'); load() } catch (e) { toast(errMsg(e), true) }
  }
  const saveRound = async () => {
    if (!r) return
    try {
      await maskAdmin.round({ id: r.id, ...edit, ...(answers.trim() ? { answers } : {}) })
      setAnswers(''); toast('Сохранено'); load()
    } catch (e) { toast(errMsg(e) === 'no_answers' ? 'Укажи хотя бы один вариант имени' : errMsg(e), true) }
  }
  const setStatus = async (status: string) => {
    if (!r) return
    if (status === 'live' && !(await ask(`Запустить раунд? Игроки смогут угадывать. Видимость раздела: ${d.visible === '1' ? 'всем' : d.visible === 'admin' ? 'только админам' : 'скрыт'}.`))) return
    try { await maskAdmin.round({ id: r.id, status }); toast('Готово'); load() } catch (e) { toast(errMsg(e) === 'no_answers' ? 'Сначала задай имя' : errMsg(e), true) }
  }
  const setVis = async (v: string) => {
    if (v === '1' && !(await ask('Открыть игру всем пользователям?'))) return
    await maskAdmin.settings({ visible: v }).then(load).catch(e => toast(errMsg(e), true))
  }

  return (
    <div className="px-4 pt-3 pb-navsafe">
      <SectionTitle>Кто видит раздел</SectionTitle>
      <Segmented value={d.visible as '0' | 'admin' | '1'} onChange={setVis} items={[['admin', 'Только админы'], ['1', 'Все'], ['0', 'Скрыт']]} />
      <div className="list-group mt-3">
        <Toggle label="Режим «Скоро»" sub="игроки видят персонажа и тизер, но не могут отвечать и проходить задания" value={d.teaser !== false} tone="gold"
          onChange={v => maskAdmin.settings({ teaser: v }).then(load)} />
        <Toggle label="Показывать текст неверных попыток" sub="в ленте «Попытки» видно, что пробовали другие" value={d.feed_text}
          onChange={v => maskAdmin.settings({ feed_text: v }).then(load)} />
        <div className="px-4 py-3">
          <Field label="Минимальный возраст аккаунта для попыток, дней (защита от мультиаккаунтов)" value={String(d.min_days)}
            onChange={v => maskAdmin.settings({ min_days: +v || 0 }).then(load)} type="number" />
        </div>
      </div>

      <SectionTitle right={<button onClick={newRound} className="text-[13px] text-green">+ новый раунд</button>}>Раунд</SectionTitle>
      {!r ? <div className="card p-4 text-[13.5px] text-gray">Раундов нет — создай первый.</div> : (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <b className="text-[14.5px]">#{r.id}</b>
            <Badge tone={ST[r.status]?.[1] ?? 'gray'}>{ST[r.status]?.[0] ?? r.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            {[[num(r.guesses), 'попыток'], [num(r.players), 'игроков'], [String(r.answers_count), 'вариантов имени']].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/[.05] py-2"><div className="font-display font-semibold text-[15px]">{v}</div><div className="text-[11px] text-gray">{l}</div></div>
            ))}
          </div>
          {r.status === 'solved' && <p className="text-[13px] text-gold mb-3">Разгадан {fmtDate(r.solved_at)} · победитель ID {r.winner_id} · ответ «{r.winner_guess}». Выплату приза делаешь вручную.</p>}
          <Field label="Название" value={edit.title} onChange={v => setEdit(x => ({ ...x, title: v }))} />
          <Field label="Приз" value={edit.prize} onChange={v => setEdit(x => ({ ...x, prize: v }))} />
          <Field label="Вступление (видят игроки)" value={edit.intro} onChange={v => setEdit(x => ({ ...x, intro: v }))} multiline rows={3} />
          <Field label="Имя и допустимые варианты — каждый с новой строки (Зураб, zurab, …)" value={answers} onChange={setAnswers} multiline rows={3}
            placeholder={r.answers_count ? `задано вариантов: ${r.answers_count} — оставь пустым, чтобы не менять` : 'обязательно перед запуском'} />
          <p className="text-[11.5px] text-gray2 -mt-1 mb-3">Имя хранится на сервере только в виде хэша — ни в миниаппе, ни в ответах API его нет. Регистр, «ё» и пробелы не важны.</p>
          <button onClick={saveRound} className="btn-primary w-full">Сохранить</button>
          <div className="flex gap-2 mt-2">
            {r.status !== 'live' && r.status !== 'solved' && <button onClick={() => setStatus('live')} className="btn-secondary flex-1 h-11 rounded-[14px] text-[14px]">Запустить</button>}
            {r.status === 'live' && <button onClick={() => setStatus('draft')} className="btn-secondary flex-1 h-11 rounded-[14px] text-[14px]">Остановить</button>}
            {r.status !== 'closed' && <button onClick={() => setStatus('closed')} className="btn-secondary flex-1 h-11 rounded-[14px] text-[14px]">Закрыть</button>}
          </div>
          <div className="flex gap-2 mt-3">
            <input value={test} onChange={e => setTest(e.target.value)} placeholder="Проверить ответ (не считается)"
              className="flex-1 min-w-0 bg-s2 border border-white/[.08] rounded-[14px] px-3.5 h-11 text-[14.5px] outline-none" />
            <button onClick={() => maskAdmin.test(r.id, test).then(x => toast(x.ok ? 'Верно ✓' : 'Неверно', !x.ok))} className="btn-secondary h-11 px-4 rounded-[14px] text-[14px]">Проверить</button>
          </div>
        </div>
      )}

      {r && <>
        <SectionTitle right={<button onClick={() => setSheet({ open: true, clue: null })} className="text-[13px] text-green">+ улика</button>}>Улики</SectionTitle>
        {clues.length === 0 ? <div className="card p-4 text-[13.5px] text-gray">Улики — маленькие загадки. За решение игрок получает подсказку про имя и очки в рейтинг недели.</div> : (
          <div className="list-group">
            {clues.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setSheet({ open: true, clue: c })} className="flex-1 min-w-0 text-left">
                  <span className="block text-[14px] truncate">{c.pos}. {c.question || '—'}</span>
                  <span className="block text-[11.5px] text-gray truncate">{c.opens_at ? `с ${fmtDate(c.opens_at)}` : 'открыта'} · +{c.points} · подсказка: {c.reward || '—'}</span>
                </button>
                <button onClick={async () => { if (await ask('Удалить улику?')) maskAdmin.delClue(c.id).then(load) }} className="text-[12.5px] text-[#FF8A8A]">удалить</button>
              </div>
            ))}
          </div>
        )}
        <ClueSheet open={sheet.open} clue={sheet.clue} roundId={r.id} onClose={() => setSheet({ open: false, clue: null })} onSaved={load} />
      </>}
      {!d.reveal_uploaded && <p className="text-[12px] text-[#FF8A8A] mt-4">Модель без маски на сервере не найдена (data/mask/reveal.glb).</p>}
      {node}
    </div>
  )
}
