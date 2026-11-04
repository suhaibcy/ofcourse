import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { useSheetClose } from '../lib/useSheetClose'

const suggestions = ['Plan my week', 'Explain an assignment', 'Quiz me for my midterm', 'Break a project into steps']

// The floating "Ask" button for the AI study coach. For now it opens a
// "coming soon" preview; the real chat is planned for v2.
export function AskButton() {
  const [open, setOpen] = useState(false)
  const { closing, close } = useSheetClose(() => setOpen(false))

  return (
    <>
      <button type="button" className="ask-fab" onClick={() => setOpen(true)} aria-label="Ask the study coach">
        <Icon name="ask" size={22} />
      </button>
      {open && (
        <BottomSheet title="Ask about your classes" onClose={close} closing={closing}>
          <p className="muted">
            A study coach that knows what's due. It will plan your week, explain what an assignment is asking,
            and quiz you before exams. It won't write work you turn in.
          </p>
          <div className="chips">
            {suggestions.map((text) => (
              <span key={text} className="chip chip--disabled">{text}</span>
            ))}
          </div>
          <div className="ask-input" aria-disabled="true">
            <span>Ask anything about your classes</span>
            <span className="tag">Coming soon</span>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
