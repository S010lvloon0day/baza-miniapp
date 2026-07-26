import type { ReactNode } from 'react'
import type { CourseIconKey } from '../api/courses'

const PATHS: Record<CourseIconKey, ReactNode> = {
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
      <path d="M8 7h8M8 11h8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.6" y2="16.6" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  mask: (
    <>
      <path d="M2 10c3-2 5-2 6 0s3 2 4 0 3-2 4 0 3 2 6 0" />
      <path d="M4 10v2a8 8 0 0 0 16 0v-2" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.4-2" />
    </>
  ),
  users: (
    <>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M4.5 20c1-4 4-6.2 7.5-6.2s6.5 2.2 7.5 6.2" />
    </>
  ),
}

export const CHECK_PATH = <polyline points="20 6 9 17 4 12" />
export const LOCK_PATH = (
  <>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.4-2" />
  </>
)

interface Props {
  icon: CourseIconKey
  size?: number
  glow?: boolean
}

export default function CourseIcon({ icon, size = 21, glow = true }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={glow ? { filter: 'drop-shadow(0 0 4px rgba(34,197,94,.9))' } : undefined}
    >
      {PATHS[icon] ?? PATHS.book}
    </svg>
  )
}

/** Квадратная «сквиркл»-плашка с зелёным свечением — общий бейдж курсов и глав. */
export function CourseIconBadge({
  icon,
  size = 48,
  iconSize = 21,
  state = 'active',
}: {
  icon: CourseIconKey
  size?: number
  iconSize?: number
  state?: 'active' | 'done' | 'locked'
}) {
  const locked = state === 'locked'
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        border: `1px solid ${locked ? 'rgba(255,255,255,.1)' : 'rgba(34,197,94,.4)'}`,
        background: locked ? 'rgba(255,255,255,.04)' : '#0c0d0f',
        boxShadow: locked ? 'none' : '0 0 16px rgba(34,197,94,.4)',
        color: locked ? '#4a4a52' : '#4AE885',
      }}
    >
      {state === 'done' ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          {CHECK_PATH}
        </svg>
      ) : locked ? (
        <svg width={iconSize - 2} height={iconSize - 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          {LOCK_PATH}
        </svg>
      ) : (
        <CourseIcon icon={icon} size={iconSize} />
      )}
    </div>
  )
}
