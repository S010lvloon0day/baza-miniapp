import Icon from '../Icon'
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
    <div className="flex flex-col gap-2.5">
      {chapters.map((ch, ci) => {
        const open = expandAll || ci === activeChapter
        const percent = ch.steps_count ? Math.round((ch.solved_count / ch.steps_count) * 100) : 0
        const done = percent === 100

        return (
          <div key={ch.id}
            className={`rounded-[18px] bg-s1 overflow-hidden border ${ci === activeChapter ? 'border-green/35' : 'border-white/[.07]'}`}>
            <button type="button" onClick={() => onSelect(ci, 0)}
              className="w-full flex items-center gap-3 text-left px-3.5 pt-3.5 pb-2.5 active:bg-white/[.03]">
              <CourseIconBadge icon={ch.icon} size={38} iconSize={17}
                state={ch.steps_count && ch.solved_count >= ch.steps_count ? 'done' : 'active'} />
              <span className="flex-1 min-w-0">
                <span className="block truncate font-display font-semibold text-[14px] text-fg">{ch.title}</span>
                <span className="block text-[12.5px] text-gray mt-0.5 tabular-nums">{ch.solved_count} из {ch.steps_count} шагов</span>
              </span>
              <span className={`text-[13px] font-semibold tabular-nums ${done ? 'text-green' : 'text-gray'}`}>{percent}%</span>
            </button>

            <div className="px-3.5 pb-3">
              <ProgressBar percent={percent} height={4} />
            </div>

            {open && ch.steps.length > 0 && (
              <div className="flex flex-col gap-0.5 px-2 pb-2">
                {ch.steps.map((step, si) => {
                  const active = ci === activeChapter && si === activeStep
                  return (
                    <button key={`${step.kind}-${step.id}`} type="button" onClick={() => onSelect(ci, si)}
                      className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-[12px] ${active ? 'bg-green/[.12]' : 'active:bg-white/[.04]'}`}>
                      <span className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-[8px] text-[11px] font-semibold tabular-nums
                        ${step.solved ? 'bg-green/15 text-green' : step.attempts > 0 ? 'bg-[#FF6B6B]/12 text-[#FF9A9A]' : 'bg-white/[.05] text-gray2'}`}>
                        {step.solved ? <Icon name="check" size={13} strokeWidth={2.4} /> : step.attempts > 0 ? <Icon name="close" size={12} strokeWidth={2.4} /> : si + 1}
                      </span>
                      <span className={`flex-1 min-w-0 truncate text-[13.5px] ${active ? 'text-fg font-semibold' : 'text-gray'}`}>
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
