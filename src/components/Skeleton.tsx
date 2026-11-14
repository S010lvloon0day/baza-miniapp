/** Заготовка списка на время загрузки. */
export default function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 w-full px-3.5 pt-3 self-start" aria-busy="true" aria-label="Загрузка">
      <div className="skel h-5 w-32 rounded-md mb-3" />
      <div className="list-group">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3.5 py-3">
            <div className="skel w-[38px] h-[38px] rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="skel h-3.5 rounded" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
              <div className="skel h-2.5 rounded mt-2" style={{ width: `${25 + ((i * 11) % 25)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
