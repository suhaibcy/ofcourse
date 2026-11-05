import { useState } from 'react'
import type { MatchBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { Button } from '../Button'
import { shuffled, type BlockProps } from './blockTypes'
import { DragChip } from './DragChip'

// Drag each term onto its meaning. Or tap a term, then tap the meaning.
export function MatchUp({ block, onMiss, onFinish }: BlockProps<MatchBlock>) {
  const [terms] = useState(() => shuffled(block.pairs.map((_, i) => i)))
  const [meanings] = useState(() => shuffled(block.pairs.map((_, i) => i)))
  const [done, setDone] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [missed, setMissed] = useState(false)

  function attempt(term: number, meaning: number) {
    setSelected(null)
    if (term === meaning) {
      setWrong(null)
      setDone([...done, term])
      chime(done.length + 1 === block.pairs.length ? 'win' : 'right')
    } else {
      setWrong(meaning)
      setMissed(true)
      chime('wrong')
      onMiss({
        question: `${block.prompt}\nTerm: ${block.pairs[term].term}`,
        selected: block.pairs[meaning].meaning,
        correct: block.pairs[term].meaning,
        feedback: 'Not a match. Try another.',
        protect: block.pairs.length - done.length > 2,
      })
    }
  }

  const solved = done.length === block.pairs.length
  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      {!solved && (
        <div className="chip-bank">
          {terms.filter((t) => !done.includes(t)).map((t) => (
            <DragChip key={t} selected={selected === t} onTap={() => setSelected(selected === t ? null : t)}
              onDrop={(zone) => attempt(t, Number(zone))}>
              {block.pairs[t].term}
            </DragChip>
          ))}
        </div>
      )}
      <div className="match-zones">
        {meanings.map((m) => {
          const matched = done.includes(m)
          return (
            <button key={m} type="button" data-drop={String(m)} disabled={matched}
              className={`match-zone ${matched ? 'match-zone--done' : ''} ${wrong === m ? 'choice--wobble' : ''}`}
              onClick={() => { if (selected !== null) attempt(selected, m) }}>
              {matched && <strong>{block.pairs[m].term}</strong>}
              <span>{block.pairs[m].meaning}</span>
            </button>
          )
        })}
      </div>
      {!solved && <p className="sort-count">{selected === null ? 'Drag a word onto its meaning, or tap one' : 'Now tap its meaning'}</p>}
      {wrong !== null && !solved && <p className="feedback feedback--wrong" role="status">Not a match. Try another.</p>}
      {solved && <Button block onClick={() => onFinish(!missed)}>Finish</Button>}
    </div>
  )
}
