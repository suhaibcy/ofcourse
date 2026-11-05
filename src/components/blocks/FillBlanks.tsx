import { Fragment, useState } from 'react'
import type { FillBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { Button } from '../Button'
import { shuffled, type BlockProps } from './blockTypes'
import { DragChip } from './DragChip'

// Drag words into the sentence's blanks. Tapping a word puts it in the next blank.
export function FillBlanks({ block, onMiss, onFinish }: BlockProps<FillBlock>) {
  const [bank] = useState(() => shuffled([...block.answers, ...block.extras]))
  const [filled, setFilled] = useState(0)
  const [wrong, setWrong] = useState<string | null>(null)
  const [missed, setMissed] = useState(false)

  const parts = block.sentence.split('___')
  const solved = filled === block.answers.length

  // Blanks fill in order, so a word only fits the current one.
  function place(word: string) {
    if (word === block.answers[filled]) {
      setFilled(filled + 1)
      setWrong(null)
      chime(filled + 1 === block.answers.length ? 'win' : 'right')
    } else {
      setWrong(word)
      setMissed(true)
      chime('wrong')
      onMiss({
        question: `${block.prompt}\n${block.sentence}`,
        selected: word,
        correct: block.answers[filled],
        feedback: `"${word}" doesn't fit there. Read the sentence again.`,
        reference: block.explain,
        protect: true,
      })
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <p className="fill-sentence">
        {parts.map((part, i) => (
          <Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span data-drop="blank" className={i < filled ? 'blank blank--done' : i === filled ? 'blank blank--next' : 'blank'}>
                {i < filled ? block.answers[i] : ' '}
              </span>
            )}
          </Fragment>
        ))}
      </p>
      {!solved && (
        <div className="chip-bank">
          {bank.filter((word) => !block.answers.slice(0, filled).includes(word)).map((word) => (
            <DragChip key={word} className={wrong === word ? 'choice--wobble' : ''} onTap={() => place(word)} onDrop={() => place(word)}>{word}</DragChip>
          ))}
        </div>
      )}
      {wrong && !solved && <p className="feedback feedback--wrong" role="status">"{wrong}" doesn't fit there. Read the sentence again.</p>}
      {solved && <p className="feedback feedback--right" role="status">{block.explain}</p>}
      {solved && <Button block onClick={() => onFinish(!missed)}>Finish</Button>}
    </div>
  )
}
