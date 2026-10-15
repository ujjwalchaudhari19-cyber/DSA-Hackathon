import React from "react"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppRoutes } from "./app/routes"
import { useAppStore } from "@/store/useAppStore"
import { useAuthStore } from "@/store/useAuthStore"
import { setApiToastListener } from "@/services/api"
import "@/i18n"
import "@/index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export function App() {
  const { theme } = useAppStore()
  const { initialize: initializeAuth } = useAuthStore()
  const [toastMsg, setToastMsg] = React.useState<{ text: string; type: 'info' | 'warning' | 'error' } | null>(null)

  React.useEffect(() => {
    // Setup api toast notification listener
    setApiToastListener((text, type) => {
      setToastMsg({ text, type })
      setTimeout(() => setToastMsg(null), 4000)
    })

    // Initialise auth from Firebase onAuthStateChanged
    const unsubscribe = initializeAuth()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [initializeAuth])

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {toastMsg && (
          <div className="fixed top-4 right-4 z-50 max-w-sm p-3.5 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 border bg-card text-foreground border-border animate-in fade-in slide-in-from-top-2">
            <span className={toastMsg.type === 'error' ? 'text-destructive' : toastMsg.type === 'warning' ? 'text-amber-500' : 'text-primary'}>
              •
            </span>
            <span>{toastMsg.text}</span>
          </div>
        )}
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
