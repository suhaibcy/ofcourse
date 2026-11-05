import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Hoot } from '../components/Hoot'
import type { Block, Course } from '../lib/course'
import { masteryByConcept, type Progress } from '../lib/mastery'
import type { Attempt, LearningMemory } from '../lib/memory'
import type { MissDetail } from '../lib/tutor'
import { CoursePlayer } from './CoursePlayer'

export type PracticeSource = 'new' | 'saved' | 'fixit'
export type PracticeLoad = (conceptId: string, miss?: MissDetail) => Promise<{ blocks: Block[]; source: PracticeSource }>

type PracticeRunProps = {
  course: Course
  conceptId: string
  miss?: MissDetail
  progress: Progress
  memory: LearningMemory
  aiOn: boolean
  load: PracticeLoad
  onResult: (blockId: string, conceptId: string, firstTry: boolean) => void
  onAttempt: (attempt: Omit<Attempt, 'courseId' | 'at'>) => void
  onExit: () => void
}

const intros: Record<PracticeSource, string> = {
  new: 'New questions Hoot just wrote and checked.',
  saved: 'Practice Hoot wrote and checked earlier, saved for you.',
  fixit: "Hoot couldn't write new questions right now, so here's what you missed earlier.",
}

// Gets practice for one concept, then plays it in the normal player.
export function PracticeRun({ course, conceptId, miss, progress, memory, aiOn, load, onResult, onAttempt, onExit }: PracticeRunProps) {
  const [loaded, setLoaded] = useState<{ blocks: Block[]; source: PracticeSource } | null>(null)
  const started = useRef(false) // React runs effects twice in development; this must only spend one AI call
  const levelOf = () => masteryByConcept(course, progress).find((c) => c.id === conceptId)?.level
  const [startLevel] = useState(levelOf)
  const name = course.concepts.find((c) => c.id === conceptId)?.name ?? 'this idea'

  useEffect(() => {
    if (started.current) return
    started.current = true
    void load(conceptId, miss).then(setLoaded)
  }, [load, conceptId, miss])

  if (!loaded) {
    return (
      <div className="learn-gate">
        <Hoot pose="think" size={132} animate decorative />
        <h1 className="screen-title">Hoot is writing a new challenge</h1>
        <p className="muted">On {name}. Each one is checked before you see it, so this can take a little while.</p>
        <Button block variant="ghost" onClick={onExit}>Go back</Button>
      </div>
    )
  }

  if (loaded.blocks.length === 0) {
    return (
      <div className="learn-gate" role="status">
        <Hoot pose="oops" size={132} decorative />
        <h1 className="screen-title">No practice right now</h1>
        <p className="muted">Hoot couldn't write a question it trusted on {name}. Try again in a bit.</p>
        <Button block onClick={onExit}>Go back</Button>
      </div>
    )
  }

  const level = levelOf()
  return (
    <CoursePlayer title={`Practice: ${name}`} intro={intros[loaded.source]} blocks={loaded.blocks} isPractice aiOn={aiOn}
      course={course} progress={progress} memory={memory} onExit={onExit}
      doneNote={level !== startLevel ? `${name}: ${startLevel} to ${level}` : undefined}
      onResult={(blockId, firstTry) => onResult(blockId, conceptId, firstTry)} onAttempt={onAttempt} />
  )
}
