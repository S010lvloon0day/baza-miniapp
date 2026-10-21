import type { CourseIconKey } from '../api/courses'
import Icon from './Icon'
import type { IconName } from './Icon'

const MAP: Record<CourseIconKey, IconName> = { book: 'book', search: 'osint', shield: 'shield', mask: 'mask', unlock: 'unlock', users: 'users' }

export const CHECK_PATH = <path d="M4.5 12.5l5 5 10-11" />
export const LOCK_PATH = <path d="M5 10.5h14v10H5zM8 10.5v-3l2-3h4l2 3v3" />

interface Props { icon: CourseIconKey; size?: number; glow?: boolean }

/** Иконка курса из фирменного набора. */
export default function CourseIcon({ icon, size = 21 }: Props) {
  return <Icon name={MAP[icon] ?? 'book'} size={size} />
}

/** Плитка-бейдж курса/главы: изумрудная (доступна), с галочкой (пройдена), приглушённая с замком (закрыта). */
export function CourseIconBadge({
  icon, size = 48, iconSize = 21, state = 'active',
}: { icon: CourseIconKey; size?: number; iconSize?: number; state?: 'active' | 'done' | 'locked' }) {
  const locked = state === 'locked'
  const done = state === 'done'
  return (
    <div className="flex items-center justify-center shrink-0"
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: locked ? 'rgba(255,255,255,.05)' : done ? 'rgba(23,229,132,.16)' : 'linear-gradient(160deg,#0E7A4C,#08291B)',
        border: `1px solid ${locked ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.11)'}`,
        color: locked ? '#6E8478' : done ? '#17E584' : '#9FF0C6',
      }}>
      {done ? <Icon name="check" size={iconSize} strokeWidth={2.2} />
        : locked ? <Icon name="lock" size={iconSize - 2} accent="current" />
        : <Icon name={MAP[icon] ?? 'book'} size={iconSize} accent="#9FF0C6" />}
    </div>
  )
}
