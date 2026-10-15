import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function prepareApp() {
  if (import.meta.env.VITE_USE_MOCKS === 'true' && typeof window !== 'undefined') {
    try {
      const { worker } = await import('./mocks/browser')
      await worker.start({
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      })
    } catch {
      // Continue without worker if browser service worker is unready
    }
  }
}

prepareApp().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
