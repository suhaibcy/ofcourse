import { useState } from 'react'
import type { SortBlock } from '../../lib/course'
import { Button } from '../Button'
import { shuffled, type BlockProps } from './blockTypes'

// One item at a time: tap the group it belongs in.
export function SortIt({ block, onMiss, onFinish }: BlockProps<SortBlock>) {
  const [items] = useState(() => shuffled(block.items))
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ right: boolean; text: string } | null>(null)
  const [missed, setMissed] = useState(false)

  const item = items[index]
  const answered = feedback?.right === true
  const isLast = index === items.length - 1

  function choose(bucket: number) {
    if (bucket === item.bucket) {
      setFeedback({ right: true, text: item.why })
    } else {
      setFeedback({ right: false, text: 'Not that one. Look at it again.' })
      setMissed(true)
      onMiss()
    }
  }

  function next() {
    if (isLast) {
      onFinish(!missed)
      return
    }
    setIndex(index + 1)
    setFeedback(null)
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <p className="sort-card" key={index}>{item.text}</p>
      <p className="sort-count">{index + 1} of {items.length}</p>
      <div className="sort-buckets">
        {block.buckets.map((bucket, i) => (
          <button key={bucket} type="button" className="choice choice--center" disabled={answered} onClick={() => choose(i)}>{bucket}</button>
        ))}
      </div>
      {feedback && <p className={feedback.right ? 'feedback feedback--right' : 'feedback feedback--wrong'} role="status">{feedback.text}</p>}
      {answered && <Button block onClick={next}>{isLast ? 'Finish' : 'Next'}</Button>}
    </div>
  )
}
