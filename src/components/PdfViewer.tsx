import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Mobile WebViews render <iframe src="file.pdf"> very inconsistently (iOS Safari shows only
// the first page with no way to scroll further; Android Chrome often renders nothing at all) —
// pdf.js draws pages into our own <canvas>, sidestepping each platform's native PDF plugin
// entirely. Per react-pdf's docs, the worker must be configured in this exact module.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PdfViewer({ file }: { file: string }) {
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)

  return (
    <div className="mb-3">
      <div className="rounded-2xl border border-white/[.08] overflow-hidden flex justify-center" style={{ background: '#fff' }}>
        <Document
          file={file}
          loading={
            <div className="h-64 flex items-center justify-center">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
            </div>
          }
          error={
            <div className="h-64 flex items-center justify-center text-[13px]" style={{ color: '#333' }}>
              Не удалось открыть PDF
            </div>
          }
          onLoadSuccess={({ numPages }) => { setPageCount(numPages); setPage(1) }}
        >
          <Page pageNumber={page} width={Math.min(window.innerWidth - 40, 480)} />
        </Document>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 py-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="w-9 h-9 bg-s1 border border-[rgba(255,255,255,.14)] rounded text-white text-lg flex items-center justify-center disabled:opacity-30">‹</button>
          <span className="text-[13px] text-gray tracking-wider min-w-[64px] text-center px-2.5 py-1.5 rounded-lg border border-[rgba(255,255,255,.14)] bg-gradient-to-b from-white/[.06] to-white/[.02]">
            {page} / {pageCount}
          </span>
          <button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}
            className="w-9 h-9 bg-s1 border border-[rgba(255,255,255,.14)] rounded text-white text-lg flex items-center justify-center disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  )
}
