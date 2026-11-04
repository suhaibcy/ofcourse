import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

const TOAST_MS = 2200 // matches the toast-life animation in motion.css

// Shows one short message at a time, so you know a save worked.
// A new message replaces the old one and restarts the timer.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)

  const show = useCallback((message: string) => setToast({ id: Date.now(), message }), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live: screen readers read the message out loud when it appears */}
      <div className="toast-area" aria-live="polite">
        {/* A new key makes React build a fresh element, which restarts the animation */}
        {toast && <div key={toast.id} className="toast">{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  )
}
