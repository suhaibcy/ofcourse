import { useEffect, useRef, useState } from 'react'
import type { CatchBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { shuffled, type BlockProps } from './blockTypes'
import { Button } from '../Button'
import { Hoot, type HootPose } from '../Hoot'

const START_HEARTS = 3
const FALL_SECONDS = 4.2
const SPAWN_SECONDS = 1.7
const CATCH_LINE = 0.8 // how far down Hoot's wings reach
const CATCH_WIDTH = 0.24

type Falling = { key: number; itemIndex: number; x: number; y: number; el: HTMLDivElement | null }

// Slide Hoot under the right answers and dodge the wrong ones. Everything falls
// slowly enough to read. A wrong catch explains why.
export function CatchIt({ block, onMiss, onFinish }: BlockProps<CatchBlock>) {
  const goal = block.items.filter((item) => item.good).length
  const [score, setScore] = useState(0)
  const [hearts, setHearts] = useState(START_HEARTS)
  const [pose, setPose] = useState<HootPose>('look')
  const [note, setNote] = useState(block.prompt)
  const [round, setRound] = useState(0)
  const [falling, setFalling] = useState<{ key: number; itemIndex: number; x: number }[]>([])
  const arena = useRef<HTMLDivElement>(null)
  const hootEl = useRef<HTMLDivElement>(null)
  const hootX = useRef(0.5)
  const missedRef = useRef(false)
  const els = useRef(new Map<number, HTMLDivElement>())

  const won = score >= goal
  const lost = hearts <= 0

  function moveHoot(clientX: number) {
    const box = arena.current?.getBoundingClientRect()
    if (!box) return
    hootX.current = Math.min(0.9, Math.max(0.1, (clientX - box.left) / box.width))
    if (hootEl.current) hootEl.current.style.left = `${hootX.current * 100}%`
  }

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let nextKey = 0
    let spawnIn = 0.2
    let queue = shuffled(block.items.map((_, i) => i))
    const caught = new Set<number>()
    let items: Falling[] = []
    let finished = false

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      spawnIn -= dt
      if (spawnIn <= 0 && items.length < 3) {
        if (queue.length === 0) queue = shuffled(block.items.map((_, i) => i).filter((i) => !caught.has(i)))
        const itemIndex = queue.shift()
        if (itemIndex !== undefined) {
          items.push({ key: nextKey++, itemIndex, x: 0.2 + Math.random() * 0.6, y: 0, el: null })
          setFalling(items.map(({ key, itemIndex: index, x }) => ({ key, itemIndex: index, x })))
        }
        spawnIn = SPAWN_SECONDS
      }
      const gone: number[] = []
      for (const piece of items) {
        const before = piece.y
        piece.y += dt / FALL_SECONDS
        const el = els.current.get(piece.key)
        if (el) el.style.top = `${piece.y * 100}%`
        if (before < CATCH_LINE && piece.y >= CATCH_LINE && Math.abs(piece.x - hootX.current) < CATCH_WIDTH) {
          gone.push(piece.key)
          const item = block.items[piece.itemIndex]
          if (item.good) {
            caught.add(piece.itemIndex)
            chime('right')
            setPose('celebrate')
            setNote(`Yes! ${item.why}`)
            setScore((s) => s + 1)
          } else {
            chime('wrong')
            missedRef.current = true
            onMiss()
            setPose('oops')
            setNote(`Not that one. ${item.why}`)
            setHearts((h) => h - 1)
          }
        } else if (piece.y > 1.05) {
          gone.push(piece.key)
        }
      }
      if (gone.length > 0) {
        items = items.filter((piece) => !gone.includes(piece.key))
        setFalling(items.map(({ key, itemIndex, x }) => ({ key, itemIndex, x })))
      }
      if (!finished) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      finished = true
      cancelAnimationFrame(frame)
    }
  // onMiss changes each render; the game restarts only for a new round.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.items, round])

  if (won) {
    return (
      <div className="block block--center">
        <Hoot pose="celebrate" size={108} animate decorative />
        <p className="block__prompt">You caught them all!</p>
        <p className="muted">{note}</p>
        <Button block onClick={() => { chime('win'); onFinish(!missedRef.current) }}>Finish</Button>
      </div>
    )
  }

  if (lost) {
    return (
      <div className="block block--center">
        <Hoot pose="oops" size={108} animate decorative />
        <p className="block__prompt">Out of hearts. Hoot wants another go!</p>
        <p className="muted">{note}</p>
        <Button block onClick={() => { setHearts(START_HEARTS); setScore(0); setPose('look'); setNote(block.prompt); setFalling([]); setRound(round + 1) }}>Play again</Button>
      </div>
    )
  }

  return (
    <div className="block">
      <p className="catch-status">
        <span aria-label={`${hearts} hearts left`}>{'♥'.repeat(hearts)}<span className="catch-status__lost">{'♥'.repeat(START_HEARTS - hearts)}</span></span>
        <strong>{score} of {goal}</strong>
      </p>
      <div ref={arena} className="catch-arena" onPointerDown={(e) => moveHoot(e.clientX)} onPointerMove={(e) => moveHoot(e.clientX)}>
        {falling.map((piece) => (
          <div key={piece.key} ref={(el) => { if (el) els.current.set(piece.key, el); else els.current.delete(piece.key) }}
            className="catch-item" style={{ left: `${piece.x * 100}%` }}>
            {block.items[piece.itemIndex].text}
          </div>
        ))}
        <div ref={hootEl} className="catch-hoot" style={{ left: '50%' }}><Hoot pose={pose} size={72} decorative /></div>
      </div>
      <p className="feedback" role="status">{note}</p>
      <p className="sort-count">Drag anywhere to move Hoot</p>
    </div>
  )
}
