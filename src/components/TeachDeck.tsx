import { useEffect, useState } from 'react'
import type { TeachCard } from '../lib/course'
import { chime, speak } from '../lib/mic'
import type { MissDetail, TutorRequest } from '../lib/tutor'
import { Button } from './Button'
import { CurveGraph } from './CurveGraph'
import { Icon } from './Icon'
import { TutorPanel } from './TutorPanel'

// What Hoot reads aloud for a card.
function spokenText(card: TeachCard): string {
  switch (card.type) {
    case 'read': return `${card.heading}. ${card.body}`
    case 'example': return `Let's work through it. ${card.problem}`
    case 'explore': return card.prompt
    case 'check': return card.question
    case 'compare': return card.rows.map((row) => `${row.label}. ${card.columns[0]}: ${row.left}. ${card.columns[1]}: ${row.right}.`).join(' ')
    case 'remember': return `Remember this. ${card.points.join('. ')}`
  }
}

// A worked example, one tap per step, so the student thinks before seeing the next move.
function ExampleCard({ card, onReady }: { card: Extract<TeachCard, { type: 'example' }>; onReady: () => void }) {
  const [shown, setShown] = useState(1)
  const all = shown >= card.steps.length
  return (
    <>
      <p className="teach__eyebrow">Worked example</p>
      <p className="block__problem">{card.problem}</p>
      <ol className="worked">
        {card.steps.slice(0, shown).map((step, i) => (
          <li key={i} className="worked__step">
            <strong>{step.step}</strong>
            <span className="muted">{step.why}</span>
          </li>
        ))}
      </ol>
      {!all && <Button block variant="secondary" onClick={() => { const next = shown + 1; setShown(next); if (next >= card.steps.length) onReady() }}>Show the next step</Button>}
    </>
  )
}

function ExploreCard({ card, onReady }: { card: Extract<TeachCard, { type: 'explore' }>; onReady: () => void }) {
  const [values, setValues] = useState(() => Object.fromEntries(card.sliders.map((s) => [s.name, s.value])))
  const [moved, setMoved] = useState(false)
  return (
    <>
      <p className="teach__eyebrow">Try it yourself</p>
      <p className="block__prompt">{card.prompt}</p>
      <CurveGraph formula={card.formula} values={values} xRange={card.xRange} yRange={card.yRange} />
      <div className="sliders">
        {card.sliders.map((slider) => (
          <label key={slider.name} className="slider">
            <span className="slider__label">{slider.label}<strong>{values[slider.name]}</strong></span>
            <input type="range" min={slider.min} max={slider.max} step={slider.step} value={values[slider.name]}
              onChange={(e) => { setValues({ ...values, [slider.name]: Number(e.target.value) }); setMoved(true); onReady() }} />
          </label>
        ))}
      </div>
      {moved && <p className="feedback" role="status">{card.notice}</p>}
    </>
  )
}

// A quick check on what was just taught. It isn't graded, so a wrong tap only teaches.
function CheckCard({ card, onReady, onMiss }: { card: Extract<TeachCard, { type: 'check' }>; onReady: () => void; onMiss: (miss: MissDetail) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const right = picked !== null && card.choices[picked].correct
  return (
    <>
      <p className="teach__eyebrow">Quick check, not graded</p>
      <p className="block__prompt">{card.question}</p>
      <div className="choices">
        {card.choices.map((choice, i) => (
          <button key={i} type="button" disabled={right}
            className={`choice ${i === picked ? (choice.correct ? 'choice--right' : 'choice--wrong') : ''}`}
            onClick={() => {
              setPicked(i)
              chime(choice.correct ? 'right' : 'wrong')
              if (choice.correct) { onReady(); return }
              const answer = card.choices.find((c) => c.correct)
              onMiss({ question: card.question, selected: choice.text, correct: answer?.text ?? '', feedback: choice.why, reference: answer?.why, protect: card.choices.length > 2 })
            }}>
            {choice.text}
          </button>
        ))}
      </div>
      {picked !== null && <p className={right ? 'feedback feedback--right' : 'feedback feedback--wrong'} role="status">{card.choices[picked].why}</p>}
    </>
  )
}

type TeachDeckProps = {
  cards: TeachCard[]
  onDone: () => void
  // Only given when the AI is on. Without them, no help buttons appear.
  askAboutCard?: (card: TeachCard, ask: string) => TutorRequest
  askAboutMiss?: (miss: MissDetail) => TutorRequest
  onCheckMiss?: (miss: MissDetail) => void
  onTutorAsk?: () => void
}

// The teaching part of a lesson, one idea per screen. Examples and checks ask the
// student to do something first, so they can't just tap through without reading.
export function TeachDeck({ cards, onDone, askAboutCard, askAboutMiss, onCheckMiss, onTutorAsk }: TeachDeckProps) {
  const [index, setIndex] = useState(0)
  const card = cards[index]
  const needsAction = card.type === 'example' || card.type === 'check'
  const [readyFor, setReadyFor] = useState(-1)
  const [miss, setMiss] = useState<{ detail: MissDetail; count: number; card: number } | null>(null)
  const ready = !needsAction || readyFor === index
  const isLast = index === cards.length - 1

  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])

  function go(next: number) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    window.scrollTo(0, 0)
    setIndex(next)
  }

  return (
    <div className="block teach" key={index}>
      <div className="teach__top">
        <span className="sort-count">Learn {index + 1} of {cards.length}</span>
        <button type="button" className="teach__listen" onClick={() => speak(spokenText(card), 0.95)}>
          <Icon name="ask" size={16} /> Read to me
        </button>
      </div>

      {card.type === 'read' && (
        <>
          <h2 className="teach__heading">{card.heading}</h2>
          {card.body.split('\n').filter(Boolean).map((paragraph, i) => <p key={i} className="teach__body">{paragraph}</p>)}
        </>
      )}
      {card.type === 'example' && <ExampleCard card={card} onReady={() => setReadyFor(index)} />}
      {card.type === 'explore' && <ExploreCard card={card} onReady={() => setReadyFor(index)} />}
      {card.type === 'check' && <CheckCard card={card} onReady={() => setReadyFor(index)} onMiss={(detail) => { onCheckMiss?.(detail); setMiss((m) => ({ detail, count: (m?.count ?? 0) + 1, card: index })) }} />}
      {card.type === 'compare' && (
        <>
          <h2 className="teach__heading">{card.heading}</h2>
          <div className="compare" role="table">
            <div className="compare__row compare__row--head" role="row">
              <span role="columnheader" aria-label="Topic" />
              <strong role="columnheader">{card.columns[0]}</strong>
              <strong role="columnheader">{card.columns[1]}</strong>
            </div>
            {card.rows.map((row) => (
              <div key={row.label} className="compare__row" role="row">
                <strong role="rowheader">{row.label}</strong>
                <span role="cell">{row.left}</span>
                <span role="cell">{row.right}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {card.type === 'remember' && (
        <>
          <h2 className="teach__heading">Remember this</h2>
          <ul className="remember">{card.points.map((point) => <li key={point}><Icon name="check" size={18} /><span>{point}</span></li>)}</ul>
        </>
      )}

      {askAboutMiss && miss?.card === index && (
        <TutorPanel key={miss.count} label="Hoot, why was that wrong?" fallback={miss.detail.feedback} onAsk={onTutorAsk} build={() => askAboutMiss(miss.detail)} />
      )}
      {askAboutCard && <TutorPanel key={`card-${index}`} label="Ask Hoot about this lesson" allowQuestion onAsk={onTutorAsk} build={(ask) => askAboutCard(card, ask)} />}

      <div className="teach__nav">
        {index > 0 && <Button variant="secondary" onClick={() => go(index - 1)}>Back</Button>}
        <Button disabled={!ready} onClick={() => (isLast ? onDone() : go(index + 1))}>{isLast ? 'Start practicing' : 'Next'}</Button>
      </div>
    </div>
  )
}
