/** Совместимые обёртки: прежние имена иконок → фирменный набор «База». */
import type { CSSProperties } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

type P = { size?: number; weight?: string; className?: string; style?: CSSProperties; color?: string }
const mk = (name: IconName, filled?: IconName) => (p: P) => (
  <Icon name={p.weight === 'fill' && filled ? filled : name} size={p.size ?? 20} className={p.className}
    style={p.color ? { color: p.color, ...p.style } : p.style} accent={p.weight === 'fill' ? 'current' : 'brand'}
    strokeWidth={p.weight === 'bold' ? 2 : 1.7} />
)

export const ArrowLeft = mk('arrowL')
export const ArrowRight = mk('arrowR')
export const ArrowSquareOut = mk('external')
export const ArrowBendDownRight = mk('reply')
export const ArrowCounterClockwise = mk('undo')
export const BookmarkSimple = mk('bookmark', 'bookmarkFill')
export const BookOpen = mk('book')
export const Bell = mk('bell')
export const BellSlash = mk('bellOff')
export const BellRinging = mk('bellRing')
export const CaretLeft = mk('chevL')
export const CaretRight = mk('chevR')
export const CaretDown = mk('chevD')
export const ChatCircle = mk('chat')
export const Check = mk('check')
export const CheckCircle = mk('checkCircle')
export const Copy = mk('copy')
export const CornersIn = mk('fsIn')
export const CornersOut = mk('fsOut')
export const Crown = mk('crown')
export const DownloadSimple = mk('download')
export const Flag = mk('flag')
export const Gift = mk('gift')
export const Heart = mk('heart', 'heartFill')
export const Lock = mk('lock')
export const MagnifyingGlass = mk('search')
export const PaperPlaneRight = mk('send')
export const PaperPlaneTilt = mk('send')
export const Plus = mk('plus')
export const SealCheck = mk('seal')
export const Star = mk('starLine', 'star')
export const Trash = mk('trash')
export const Warning = mk('warn')
export const WarningCircle = mk('warnCircle')
export const X = mk('close')
export const TextT = mk('text')
export const ArrowUp = mk('arrowU')
export const ArrowDown = mk('arrowD')
export const SortAscending = mk('sort')
