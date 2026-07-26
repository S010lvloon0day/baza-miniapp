import { useCallback, useEffect, useState } from 'react'
import { CenterLoader, ErrorNote } from '../../components/course/ui'
import CourseEditor from './CourseEditor'
import GrantSheet from './GrantSheet'
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
          border: '1px dashed rgba(34,197,94,.4)', borderRadius: 14,
          background: 'rgba(34,197,94,.06)', color: '#4AE885',
          fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 18,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Новый курс
      </button>

      <div className="font-mono" style={{ fontSize: 11, color: '#8a8a93', marginBottom: 14 }}>
        // {courses.length} курсов в конструкторе
      </div>

      <div className="flex flex-col" style={{ gap: 10 }}>
        {courses.map(c => (
          <div
            key={c.id}
            className="flex items-center"
            style={{ gap: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 15, background: '#101014' }}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
                {c.title}{!c.is_active && <span style={{ color: '#6a6a75', fontWeight: 600 }}> · скрыт</span>}
              </div>
              <div style={{ fontSize: 10.5, color: '#6a6a75' }}>
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
                    style={{ border: '1px solid rgba(34,197,94,.35)', background: 'rgba(34,197,94,.08)', color: '#4AE885', width: 32, height: 32, borderRadius: 9, cursor: 'pointer', flex: 'none' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 12 20 22 4 22 4 12" />
                      <rect x="2" y="7" width="20" height="5" />
                      <line x1="12" y1="22" x2="12" y2="7" />
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                  </svg>
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
}

export default function ConstructorPage({ editing, onEditingChange }: Props) {
  const [courses, setCourses] = useState<AdminCourseSummary[]>([])
  const [sections, setSections] = useState<AdminSection[]>([])
  const [draft, setDraft] = useState<DraftCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grant, setGrant] = useState<{ id: number; title: string } | null>(null)

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
