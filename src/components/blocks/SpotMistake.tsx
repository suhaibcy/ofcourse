import { useState } from 'react'
import type { SpotBlock } from '../../lib/course'
import { Button } from '../Button'
import type { BlockProps } from './blockTypes'

// A worked solution with one bad line. Tap the line where it first goes wrong.
export function SpotMistake({ block, onMiss, onFinish }: BlockProps<SpotBlock>) {
  const [wrong, setWrong] = useState<number[]>([])
  const [found, setFound] = useState(false)

  function tap(index: number) {
    if (index === block.wrongLine) {
      setFound(true)
    } else if (!wrong.includes(index)) {
      setWrong([...wrong, index])
      onMiss({
        question: `${block.problem}\nWhich line has the first mistake?\n${block.lines.join('\n')}`,
        selected: block.lines[index],
        correct: block.lines[block.wrongLine],
        feedback: 'That line holds up. Look for where the logic breaks.',
        reference: block.why,
        protect: block.lines.length - wrong.length - 1 > 1,
      })
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.problem}</p>
      <div className="choices">
        {block.lines.map((line, i) => (
          <button key={i} type="button" disabled={found || wrong.includes(i)} onClick={() => tap(i)}
            className={`choice choice--mono ${found && i === block.wrongLine ? 'choice--right' : ''} ${wrong.includes(i) ? 'choice--ok-line' : ''}`}>
            {line}
          </button>
        ))}
      </div>
      {wrong.length > 0 && !found && <p className="feedback feedback--wrong" role="status">That line holds up. Look for where the logic breaks.</p>}
      {found && <p className="feedback feedback--right" role="status">{block.why}</p>}
      {found && <Button block onClick={() => onFinish(wrong.length === 0)}>Finish</Button>}
    </div>
  )
}
