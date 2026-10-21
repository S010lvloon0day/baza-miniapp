import Icon from './Icon'
import type { IconName } from './Icon'

const MAP: Record<string, IconName> = { text: 'lesson', doc: 'doc', video: 'video', photo: 'photo', document: 'file', quiz: 'test', task: 'task' }

interface Props { type: string; size?: number; radius?: number; iconSize?: number; glow?: string; tone?: 'plain' | 'green' }

/** Иконка типа материала на нейтральной плитке (фирменный набор). */
export default function MediaTypeIcon({ type, size = 40, radius = 12, iconSize = 19, tone = 'plain' }: Props) {
  return (
    <div className={`shrink-0 flex items-center justify-center ${tone === 'green' ? 'bg-green/15 text-green' : 'bg-white/[.06] text-[#CFDAD4]'}`}
      style={{ width: size, height: size, borderRadius: radius }}>
      <Icon name={MAP[type] ?? 'file'} size={iconSize} />
    </div>
  )
}
