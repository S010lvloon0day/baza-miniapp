import { useEffect } from 'react'

// Пока открыта нижняя шторка, прячем нижнюю навигацию. На iPhone (WebKit) панель
// с backdrop-filter рисуется поверх шторки независимо от z-index и закрывает кнопки.
let openCount = 0
let styled = false

export function useHideNav(open: boolean) {
  useEffect(() => {
    if (!open) return
    if (!styled) {
      const st = document.createElement('style')
      st.textContent = 'body.sheet-open .app-nav{display:none!important}'
      document.head.appendChild(st)
      styled = true
    }
    openCount++
    document.body.classList.add('sheet-open')
    return () => {
      openCount = Math.max(0, openCount - 1)
      if (!openCount) document.body.classList.remove('sheet-open')
    }
  }, [open])
}
