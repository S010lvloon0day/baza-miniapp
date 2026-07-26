import { CourseIconBadge } from '../CourseIcon'
import { ProgressBar } from './ui'
import type { CourseChapter } from '../../api/courses'

interface Props {
  chapters: CourseChapter[]
  activeChapter?: number
  activeStep?: number
  onSelect: (chapterIdx: number, stepIdx: number) => void
  /** В боковой панели главы всегда развёрнуты, на телефоне — только текущая. */
  expandAll?: boolean
}

/** Оглавление курса: главы со списком шагов, любой шаг открыт для перехода. */
export default function Syllabus({ chapters, activeChapter, activeStep, onSelect, expandAll }: Props) {
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {chapters.map((ch, ci) => {
        const open = expandAll || ci === activeChapter
        const percent = ch.steps_count ? Math.round((ch.solved_count / ch.steps_count) * 100) : 0

        return (
          <div
            key={ch.id}
            style={{
              border: `1px solid ${ci === activeChapter ? 'rgba(34,197,94,.35)' : 'rgba(255,255,255,.08)'}`,
              borderRadius: 14,
              background: '#101014',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(ci, 0)}
              className="w-full flex items-center text-left"
              style={{ gap: 11, padding: '12px 13px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <CourseIconBadge
                icon={ch.icon}
                size={34}
                iconSize={15}
                state={ch.steps_count && ch.solved_count >= ch.steps_count ? 'done' : 'active'}
              />
              <span className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontSize: 12.5, fontWeight: 800, color: '#fff' }}>
                  {ch.is_exam ? '🏁 ' : ''}{ch.title}
                </span>
                <span className="block font-mono" style={{ fontSize: 9.5, color: '#6a6a75', marginTop: 2 }}>
                  {ch.solved_count} / {ch.steps_count} шагов
                </span>
              </span>
              <span style={{ fontSize: 10, color: percent === 100 ? '#4AE885' : '#6a6a75', fontWeight: 700 }}>
                {percent}%
              </span>
            </button>

            <div style={{ padding: '0 13px 10px' }}>
              <ProgressBar percent={percent} height={4} />
            </div>

            {open && ch.steps.length > 0 && (
              <div className="flex flex-col" style={{ padding: '0 8px 8px', gap: 2 }}>
                {ch.steps.map((step, si) => {
                  const active = ci === activeChapter && si === activeStep
                  const mark = step.solved ? '✓' : step.attempts > 0 ? '✕' : String(si + 1)
                  const markColor = step.solved ? '#4AE885' : step.attempts > 0 ? '#ff9a9a' : '#5c5c66'
                  return (
                    <button
                      key={`${step.kind}-${step.id}`}
                      type="button"
                      onClick={() => onSelect(ci, si)}
                      className="w-full flex items-center text-left"
                      style={{
                        gap: 9, padding: '7px 9px', borderRadius: 9, border: 'none',
                        background: active ? 'rgba(34,197,94,.12)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="flex items-center justify-center shrink-0 font-mono"
                        style={{ width: 18, height: 18, fontSize: 10, fontWeight: 800, color: markColor }}
                      >
                        {mark}
                      </span>
                      <span
                        className="flex-1 min-w-0 truncate"
                        style={{ fontSize: 11.5, color: active ? '#fff' : '#9a9aa2', fontWeight: active ? 700 : 500 }}
                      >
                        {step.kind === 'lesson' ? step.title : step.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
