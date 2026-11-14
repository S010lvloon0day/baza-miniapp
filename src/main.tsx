import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { startCloudSync } from './store/cloudSync'
import { startHScroll } from './store/hscroll'

// Шапка и фон окна Telegram — в цвет приложения
try {
  const tg = (window as any).Telegram?.WebApp
  tg?.setHeaderColor?.('#08100D'); tg?.setBackgroundColor?.('#08100D'); tg?.setBottomBarColor?.('#08100D')
} catch { /* старый клиент */ }
startCloudSync()
startHScroll()
window.addEventListener('load', () => { try { sessionStorage.removeItem('chunk_reload') } catch { /* */ } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>
)
