import { useState } from 'react'
import type { SortBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { Button } from '../Button'
import { shuffled, type BlockProps } from './blockTypes'
import { DragChip } from './DragChip'

// Drag each card into the group it belongs in (or just tap the group).
export function SortIt({ block, onMiss, onFinish }: BlockProps<SortBlock>) {
  const [items] = useState(() => shuffled(block.items))
  const [index, setIndex] = useState(0)
  const [placed, setPlaced] = useState<number[]>(() => block.buckets.map(() => 0))
  const [feedback, setFeedback] = useState<{ right: boolean; text: string } | null>(null)
  const [wrongBucket, setWrongBucket] = useState<number | null>(null)
  const [missed, setMissed] = useState(false)

  const item = items[index]
  const finished = index >= items.length

  function choose(bucket: number) {
    if (bucket === item.bucket) {
      chime('right')
      setFeedback({ right: true, text: item.why })
      setWrongBucket(null)
      setPlaced(placed.map((count, i) => (i === bucket ? count + 1 : count)))
      setIndex(index + 1)
    } else {
      chime('wrong')
      setFeedback({ right: false, text: `Not ${block.buckets[bucket]}. Look at it again.` })
      setWrongBucket(bucket)
      setMissed(true)
      onMiss()
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <div className="sort-stage">
        {finished
          ? <p className="sort-card sort-card--done">All sorted!</p>
          : <DragChip key={index} className="sort-card" onDrop={(zone) => choose(Number(zone))}>{item.text}</DragChip>}
      </div>
      <p className="sort-count">{finished ? `${items.length} of ${items.length}` : `Drag it, or tap a group. ${index + 1} of ${items.length}`}</p>
      <div className="sort-buckets">
        {block.buckets.map((bucket, i) => (
          <button key={bucket} type="button" data-drop={String(i)} disabled={finished} onClick={() => choose(i)}
            className={wrongBucket === i ? 'bucket choice--wobble' : 'bucket'}>
            <span>{bucket}</span>
            <span className="bucket__count" aria-label={`${placed[i]} sorted`}>{'●'.repeat(placed[i])}</span>
          </button>
        ))}
      </div>
      {feedback && <p className={feedback.right ? 'feedback feedback--right' : 'feedback feedback--wrong'} role="status">{feedback.text}</p>}
      {finished && <Button block onClick={() => { chime('win'); onFinish(!missed) }}>Finish</Button>}
    </div>
  )
}
