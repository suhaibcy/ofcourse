import type { NextStep, Noticed } from '../lib/memory'
import { Button } from './Button'
import { Hoot } from './Hoot'

type HootNoticedProps = {
  notes: Noticed
  next: NextStep
  nextLabel?: string // no label means there's nothing to tap: for example, "revisit tomorrow"
  onNext: () => void
  aiOn: boolean
  onPractice: (conceptId: string) => void
}

// What the learner's recorded results show. Everything comes from the device's log.
export function HootNoticed({ notes, next, nextLabel, onNext, aiOn, onPractice }: HootNoticedProps) {
  return (
    <section className="noticed" aria-label="What Hoot has noticed">
      <div className="noticed__head">
        <Hoot pose="look" size={56} decorative />
        <div>
          <h2 className="noticed__title">What Hoot has noticed</h2>
          <p className="muted">From your results on this device.</p>
        </div>
      </div>

      <div className="noticed__next">
        <span className="tutor__label">Next step</span>
        <p>{next.text}</p>
        {nextLabel && <Button small onClick={onNext}>{nextLabel}</Button>}
      </div>

      {notes.strong.length > 0 && (
        <div className="noticed__group">
          <span className="tutor__label noticed__label--strong">Going well</span>
          <ul className="noticed__chips">{notes.strong.map((name) => <li key={name} className="noticed__chip noticed__chip--strong">{name}</li>)}</ul>
        </div>
      )}

      {notes.needsPractice.length > 0 && (
        <div className="noticed__group">
          <span className="tutor__label noticed__label--weak">Needs practice</span>
          <ul className="noticed__rows">
            {notes.needsPractice.map((concept) => (
              <li key={concept.id} className="noticed__row">
                <span>{concept.name}</span>
                {aiOn && <Button small variant="secondary" onClick={() => onPractice(concept.id)}>Practice this</Button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.recent.length > 0 && (
        <div className="noticed__group">
          <span className="tutor__label">Recent mix-ups</span>
          <ul className="noticed__recent">
            {notes.recent.map((item) => <li key={item.key}>{item.concept && <strong>{item.concept}: </strong>}{item.text}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
