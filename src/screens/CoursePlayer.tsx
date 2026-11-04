import { useEffect, useState, type CSSProperties } from 'react'
import { BackHeader } from '../components/BackHeader'
import { CalcIt } from '../components/blocks/CalcIt'
import { CatchIt } from '../components/blocks/CatchIt'
import { CodeLab } from '../components/blocks/CodeLab'
import { FillBlanks } from '../components/blocks/FillBlanks'
import { FlipCards } from '../components/blocks/FlipCards'
import { MatchUp } from '../components/blocks/MatchUp'
import { SayAndFly } from '../components/blocks/SayAndFly'
import { ExplainBack } from '../components/blocks/ExplainBack'
import { PutInOrder } from '../components/blocks/PutInOrder'
import { Sandbox } from '../components/blocks/Sandbox'
import { SortIt } from '../components/blocks/SortIt'
import { SpotMistake } from '../components/blocks/SpotMistake'
import { StepThrough } from '../components/blocks/StepThrough'
import { Button } from '../components/Button'
import { Hoot, type HootPose, type HootReaction } from '../components/Hoot'
import type { Block } from '../lib/course'
import { starsFor } from '../lib/streak'

type PlayerProps = {
  title: string
  intro: string
  blocks: Block[]
  aiOn: boolean
  onResult: (blockId: string, firstTry: boolean) => void
  onExit: () => void
}

// The same burst as onboarding (the styles live in onboarding.css).
const confettiPieces = [
  { x: -118, y: -40, r: 200, c: 1 }, { x: -92, y: -70, r: -160, c: 3 }, { x: -48, y: -84, r: 240, c: 5 },
  { x: 0, y: -80, r: -220, c: 7 }, { x: 46, y: -84, r: 180, c: 2 }, { x: 90, y: -72, r: -240, c: 4 },
  { x: 120, y: -38, r: 160, c: 6 }, { x: -132, y: 0, r: -180, c: 4 }, { x: 134, y: 4, r: 220, c: 1 },
]

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {confettiPieces.map((p, i) => (
        <span key={i} className={i % 3 === 0 ? 'confetti__piece confetti__piece--dot' : 'confetti__piece'}
          style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, background: `var(--class-${p.c})` } as CSSProperties} />
      ))}
    </div>
  )
}

// Plays a list of blocks, one at a time. Used for lessons and for Fix it.
export function CoursePlayer({ title, intro, blocks, aiOn, onResult, onExit }: PlayerProps) {
  const [index, setIndex] = useState(0)
  const [reaction, setReaction] = useState<HootReaction | null>(null)
  const [pose, setPose] = useState<HootPose>('idle')
  const [rightCount, setRightCount] = useState(0)

  const finished = index >= blocks.length
  const block = blocks[index]

  const react = (name: HootReaction['name']) => setReaction((r) => ({ name, key: (r?.key ?? 0) + 1 }))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  function miss() {
    setPose('oops')
    react('shake')
    window.setTimeout(() => setPose((current) => (current === 'oops' ? 'idle' : current)), 1000) // he doesn't stay upset
  }

  function finish(firstTry: boolean) {
    onResult(block.id, firstTry)
    if (firstTry) setRightCount((n) => n + 1)
    const last = index === blocks.length - 1
    setPose(last ? 'celebrate' : 'idle')
    if (last) react('hop')
    else if (firstTry) react('nod')
    setIndex(index + 1)
  }

  if (finished) {
    const stars = starsFor(rightCount, blocks.length)
    return (
      <div className="lesson-done">
        <div className="lesson-done__hoot">
          <Hoot pose={pose} size={132} animate decorative reaction={reaction} />
          <Confetti />
        </div>
        <p className="stars" aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((n) => <span key={n} className={n <= stars ? 'star star--on' : 'star'} style={{ animationDelay: `${n * 150}ms` }}>★</span>)}
        </p>
        <h1 className="screen-title">Lesson done!</h1>
        <p className="muted">{rightCount} of {blocks.length} right on the first try.</p>
        <Button block onClick={onExit}>Back to the course</Button>
      </div>
    )
  }

  const shared = { onMiss: miss, onFinish: finish }
  return (
    <>
      <BackHeader title="" backLabel="Course" onBack={onExit} />
      <div className="lesson-progress" role="progressbar" aria-valuemin={0} aria-valuemax={blocks.length} aria-valuenow={index} aria-label="Lesson progress">
        <span style={{ transform: `scaleX(${index / blocks.length})` }} />
      </div>
      <div className="lesson-head">
        <Hoot pose={pose} size={56} animate decorative reaction={reaction} />
        <div>
          <h1 className="lesson-head__title">{title}</h1>
          {index === 0 && <p className="muted">{intro}</p>}
        </div>
      </div>
      {/* A new key resets the block's own state when moving to the next one. */}
      <div key={block.id} className="block-card">
        {block.type === 'step' && <StepThrough block={block} {...shared} />}
        {block.type === 'sandbox' && <Sandbox block={block} {...shared} />}
        {block.type === 'order' && <PutInOrder block={block} {...shared} />}
        {block.type === 'spot' && <SpotMistake block={block} {...shared} />}
        {block.type === 'sort' && <SortIt block={block} {...shared} />}
        {block.type === 'calc' && <CalcIt block={block} {...shared} />}
        {block.type === 'explain' && <ExplainBack block={block} aiOn={aiOn} {...shared} />}
        {block.type === 'voice' && <SayAndFly block={block} aiOn={aiOn} {...shared} />}
        {block.type === 'catch' && <CatchIt block={block} {...shared} />}
        {block.type === 'code' && <CodeLab block={block} {...shared} />}
        {block.type === 'match' && <MatchUp block={block} {...shared} />}
        {block.type === 'flip' && <FlipCards block={block} {...shared} />}
        {block.type === 'fill' && <FillBlanks block={block} {...shared} />}
      </div>
    </>
  )
}
