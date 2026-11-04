import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppDataProvider } from './state/AppData.tsx'
import { ToastProvider } from './state/Toast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppDataProvider>
  </StrictMode>,
)
