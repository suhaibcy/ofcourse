import { createContext, useContext } from 'react'

// showToast("Planned for Thursday") pops up a short message at the bottom.
export const ToastContext = createContext<(message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}
