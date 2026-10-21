import Icon from '../Icon'
import type { CourseStep } from '../../api/courses'

export type StepState = 'solved' | 'wrong' | 'current' | 'fresh'

export function stepState(step: CourseStep, isCurrent: boolean): StepState {
  // Решённый шаг остаётся с галочкой, даже когда открыт — подсветку даёт рамка
  if (step.solved) return 'solved'
  if (isCurrent) return 'current'
  return step.attempts > 0 ? 'wrong' : 'fresh'
}

const STYLES: Record<StepState, string> = {
  solved:  'bg-green/15 text-green',
  wrong:   'bg-[#FF6B6B]/12 text-[#FF9A9A]',
  current: 'bg-white/[.12] text-fg',
  fresh:   'bg-white/[.04] text-gray2',
}

function StepGlyph({ step, state }: { step: CourseStep; state: StepState }) {
  if (state === 'solved') return <Icon name="check" size={15} strokeWidth={2.4} />
  if (state === 'wrong') return <Icon name="close" size={13} strokeWidth={2.4} />
  return <Icon name={step.kind === 'lesson' ? 'lesson' : 'test'} size={13} accent="current" />
}

interface Props {
  steps: CourseStep[]
  activeIdx: number
  onSelect: (idx: number) => void
}

/** Полоса шагов главы: состояние каждого шага видно сразу, переход — в любой. */
export default function StepBar({ steps, activeIdx, onSelect }: Props) {
  if (steps.length < 2) return null

  return (
    <div
      className="flex overflow-x-auto gap-1.5 pb-1 mb-3.5"
      style={{ scrollbarWidth: 'none' }}
      role="tablist"
      aria-label="Шаги главы"
    >
      {steps.map((step, i) => {
        const state = stepState(step, i === activeIdx)
        const s = STYLES[state]
        return (
          <button
            key={`${step.kind}-${step.id}`}
            type="button"
            role="tab"
            aria-selected={i === activeIdx}
            aria-label={`Шаг ${i + 1}${step.solved ? ', решён' : step.attempts ? ', есть ошибка' : ''}`}
            onClick={() => onSelect(i)}
            className={`flex items-center justify-center shrink-0 h-9 min-w-[38px] px-2 rounded-[11px] text-[12px] font-semibold tabular-nums transition-colors ${STYLES[state]} ${i === activeIdx ? 'ring-[1.5px] ring-green/70' : ''}`}
          >
            {state === 'current' || state === 'fresh' ? (
              <span className="flex items-center gap-1">
                <StepGlyph step={step} state={state} />
                <span>{i + 1}</span>
              </span>
            ) : (
              <StepGlyph step={step} state={state} />
            )}
          </button>
        )
      })}
    </div>
  )
}
