import './styles.css'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { ApiError } from './lib/api'
import { keys } from './lib/queries'
import { usePrefs } from './lib/settings'

// A 401 anywhere means the session ended: drop back to the login screen.
const onError = (error: unknown) => {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(keys.me, { authenticated: false })
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

function ThemedToaster() {
  const { theme } = usePrefs()
  return (
    <Toaster
      dir="rtl"
      position="top-center"
      theme={theme}
      toastOptions={{
        className: '!rounded-2xl !border-line-2 !font-sans !text-[14px]',
        style: { background: 'var(--surface-2)', color: 'var(--ink)' },
      }}
      offset={{ top: 'max(env(safe-area-inset-top), 12px)' }}
    />
  )
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ThemedToaster />
    </QueryClientProvider>
  </StrictMode>,
)
