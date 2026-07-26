import { useState } from 'react'
import CourseIcon from '../../components/CourseIcon'
import { CourseButton, ErrorNote } from '../../components/course/ui'
import QuestionEditor, { inputStyle, XButton } from './QuestionEditor'
import { emptyChapter, emptyLesson, emptyQuestion } from './types'
import type { DraftChapter, DraftCourse, DraftLesson, DraftQuestion } from './types'
import { COURSE_ICONS, COURSE_LEVELS } from '../../api/courses'
import type { AdminSection, CourseIconKey, LessonType } from '../../api/courses'

const LESSON_TYPE_LABEL: Record<LessonType, string> = { text: 'Текст', video: 'Видео', image: 'Фото' }

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.8px', color: '#8a8a93', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 4px',
        borderRadius: 10,
        border: `1px solid ${active ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.1)'}`,
        background: active ? 'rgba(34,197,94,.1)' : 'transparent',
        color: active ? '#4AE885' : '#c9c9ce',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function LessonBlock({ lesson, onChange, onRemove }: { lesson: DraftLesson; onChange: (l: DraftLesson) => void; onRemove: () => void }) {
  const patch = (fields: Partial<DraftLesson>) => onChange({ ...lesson, ...fields })

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 11, padding: 10, background: '#0D0D11' }}>
      <div className="flex" style={{ gap: 6, marginBottom: 8 }}>
        {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => patch({ type })}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 7,
              border: `1px solid ${lesson.type === type ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.08)'}`,
              background: lesson.type === type ? 'rgba(34,197,94,.1)' : 'transparent',
              color: lesson.type === type ? '#4AE885' : '#8a8a93',
              fontSize: 9.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {LESSON_TYPE_LABEL[type]}
          </button>
        ))}
        <XButton onClick={onRemove} />
      </div>

      <input
        value={lesson.title}
        onChange={e => patch({ title: e.target.value })}
        placeholder="Заголовок урока"
        style={{ ...inputStyle, marginBottom: 7 }}
      />

      {lesson.type !== 'text' && (
        <input
          value={lesson.media_url}
          onChange={e => patch({ media_url: e.target.value })}
          placeholder={lesson.type === 'video' ? 'Прямая ссылка на видео (mp4)' : 'Прямая ссылка на изображение'}
          style={{ ...inputStyle, marginBottom: 7, fontSize: 12 }}
        />
      )}

      <textarea
        value={lesson.content}
        onChange={e => patch({ content: e.target.value })}
        placeholder="Текст урока / описание материала"
        rows={3}
        style={{ ...inputStyle, fontSize: 12, resize: 'vertical' }}
      />
    </div>
  )
}

function ChapterBlock({
  chapter,
  index,
  onChange,
  onRemove,
}: {
  chapter: DraftChapter
  index: number
  onChange: (c: DraftChapter) => void
  onRemove: () => void
}) {
  const patch = (fields: Partial<DraftChapter>) => onChange({ ...chapter, ...fields })

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, background: '#101014', overflow: 'hidden' }}>
      <div
        onClick={() => patch({ expanded: !chapter.expanded })}
        className="flex items-center"
        style={{ gap: 10, padding: '13px 14px', cursor: 'pointer' }}
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a8a93"
          strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: chapter.expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s ease', flex: 'none' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <input
          value={chapter.title}
          onChange={e => patch({ title: e.target.value })}
          onClick={e => e.stopPropagation()}
          placeholder={`Глава ${index + 1}`}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: '#fff', fontSize: 13.5, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
        />
        <span className="font-mono" style={{ fontSize: 10, color: '#6a6a75', flex: 'none' }}>
          {chapter.lessons.length} ур · {chapter.questions.length} вопр
        </span>
        <XButton size={14} onClick={onRemove} />
      </div>

      {chapter.expanded && (
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 14 }} />

          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Иконка главы</FieldLabel>
            <div className="flex" style={{ gap: 6 }}>
              {COURSE_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => patch({ icon })}
                  className="flex items-center justify-center"
                  style={{
                    flex: 1, height: 34, borderRadius: 9,
                    border: `1px solid ${chapter.icon === icon ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.08)'}`,
                    background: chapter.icon === icon ? 'rgba(34,197,94,.1)' : 'transparent',
                    color: chapter.icon === icon ? '#4AE885' : '#6a6a75',
                    cursor: 'pointer',
                  }}
                >
                  <CourseIcon icon={icon} size={15} glow={false} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span className="uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#7a7a83' }}>Уроки</span>
            <button
              type="button"
              onClick={() => patch({ lessons: [...chapter.lessons, emptyLesson()] })}
              style={{ border: 'none', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: '5px 9px', cursor: 'pointer' }}
            >
              + Урок
            </button>
          </div>
          <div className="flex flex-col" style={{ gap: 8, marginBottom: 16 }}>
            {chapter.lessons.map(lesson => (
              <LessonBlock
                key={String(lesson.id)}
                lesson={lesson}
                onChange={updated => patch({ lessons: chapter.lessons.map(l => (l.id === lesson.id ? updated : l)) })}
                onRemove={() => patch({ lessons: chapter.lessons.filter(l => l.id !== lesson.id) })}
              />
            ))}
          </div>

          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span className="uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#7a7a83' }}>Тест по главе</span>
            <button
              type="button"
              onClick={() => patch({ questions: [...chapter.questions, emptyQuestion()] })}
              style={{ border: 'none', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: '5px 9px', cursor: 'pointer' }}
            >
              + Вопрос
            </button>
          </div>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {chapter.questions.map(question => (
              <QuestionEditor
                key={String(question.id)}
                question={question}
                onChange={updated => patch({ questions: chapter.questions.map(q => (q.id === question.id ? updated : q)) })}
                onRemove={() => patch({ questions: chapter.questions.filter(q => q.id !== question.id) })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Курс без верных ответов в тесте нельзя пройти — ловим это до сохранения. */
function validate(course: DraftCourse): string | null {
  if (!course.title.trim()) return 'Укажите название курса.'
  if (!course.chapters.length) return 'Добавьте хотя бы одну главу.'

  const badQuestion = (q: DraftQuestion) =>
    q.text.trim() &&
    (q.options.filter(o => o.text.trim()).length < 2 || !q.options.some(o => o.correct && o.text.trim()))

  for (const [i, chapter] of course.chapters.entries()) {
    const question = chapter.questions.find(badQuestion)
    if (question) {
      return `Глава ${i + 1}: у вопроса «${question.text.slice(0, 30)}…» нужно минимум 2 варианта и хотя бы один правильный.`
    }
  }
  const examQuestion = course.final_exam.find(badQuestion)
  if (examQuestion) {
    return `Финальный экзамен: у вопроса «${examQuestion.text.slice(0, 30)}…» нужно минимум 2 варианта и хотя бы один правильный.`
  }
  return null
}

interface Props {
  course: DraftCourse
  sections: AdminSection[]
  onChange: (c: DraftCourse) => void
  onSave: () => Promise<void>
}

export default function CourseEditor({ course, sections, onChange, onSave }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (fields: Partial<DraftCourse>) => onChange({ ...course, ...fields })

  const save = async () => {
    const problem = validate(course)
    if (problem) { setError(problem); return }
    setError(null)
    setBusy(true)
    try {
      await onSave()
    } catch {
      setError('Не удалось сохранить курс. Проверь соединение и попробуй снова.')
    } finally { setBusy(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <FieldLabel>Название курса</FieldLabel>
      <input
        value={course.title}
        onChange={e => patch({ title: e.target.value })}
        placeholder="Например: OSINT для начинающих"
        style={{ ...inputStyle, padding: '12px 14px', borderRadius: 12, fontSize: 13.5, marginBottom: 14, border: '1px solid rgba(255,255,255,.1)' }}
      />

      <FieldLabel>Описание</FieldLabel>
      <textarea
        value={course.description}
        onChange={e => patch({ description: e.target.value })}
        placeholder="Короткое описание курса"
        rows={3}
        style={{ ...inputStyle, padding: '12px 14px', borderRadius: 12, fontSize: 13, marginBottom: 14, resize: 'vertical', border: '1px solid rgba(255,255,255,.1)' }}
      />

      <FieldLabel>Раздел, в котором показывать курс</FieldLabel>
      <select
        value={course.section_id}
        onChange={e => patch({ section_id: Number(e.target.value) })}
        style={{ ...inputStyle, padding: '12px 14px', borderRadius: 12, fontSize: 13, marginBottom: 14, border: '1px solid rgba(255,255,255,.1)' }}
      >
        {sections.map(s => (
          <option key={s.id} value={s.id} style={{ background: '#101014' }}>
            {s.parent_title ? `${s.parent_title} → ${s.title}` : s.title}
          </option>
        ))}
      </select>

      <FieldLabel>Уровень</FieldLabel>
      <div className="flex" style={{ gap: 8, marginBottom: 14 }}>
        {COURSE_LEVELS.map(level => (
          <SegButton key={level} active={course.level === level} onClick={() => patch({ level })}>
            {level}
          </SegButton>
        ))}
      </div>

      <FieldLabel>Иконка курса</FieldLabel>
      <div className="flex" style={{ gap: 6, marginBottom: 14 }}>
        {COURSE_ICONS.map((icon: CourseIconKey) => (
          <button
            key={icon}
            type="button"
            onClick={() => patch({ icon })}
            className="flex items-center justify-center"
            style={{
              flex: 1, height: 40, borderRadius: 10,
              border: `1px solid ${course.icon === icon ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.1)'}`,
              background: course.icon === icon ? 'rgba(34,197,94,.1)' : 'transparent',
              color: course.icon === icon ? '#4AE885' : '#6a6a75',
              cursor: 'pointer',
            }}
          >
            <CourseIcon icon={icon} size={18} glow={false} />
          </button>
        ))}
      </div>

      <FieldLabel>Цена, USDT (0 — бесплатно)</FieldLabel>
      <input
        type="number"
        min={0}
        step="0.5"
        value={course.price}
        onChange={e => patch({ price: Math.max(0, Number(e.target.value) || 0) })}
        style={{ ...inputStyle, padding: '12px 14px', borderRadius: 12, fontSize: 13.5, marginBottom: 14, border: '1px solid rgba(255,255,255,.1)' }}
      />

      <label className="flex items-center" style={{ gap: 8, fontSize: 12, color: '#9a9aa2', marginBottom: 22, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!course.is_active}
          onChange={e => patch({ is_active: e.target.checked ? 1 : 0 })}
        />
        Курс виден ученикам
      </label>

      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#9a9aa2' }}>Главы</span>
        <button
          type="button"
          onClick={() => patch({ chapters: [...course.chapters, emptyChapter()] })}
          style={{ border: 'none', background: 'rgba(34,197,94,.12)', color: '#4AE885', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
        >
          + Глава
        </button>
      </div>

      <div className="flex flex-col" style={{ gap: 12, marginBottom: 20 }}>
        {course.chapters.map((chapter, index) => (
          <ChapterBlock
            key={String(chapter.id)}
            chapter={chapter}
            index={index}
            onChange={updated => patch({ chapters: course.chapters.map(c => (c.id === chapter.id ? updated : c)) })}
            onRemove={() => patch({ chapters: course.chapters.filter(c => c.id !== chapter.id) })}
          />
        ))}
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#9a9aa2' }}>Финальный экзамен</span>
        <button
          type="button"
          onClick={() => patch({ final_exam: [...course.final_exam, emptyQuestion()] })}
          style={{ border: 'none', background: 'rgba(34,197,94,.12)', color: '#4AE885', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
        >
          + Вопрос
        </button>
      </div>

      <div className="flex flex-col" style={{ gap: 8, marginBottom: 20 }}>
        {course.final_exam.map(question => (
          <QuestionEditor
            key={String(question.id)}
            question={question}
            onChange={updated => patch({ final_exam: course.final_exam.map(q => (q.id === question.id ? updated : q)) })}
            onRemove={() => patch({ final_exam: course.final_exam.filter(q => q.id !== question.id) })}
          />
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <CourseButton onClick={save} disabled={busy} style={{ fontSize: 14, marginBottom: 8 }}>
        {busy ? 'Сохраняем…' : 'Сохранить курс'}
      </CourseButton>
    </div>
  )
}
