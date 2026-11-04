import type { ReactNode } from 'react'
import { Icon } from './Icon'

type BackHeaderProps = {
  title: string
  onBack: () => void
  backLabel?: string // text next to the arrow, default "Back"
  action?: ReactNode // e.g. a "+ New" button on the right
}

// The top of a page inside More: a back arrow, the title, and an optional action.
export function BackHeader({ title, onBack, action, backLabel = 'Back' }: BackHeaderProps) {
  return (
    <div className="back-head">
      <button type="button" className="back-head__back" onClick={onBack}>
        <Icon name="back" size={20} />
        <span>{backLabel}</span>
      </button>
      <div className="screen-head">
        <h1 className="screen-title">{title}</h1>
        {action}
      </div>
    </div>
  )
}
