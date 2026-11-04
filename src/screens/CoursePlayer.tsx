import { useEffect, useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { CalcIt } from '../components/blocks/CalcIt'
import { ExplainBack } from '../components/blocks/ExplainBack'
import { PutInOrder } from '../components/blocks/PutInOrder'
import { Sandbox } from '../components/blocks/Sandbox'
import { SortIt } from '../components/blocks/SortIt'
import { SpotMistake } from '../components/blocks/SpotMistake'
import { StepThrough } from '../components/blocks/StepThrough'
import { Button } from '../components/Button'
import { Hoot, type HootPose, type HootReaction } from '../components/Hoot'
import type { Block } from '../lib/course'

type PlayerProps = {
  title: string
  intro: string
  blocks: Block[]
  aiOn: boolean
  onResult: (blockId: string, firstTry: boolean) => void
  onExit: () => void
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
    return (
      <div className="lesson-done">
        <Hoot pose={pose} size={132} animate decorative reaction={reaction} />
        <h1 className="screen-title">Lesson done</h1>
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
      </div>
    </>
  )
}
