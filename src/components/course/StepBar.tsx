import type { CourseStep } from '../../api/courses'

export type StepState = 'solved' | 'wrong' | 'current' | 'fresh'

export function stepState(step: CourseStep, isCurrent: boolean): StepState {
  // Решённый шаг остаётся с галочкой, даже когда открыт — подсветку даёт рамка
  if (step.solved) return 'solved'
  if (isCurrent) return 'current'
  return step.attempts > 0 ? 'wrong' : 'fresh'
}

const STYLES: Record<StepState, { bg: string; border: string; color: string; shadow: string }> = {
  solved:  { bg: 'rgba(34,197,94,.18)',   border: 'rgba(74,232,133,.6)',  color: '#4AE885', shadow: '0 0 10px rgba(34,197,94,.3)' },
  wrong:   { bg: 'rgba(255,103,103,.12)', border: 'rgba(255,103,103,.5)', color: '#ff9a9a', shadow: 'none' },
  current: { bg: 'rgba(255,255,255,.1)',  border: 'rgba(255,255,255,.55)', color: '#fff',   shadow: '0 0 12px rgba(255,255,255,.18)' },
  fresh:   { bg: 'transparent',           border: 'rgba(255,255,255,.14)', color: '#75757f', shadow: 'none' },
}

function StepGlyph({ step, state }: { step: CourseStep; state: StepState }) {
  if (state === 'solved') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (state === 'wrong') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  if (step.kind === 'lesson') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.2 9a2.8 2.8 0 1 1 3.8 2.6c-.7.3-1 .9-1 1.6v.6" />
      <circle cx="12" cy="17.6" r=".9" fill="currentColor" />
    </svg>
  )
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
      className="flex overflow-x-auto"
      style={{ gap: 6, paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}
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
            className="flex items-center justify-center shrink-0"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: s.bg, border: `1px solid ${s.border}`, color: s.color,
              boxShadow: i === activeIdx ? '0 0 0 2px rgba(255,255,255,.35)' : s.shadow,
              fontSize: 11, fontWeight: 800, cursor: 'pointer',
              transition: 'background .15s ease, border-color .15s ease',
            }}
          >
            {state === 'current' || state === 'fresh' ? (
              <span className="flex items-center" style={{ gap: 3 }}>
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
