import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { CenterLoader, ErrorNote } from '../../components/course/ui'
import CourseEditor from './CourseEditor'
import GrantSheet from './GrantSheet'
import UploadPage from './UploadPage'
import { emptyCourse } from './types'
import type { DraftCourse } from './types'
import { coursesApi } from '../../api/courses'
import type { AdminCourse, AdminCourseSummary, AdminSection } from '../../api/courses'

/** Раздел по умолчанию для нового курса — авторская витрина «Курс». */
const DEFAULT_SECTION_TITLE = 'Курс'

function toDraft(course: AdminCourse): DraftCourse {
  return {
    id: course.id,
    section_id: course.section_id,
    title: course.title,
    description: course.description,
    level: course.level,
    icon: course.icon,
    price: course.price,
    is_active: course.is_active,
    chapters: course.chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      icon: ch.icon,
      expanded: false,
      steps: ch.steps.map(step =>
        step.kind === 'question'
          ? { ...step, options: step.options.map(o => ({ ...o })) }
          : { ...step },
      ),
    })),
    final_exam: course.final_exam.map(q => ({ ...q, options: q.options.map(o => ({ ...o })) })),
  }
}

interface ListProps {
  courses: AdminCourseSummary[]
  onCreate: () => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onGrant: (id: number) => void
}

function ConstructorList({ courses, onCreate, onEdit, onDelete, onGrant }: ListProps) {
  const [confirmId, setConfirmId] = useState<number | null>(null)

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <button
        type="button"
        onClick={onCreate}
        className="w-full flex items-center justify-center"
        style={{
          gap: 8, padding: 14,
          border: '1px dashed rgba(23,229,132,.4)', borderRadius: 14,
          background: 'rgba(23,229,132,.06)', color: '#4BF5A8',
          fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 18,
        }}
      >
        <Icon name="plus" size={15} />
        Новый курс
      </button>

      <div className="font-mono" style={{ fontSize: 11, color: '#A6B8AE', marginBottom: 14 }}>
        {courses.length} курсов в конструкторе
      </div>

      <div className="flex flex-col" style={{ gap: 10 }}>
        {courses.map(c => (
          <div
            key={c.id}
            className="flex items-center"
            style={{ gap: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 15, background: '#111C17' }}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
                {c.title}{!c.is_active && <span style={{ color: '#6E8478', fontWeight: 600 }}> · скрыт</span>}
              </div>
              <div style={{ fontSize: 10.5, color: '#6E8478' }}>
                {c.chapters_count} глав · {c.level}{c.price > 0 ? ` · ${c.price} USDT` : ' · бесплатно'}
              </div>
              <div className="font-mono" style={{ fontSize: 9.5, color: '#4a4a52', marginTop: 3 }}>
                начали {c.stats.started} · сдали {c.stats.finished} · купили {c.stats.enrolled}
              </div>
            </div>

            {confirmId === c.id ? (
              <>
                <button
                  type="button"
                  onClick={() => { onDelete(c.id); setConfirmId(null) }}
                  style={{ border: 'none', background: '#ff6767', color: '#0A0A0D', fontSize: 11, fontWeight: 800, borderRadius: 9, padding: '8px 12px', cursor: 'pointer', flex: 'none' }}
                >
                  Удалить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  style={{ border: '1px solid rgba(255,255,255,.14)', background: 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 9, padding: '8px 10px', cursor: 'pointer', flex: 'none' }}
                >
                  Нет
                </button>
              </>
            ) : (
              <>
                {c.price > 0 && (
                  <button
                    type="button"
                    onClick={() => onGrant(c.id)}
                    aria-label="Подарить курс"
                    className="flex items-center justify-center"
                    style={{ border: '1px solid rgba(23,229,132,.35)', background: 'rgba(23,229,132,.08)', color: '#4BF5A8', width: 32, height: 32, borderRadius: 9, cursor: 'pointer', flex: 'none' }}
                  >
                    <Icon name="gift" size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(c.id)}
                  style={{ border: '1px solid rgba(255,255,255,.14)', background: 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 9, padding: '8px 12px', cursor: 'pointer', flex: 'none' }}
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(c.id)}
                  aria-label="Удалить курс"
                  className="flex items-center justify-center"
                  style={{ border: 'none', background: 'rgba(255,103,103,.1)', color: '#ff8080', width: 32, height: 32, borderRadius: 9, cursor: 'pointer', flex: 'none' }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  /** Редактор открыт — App скрывает вкладки и показывает стрелку «назад». */
  editing: boolean
  onEditingChange: (editing: boolean) => void
  /** Открыть сразу нужный режим без переключателя (из админки). */
  fixedMode?: 'material' | 'course'
}

export default function ConstructorPage({ editing, onEditingChange, fixedMode }: Props) {
  const [courses, setCourses] = useState<AdminCourseSummary[]>([])
  const [sections, setSections] = useState<AdminSection[]>([])
  const [draft, setDraft] = useState<DraftCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grant, setGrant] = useState<{ id: number; title: string } | null>(null)
  // Конструктор обслуживает две задачи: загрузку материалов и курсы.
  const [mode, setMode] = useState<'material' | 'course'>(fixedMode ?? 'material')

  const reload = useCallback(async () => {
    try {
      const [list, secs] = await Promise.all([coursesApi.adminList(), coursesApi.adminSections()])
      setCourses(list.courses)
      setSections(secs.sections)
      setError(null)
    } catch {
      setError('Не удалось загрузить конструктор. Проверь доступ администратора.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // Выход из редактора инициируется кнопкой «назад» в шапке
  useEffect(() => { if (!editing && draft) setDraft(null) }, [editing, draft])

  const defaultSectionId = () =>
    sections.find(s => s.title === DEFAULT_SECTION_TITLE)?.id ?? sections[0]?.id ?? 0

  const create = () => {
    setDraft(emptyCourse(defaultSectionId()))
    onEditingChange(true)
  }

  const edit = async (id: number) => {
    try {
      const course = await coursesApi.adminGet(id)
      // У загруженных вопросов id уже числовые; новым элементам их выдаст newId
      setDraft(toDraft(course))
      onEditingChange(true)
    } catch {
      setError('Не удалось открыть курс.')
    }
  }

  const remove = async (id: number) => {
    try {
      await coursesApi.adminDelete(id)
      await reload()
    } catch {
      setError('Не удалось удалить курс.')
    }
  }

  const save = async () => {
    if (!draft) return
    const payload = {
      ...draft,
      chapters: draft.chapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        icon: ch.icon,
        // Пустые задачи не сохраняем, теорию оставляем как есть
        steps: ch.steps.filter(s => s.kind === 'lesson' || s.text.trim()),
      })),
      final_exam: draft.final_exam.filter(q => q.text.trim()),
    }
    await coursesApi.adminSave(payload)
    await reload()
    onEditingChange(false)
    setDraft(null)
  }

  const ModeSwitch = () => (
    <div className="px-4 pt-4">
      <div className="flex gap-1 p-1 rounded-xl border border-white/[.08] bg-s2/40">
        {([['material', 'Материал'], ['course', 'Курсы']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)}
            className={`flex-1 h-9 rounded-lg text-[11px] font-semibold 
                        transition-colors ${mode === id
                          ? 'bg-green text-bg'
                          : 'text-white/60 active:bg-bd2'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )

  if (!editing && mode === 'material' && !fixedMode) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <ModeSwitch />
        <UploadPage />
      </div>
    )
  }

  if (loading) return <CenterLoader />

  if (error && !courses.length) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
        <ErrorNote>{error}</ErrorNote>
      </div>
    )
  }

  if (editing && draft) {
    return <CourseEditor course={draft} sections={sections} onChange={setDraft} onSave={save} />
  }

  return (
    <>
      {error && <div className="px-4 pt-4"><ErrorNote>{error}</ErrorNote></div>}
      <ConstructorList
        courses={courses}
        onCreate={create}
        onEdit={edit}
        onDelete={remove}
        onGrant={id => {
          const c = courses.find(x => x.id === id)
          if (c) setGrant({ id, title: c.title })
        }}
      />
      <GrantSheet
        open={grant !== null}
        courseId={grant?.id ?? null}
        courseTitle={grant?.title ?? ''}
        onClose={() => setGrant(null)}
      />
    </>
  )
}
