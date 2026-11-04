import { useState } from 'react'

const CLOSE_MS = 200 // matches the sheet-down animation in screens.css

// Lets a bottom sheet slide away before it disappears.
// Call close() instead of onClose(): it marks the sheet as "closing"
// (which plays the slide-down), then calls onClose() so the parent
// removes it.
export function useSheetClose(onClose: () => void) {
  const [closing, setClosing] = useState(false)

  function close() {
    if (closing) return
    // With "reduce motion" on there's nothing to wait for.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false) // ready to open again (the Ask sheet stays mounted)
      onClose()
    }, CLOSE_MS)
  }

  return { closing, close }
}
