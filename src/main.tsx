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
  tg?.setHeaderColor?.('#07080A'); tg?.setBackgroundColor?.('#07080A'); tg?.setBottomBarColor?.('#07080A')
} catch { /* старый клиент */ }
startCloudSync()
startHScroll()
window.addEventListener('load', () => { try { sessionStorage.removeItem('chunk_reload') } catch { /* */ } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>
)
