import { useState } from 'react'
import type { StepBlock } from '../../lib/course'
import { Button } from '../Button'
import type { BlockProps } from './blockTypes'

// Solve one decision at a time. Finished steps stay on screen, so the student
// can see the chain of logic build up. A hint is only offered after a wrong try.
export function StepThrough({ block, onMiss, onFinish }: BlockProps<StepBlock>) {
  const [stepIndex, setStepIndex] = useState(0)
  const [wrong, setWrong] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [missed, setMissed] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const step = block.steps[stepIndex]
  const correctIndex = step.choices.findIndex((c) => c.correct)
  const solved = picked === correctIndex

  function choose(index: number) {
    setPicked(index)
    if (index !== correctIndex && !wrong.includes(index)) {
      setWrong([...wrong, index])
      setMissed(true)
      onMiss()
    }
  }

  function next() {
    if (stepIndex === block.steps.length - 1) {
      onFinish(!missed)
      return
    }
    setStepIndex(stepIndex + 1)
    setWrong([])
    setPicked(null)
    setShowHint(false)
  }

  return (
    <div className="block">
      <p className="block__problem">{block.problem}</p>
      <ol className="logic-chain">
        {block.steps.slice(0, stepIndex).map((done, i) => (
          <li key={i}>{done.choices.find((c) => c.correct)?.text}</li>
        ))}
      </ol>
      <p className="block__prompt">{step.prompt}</p>
      <div className="choices">
        {step.choices.map((choice, i) => {
          const state = i === picked && solved ? 'choice--right' : wrong.includes(i) ? 'choice--wrong' : ''
          return (
            <button key={i} type="button" className={`choice ${state}`} disabled={solved || wrong.includes(i)} onClick={() => choose(i)}>
              {choice.text}
            </button>
          )
        })}
      </div>
      {picked !== null && <p className={solved ? 'feedback feedback--right' : 'feedback feedback--wrong'} role="status">{step.choices[picked].why}</p>}
      {wrong.length > 0 && !solved && block.hint && (
        showHint
          ? <p className="feedback">{block.hint}</p>
          : <Button variant="ghost" small onClick={() => setShowHint(true)}>Show a hint</Button>
      )}
      {solved && <Button block onClick={next}>{stepIndex === block.steps.length - 1 ? 'Finish' : 'Next step'}</Button>}
    </div>
  )
}
