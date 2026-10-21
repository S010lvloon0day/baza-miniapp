import type { CSSProperties, ReactNode } from 'react'
import Icon from '../Icon'

export function ProgressBar({ percent, height = 6 }: { percent: number; height?: number }) {
  return (
    <div style={{ height }} className="rounded-full bg-white/[.08] overflow-hidden">
      <div className="h-full rounded-full bg-green transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  )
}

/** Подпись блока (раньше — моноширинная). Теперь обычный заголовок секции. */
export function MonoLabel({ children }: { children: ReactNode }) {
  return <div className="font-display font-semibold text-[14px] text-fg mb-3.5">{children}</div>
}

interface ButtonProps {
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'muted'
  style?: CSSProperties
}

/** primary — изумрудная кнопка, ghost — вторичная, muted — недоступное действие. */
export function CourseButton({ onClick, disabled, children, variant = 'primary', style }: ButtonProps) {
  const v = disabled ? 'muted' : variant
  const cls = v === 'primary' ? 'btn-primary w-full'
    : v === 'ghost' ? 'btn-secondary w-full h-12 text-[14px]'
    : 'w-full h-12 rounded-[16px] bg-white/[.03] border border-white/[.06] text-gray2 text-[14px] font-medium flex items-center justify-center'
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={cls} style={style}>
      {children}
    </button>
  )
}

export function CenterLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-1.5 h-1.5 bg-green/70 rounded-full animate-pulse" />
    </div>
  )
}

export function StarRow({ value, size = 18, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= Math.round(value)
        return (
          <button key={star} type="button" aria-label={`Оценка ${star} из 5`}
            onClick={onChange ? () => onChange(star) : undefined} disabled={!onChange}
            className={`p-0 leading-none ${filled ? 'text-gold' : 'text-white/20'} ${onChange ? 'active:scale-90 transition-transform' : ''}`}>
            <Icon name={filled ? 'star' : 'starLine'} size={size} accent="current" />
          </button>
        )
      })}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-3 rounded-[14px] border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 text-[#FFA3A3] text-[13.5px] font-medium mb-3.5">
      {children}
    </div>
  )
}
