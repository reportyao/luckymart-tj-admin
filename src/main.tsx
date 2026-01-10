import { StrictMode } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { createRoot } from 'react-dom/client'
import './i18n/config'
import './index.css'
import App from './App'
import { setupGlobalErrorHandlers } from './utils/errorHandlers'
import { SupabaseProvider } from './contexts/SupabaseContext'

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
// Build timestamp: 1768071821
