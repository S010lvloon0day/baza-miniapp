// ПК: горизонтальные ленты (полка разделов, чипы) листаются колесом мыши и перетаскиванием.
function hbox(start: EventTarget | null): HTMLElement | null {
  let el = start as HTMLElement | null
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 4) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return el
    }
    el = el.parentElement
  }
  return null
}

export function startHScroll() {
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    const box = hbox(e.target)
    if (!box) return
    const max = box.scrollWidth - box.clientWidth
    const next = Math.max(0, Math.min(max, box.scrollLeft + e.deltaY))
    if (next === box.scrollLeft) return            // упёрлись в край — отдаём прокрутку странице
    box.scrollLeft = next
    e.preventDefault()
  }, { passive: false })

  let drag: { box: HTMLElement; x: number; left: number; moved: boolean } | null = null
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return
    const box = hbox(e.target)
    if (box) drag = { box, x: e.clientX, left: box.scrollLeft, moved: false }
  })
  window.addEventListener('mousemove', (e) => {
    if (!drag) return
    const dx = e.clientX - drag.x
    if (Math.abs(dx) > 6) drag.moved = true
    if (drag.moved) drag.box.scrollLeft = drag.left - dx
  })
  window.addEventListener('mouseup', () => {
    const d = drag; drag = null
    if (d?.moved) {
      // перетаскивание не должно срабатывать как нажатие на карточку
      const stop = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault() }
      window.addEventListener('click', stop, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', stop, true), 50)
    }
  })
}
