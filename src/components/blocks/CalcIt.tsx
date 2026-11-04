import { useState } from 'react'
import type { CalcBlock } from '../../lib/course'
import { evaluate } from '../../lib/formula'
import { Button } from '../Button'
import type { BlockProps } from './blockTypes'

// Type a number. The right answer comes from running the formula, so an AI
// arithmetic slip can't teach the wrong result.
export function CalcIt({ block, onMiss, onFinish }: BlockProps<CalcBlock>) {
  const [text, setText] = useState('')
  const [misses, setMisses] = useState(0)
  const [state, setState] = useState<'typing' | 'wrong' | 'right' | 'revealed'>('typing')

  const answer = evaluate(block.formula, block.values) ?? 0
  const finished = state === 'right' || state === 'revealed'

  function check() {
    const typed = Number(text.replace(/[,\s]/g, '').replace('−', '-'))
    if (text.trim() && Number.isFinite(typed) && Math.abs(typed - answer) <= block.tolerance) {
      setState('right')
    } else {
      setMisses(misses + 1)
      setState('wrong')
      onMiss()
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <input className="input" inputMode="text" aria-label="Your answer" placeholder="Your answer" value={text} disabled={finished}
        onChange={(e) => { setText(e.target.value); if (state === 'wrong') setState('typing') }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !finished) check() }} />
      {state === 'wrong' && <p className="feedback feedback--wrong" role="status">Not quite. Check each part and try again.</p>}
      {finished && <p className={state === 'right' ? 'feedback feedback--right' : 'feedback'} role="status">The answer is {answer}. {block.explain}</p>}
      {finished
        ? <Button block onClick={() => onFinish(misses === 0)}>Finish</Button>
        : <Button block onClick={check}>Check</Button>}
      {misses >= 2 && !finished && <Button variant="ghost" small onClick={() => setState('revealed')}>Show the answer</Button>}
    </div>
  )
}
