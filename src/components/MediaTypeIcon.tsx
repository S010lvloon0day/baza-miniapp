import type { ReactNode } from 'react'

type MediaType = 'text' | 'video' | 'photo' | 'document'

const PATHS: Record<MediaType, ReactNode> = {
  text: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
      <path d="M8 7h8M8 11h5" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="5" width="14" height="14" rx="2.5" />
      <path d="M16 10l6-3.5v11L16 14" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M21 16l-5.2-5.2a2 2 0 0 0-2.8 0L5 19" />
    </>
  ),
  document: (
    <>
      <path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v5h5" />
    </>
  ),
}

interface Props {
  type: string
  size?: number
  radius?: number
  iconSize?: number
  glow?: string
}

export default function MediaTypeIcon({ type, size = 42, radius = 12, iconSize = 18, glow = '0 0 14px rgba(34,197,94,.3)' }: Props) {
  const key = (type in PATHS ? type : 'document') as MediaType
  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'radial-gradient(circle,rgba(34,197,94,.28),rgba(34,197,94,.06) 65%,transparent)',
        boxShadow: glow,
        color: '#4AE885',
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[key]}
      </svg>
    </div>
  )
}
