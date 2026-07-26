import type { CSSProperties, ReactNode } from 'react'

export function ProgressBar({ percent, height = 6 }: { percent: number; height?: number }) {
  return (
    <div style={{ height, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          borderRadius: 4,
          background: 'linear-gradient(90deg,#22C55E,#4AE885)',
          width: `${Math.max(0, Math.min(100, percent))}%`,
          transition: 'width .3s ease',
        }}
      />
    </div>
  )
}

export function MonoLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono" style={{ fontSize: 11, color: '#8a8a93', letterSpacing: '1.5px', marginBottom: 14 }}>
      {children}
    </div>
  )
}

interface ButtonProps {
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'muted'
  style?: CSSProperties
}

/** Основная белая «таблетка» из макета; ghost — обводка, muted — недоступное действие. */
export function CourseButton({ onClick, disabled, children, variant = 'primary', style }: ButtonProps) {
  const base: CSSProperties = {
    width: '100%',
    padding: 15,
    borderRadius: 13,
    fontSize: 13.5,
    fontWeight: 800,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'transform .15s ease',
    border: 'none',
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'linear-gradient(180deg,#ffffff,#e8ebe9)', color: '#0A0A0D' },
    ghost: { background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.14)', fontWeight: 700, fontSize: 13 },
    muted: { background: 'rgba(255,255,255,.03)', color: '#55555e', border: '1px solid rgba(255,255,255,.08)' },
  }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="active:scale-[.99]"
      style={{ ...base, ...variants[disabled ? 'muted' : variant], ...style }}
    >
      {children}
    </button>
  )
}

export function CenterLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )
}

export function StarRow({
  value,
  size = 18,
  onChange,
}: {
  value: number
  size?: number
  onChange?: (v: number) => void
}) {
  return (
    <div className="flex items-center" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= Math.round(value)
        return (
          <button
            key={star}
            type="button"
            aria-label={`Оценка ${star} из 5`}
            onClick={onChange ? () => onChange(star) : undefined}
            disabled={!onChange}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              lineHeight: 0,
              cursor: onChange ? 'pointer' : 'default',
              color: filled ? '#FFCB57' : '#3E3E52',
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
              <path d="M12 2l2.6 6.6L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.4-.4z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '13px 14px',
        borderRadius: 13,
        border: '1px solid rgba(255,103,103,.4)',
        background: 'rgba(255,103,103,.1)',
        color: '#ff9a9a',
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}
