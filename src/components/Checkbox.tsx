import { useState } from 'react'

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string // read aloud by screen readers, e.g. "Mark Lab 5 quiz done"
}

// A round checkbox. The real <input> is invisible but covers the whole
// 44px tap area; the circle you see is the span next to it.
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  // Only play the "done" pop when you tap it, not every time a screen
  // opens with things already checked.
  const [tapped, setTapped] = useState(false)

  return (
    <label className={tapped ? 'check check--tapped' : 'check'}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          setTapped(true)
          // A tiny buzz on Android phones. iPhones don't let websites vibrate, so they skip it.
          if (event.target.checked) navigator.vibrate?.(10)
          onChange(event.target.checked)
        }}
        aria-label={label}
      />
      <span className="check__box" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {/* pathLength="1" lets the CSS "draw" the check from 0% to 100% */}
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
        </svg>
      </span>
    </label>
  )
}
