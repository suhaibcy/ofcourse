import { motion } from 'motion/react'
import { useState } from 'react'
import type { OrderBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { Button } from '../Button'
import { Hoot, type HootPose, type HootReaction } from '../Hoot'
import { shuffled, type BlockProps } from './blockTypes'

// Build the bridge: tap the steps in order. Each right step lays a plank and
// Hoot walks across it. A wrong one wobbles the bridge, and he stays put.
export function PutInOrder({ block, onMiss, onFinish }: BlockProps<OrderBlock>) {
  const [options] = useState(() => shuffled(block.items))
  const [placed, setPlaced] = useState(0)
  const [wrong, setWrong] = useState<string | null>(null)
  const [missed, setMissed] = useState(false)
  const [pose, setPose] = useState<HootPose>('look')
  const [reaction, setReaction] = useState<HootReaction | null>(null)

  const total = block.items.length
  const solved = placed === total
  const react = (name: HootReaction['name']) => setReaction((r) => ({ name, key: (r?.key ?? 0) + 1 }))

  function choose(item: string) {
    if (item === block.items[placed]) {
      setPlaced(placed + 1)
      setWrong(null)
      setPose(placed + 1 === total ? 'celebrate' : 'look')
      react('hop')
      chime(placed + 1 === total ? 'win' : 'right')
    } else {
      setWrong(item)
      setMissed(true)
      setPose('oops')
      react('shake')
      chime('wrong')
      onMiss()
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <div className="bridge" role="img" aria-label={`Bridge: ${placed} of ${total} planks built`}>
        <span className="bridge__cliff bridge__cliff--left" />
        <span className="bridge__cliff bridge__cliff--right" />
        <div className="bridge__planks">
          {block.items.map((_, i) => (
            <span key={i} className={i < placed ? 'bridge__plank bridge__plank--on' : 'bridge__plank'} />
          ))}
        </div>
        <motion.div className="bridge__hoot" initial={false} animate={{ left: `${8 + (placed / total) * 76}%` }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}>
          <Hoot pose={pose} size={52} decorative reaction={reaction} />
        </motion.div>
      </div>

      {placed > 0 && (
        <ol className="logic-chain">
          {block.items.slice(0, placed).map((item) => <li key={item}>{item}</li>)}
        </ol>
      )}

      {solved ? (
        <>
          <p className="feedback feedback--right" role="status">Hoot made it across! {block.explain}</p>
          <Button block onClick={() => onFinish(!missed)}>Finish</Button>
        </>
      ) : (
        <>
          <p className="sort-count">What comes next?</p>
          <div className="choices">
            {options.filter((item) => !block.items.slice(0, placed).includes(item)).map((item) => (
              <button key={item} type="button" onClick={() => choose(item)}
                className={wrong === item ? 'choice choice--wobble' : 'choice'}>{item}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
