import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

type BottomSheetProps = {
  title: string
  onClose: () => void // pass close() from useSheetClose so it slides away
  closing?: boolean // true while the slide-down plays
  children: ReactNode
}

// A panel that slides up from the bottom. Tap the dimmed area, the X,
// or press Escape to close it.
export function BottomSheet({ title, onClose, closing = false, children }: BottomSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={closing ? 'sheet-layer sheet-layer--closing' : 'sheet-layer'}>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
