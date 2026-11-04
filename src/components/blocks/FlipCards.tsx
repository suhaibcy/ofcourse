import { useEffect, useState } from 'react'
import type { FlipBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { Button } from '../Button'
import { shuffled, type BlockProps } from './blockTypes'

type Card = { id: string; pair: number; text: string }

// A memory game: flip two cards, and keep them if they belong together. Missing
// is part of how the game works, so only a lot of misses counts against mastery.
export function FlipCards({ block, onFinish }: BlockProps<FlipBlock>) {
  const [cards] = useState<Card[]>(() => shuffled(block.pairs.flatMap((pair, i) => [
    { id: `${i}a`, pair: i, text: pair.term },
    { id: `${i}b`, pair: i, text: pair.meaning },
  ])))
  const [up, setUp] = useState<string[]>([])
  const [found, setFound] = useState<number[]>([])
  const [misses, setMisses] = useState(0)

  // After two cards are up, keep a match or flip a miss back.
  useEffect(() => {
    if (up.length !== 2) return
    const [a, b] = up.map((id) => cards.find((c) => c.id === id) as Card)
    const isMatch = a.pair === b.pair
    const timer = setTimeout(() => {
      if (isMatch) {
        setFound((f) => [...f, a.pair])
        chime(found.length + 1 === block.pairs.length ? 'win' : 'right')
      } else {
        setMisses((m) => m + 1)
      }
      setUp([])
    }, isMatch ? 450 : 1000)
    return () => clearTimeout(timer)
  }, [up, cards, found.length, block.pairs.length])

  const solved = found.length === block.pairs.length
  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <div className="flip-grid">
        {cards.map((card) => {
          const isFound = found.includes(card.pair)
          const isUp = isFound || up.includes(card.id)
          return (
            <button key={card.id} type="button" className={`flip ${isUp ? 'flip--up' : ''} ${isFound ? 'flip--found' : ''}`}
              disabled={isUp || up.length === 2} aria-label={isUp ? card.text : 'Face-down card'}
              onClick={() => setUp([...up, card.id])}>
              <span className="flip__inner">
                <span className="flip__face flip__back" aria-hidden="true">?</span>
                <span className="flip__face flip__front">{card.text}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="sort-count" role="status">{found.length} of {block.pairs.length} pairs found</p>
      {solved && <Button block onClick={() => onFinish(misses <= block.pairs.length * 2)}>Finish</Button>}
    </div>
  )
}
