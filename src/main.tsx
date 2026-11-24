import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import { AuthBridge, authEnabled } from './components/Account'
import { ToastProvider } from './components/Toast'
import './styles.css'

const app = (
  <BrowserRouter>
    <ToastProvider>
      <App />
    </ToastProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {authEnabled ? (
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <AuthBridge />
        {app}
      </ClerkProvider>
    ) : (
      app
    )}
  </StrictMode>,
)
