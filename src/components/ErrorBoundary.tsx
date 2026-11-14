import { Component, type ReactNode } from 'react'

/** Ловит падение любого экрана: вместо белого окна — понятное сообщение и кнопка. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) {
    // После обновления мини-аппа старые части кода исчезают с сервера — один раз перезагружаемся сами.
    const chunk = /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(err?.message))
    try {
      if (chunk && !sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1')
        window.location.reload()
      }
    } catch { /* */ }
  }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center" style={{ minHeight: '100vh' }}>
        <div className="font-display font-semibold text-[17px]">Что-то пошло не так</div>
        <div className="text-[13.5px] text-gray leading-relaxed max-w-[280px]">Экран не смог открыться. Обновите приложение — обычно этого достаточно.</div>
        <button className="btn-gold gold-metal sheen mt-2" style={{ minWidth: 180 }} onClick={() => window.location.reload()}><b>Обновить</b></button>
      </div>
    )
  }
}
