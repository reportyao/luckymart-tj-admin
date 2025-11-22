import { StrictMode } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { createRoot } from 'react-dom/client'
import './i18n/config'
import './index.css'
import App from './App'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { setupGlobalErrorHandlers } from './utils/errorHandlers'

setupGlobalErrorHandlers()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <SupabaseProvider>
        <App />
      </SupabaseProvider>
    </ErrorBoundary>
  </StrictMode>,
)
