import { useEffect, useRef, useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Button } from '../components/Button'
import { Hoot } from '../components/Hoot'
import { Icon } from '../components/Icon'
import { sampleCourse } from '../data/sampleCourse'
import type { Block, Course } from '../lib/course'
import { aiAvailable, buildCourse, type BuildStage } from '../lib/courseClient'
import { lessonDone, masteryByConcept, missedBlocks, recordFix, recordResult, type Progress } from '../lib/mastery'
import { shrinkImage } from '../lib/shrinkImage'
import { newId, useStoredState } from '../lib/useStoredState'
import { useAppData, type Note } from '../state/appDataContext'
import { CoursePlayer } from './CoursePlayer'

const MAX_PHOTOS = 5

type View =
  | { name: 'home' }
  | { name: 'add' }
  | { name: 'building'; stage: BuildStage }
  | { name: 'course'; courseId: string }
  | { name: 'lesson'; courseId: string; lessonId: string }
  | { name: 'fix'; courseId: string; blocks: Block[] }

const stages: { id: BuildStage; label: string }[] = [
  { id: 'reading', label: 'Reading your coursework' },
  { id: 'designing', label: 'Designing your lessons' },
  { id: 'checking', label: 'Checking every answer' },
]

function noteText(note: Note): string {
  return note.lines.map((line) => line.text).join('\n')
}

// Turn coursework into an interactive course: add it, watch Hoot build, then play.
export function LearnScreen({ noteId, onExit }: { noteId?: string; onExit: () => void }) {
  const { notes } = useAppData()
  const [adult, setAdult] = useStoredState('learn-adult-ok', false)
  const [courses, setCourses] = useStoredState<Course[]>('courses-v1', [])
  const [progress, setProgress] = useStoredState<Record<string, Progress>>('course-progress-v1', {})
  const [aiOn, setAiOn] = useState(false)
  const [view, setView] = useState<View>(noteId ? { name: 'add' } : { name: 'home' })
  const [photos, setPhotos] = useState<string[]>([])
  const [text, setText] = useState(() => {
    const note = notes.find((n) => n.id === noteId)
    return note ? noteText(note) : ''
  })
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => { void aiAvailable().then(setAiOn) }, [])

  const allCourses = [...courses, sampleCourse]
  const courseFor = (id: string) => allCourses.find((c) => c.id === id)

  if (!adult) {
    return (
      <div className="learn-gate">
        <Hoot pose="hello" size={132} animate decorative />
        <h1 className="screen-title">Turn your coursework into a course</h1>
        <p className="muted">Take a photo of your notes or practice work. Hoot builds interactive lessons from it, then checks every answer.</p>
        <p className="muted">This feature is for students 18 and older.</p>
        <Button block onClick={() => setAdult(true)}>I'm 18 or older</Button>
        <Button block variant="ghost" onClick={onExit}>Not now</Button>
      </div>
    )
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return
    setError('')
    try {
      const room = MAX_PHOTOS - photos.length
      const shrunk = await Promise.all([...files].slice(0, room).map(shrinkImage))
      setPhotos([...photos, ...shrunk])
    } catch {
      setError('That photo could not be opened. Try a JPG or PNG.')
    }
  }

  async function build() {
    setError('')
    try {
      const built = await buildCourse({ photos, text, goal }, (stage) => setView({ name: 'building', stage }))
      const course: Course = { ...built, id: newId(), origin: 'generated' }
      setCourses([course, ...courses])
      setPhotos([])
      setText('')
      setGoal('')
      setView({ name: 'course', courseId: course.id })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hoot could not finish that. Please try again.')
      setView({ name: 'add' })
    }
  }

  function record(courseId: string, blockId: string, firstTry: boolean) {
    setProgress((all) => ({ ...all, [courseId]: recordResult(all[courseId] ?? {}, blockId, firstTry) }))
  }

  if (view.name === 'home') {
    return (
      <>
        <BackHeader title="Courses" backLabel="ofCourse" onBack={onExit} />
        <div className="learn-hero">
          <Hoot pose="point" size={84} animate decorative />
          <p>Give me your coursework. I'll turn it into something you can play with.</p>
        </div>
        <Button block onClick={() => setView({ name: 'add' })}><Icon name="plus" size={20} /> Make a course</Button>
        <ul className="course-list">
          {allCourses.map((course) => (
            <li key={course.id}>
              <button type="button" className="course-row" onClick={() => setView({ name: 'course', courseId: course.id })}>
                <span className="course-row__title">{course.title}</span>
                <span className="muted">{course.lessons.length} lessons{course.origin === 'sample' ? ' · Hand-written sample, not AI-made' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  }

  if (view.name === 'add') {
    const ready = photos.length > 0 || text.trim().length > 0
    return (
      <>
        <BackHeader title="Make a course" onBack={() => setView({ name: 'home' })} />
        <p className="muted">Add photos of your notes or practice work. Leave out names, ID numbers, and anything private.</p>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
        <div className="photo-grid">
          {photos.map((photo, i) => (
            <div key={i} className="photo-thumb">
              <img src={photo} alt={`Coursework page ${i + 1}`} />
              <button type="button" className="photo-thumb__remove" aria-label={`Remove page ${i + 1}`} onClick={() => setPhotos(photos.filter((_, n) => n !== i))}>
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="photo-add" onClick={() => fileInput.current?.click()}>
              <Icon name="camera" size={24} /><span>Add a photo</span>
            </button>
          )}
        </div>
        <label className="learn-field">
          <span className="learn-field__label">Or paste your notes</span>
          <textarea className="input learn-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="learn-field">
          <span className="learn-field__label">What do you want to get good at? (optional)</span>
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ready for Friday's quiz" />
        </label>
        <p className="muted learn-note">Hoot teaches the method with new practice problems. It won't answer your actual assignment. Photos aren't saved.</p>
        {error && <p className="feedback feedback--wrong" role="alert">{error}</p>}
        {!aiOn && <p className="feedback" role="status">Course building is turned off right now. You can still try the sample course.</p>}
        <Button block disabled={!ready || !aiOn} onClick={() => void build()}>Build my course</Button>
      </>
    )
  }

  if (view.name === 'building') {
    const current = stages.findIndex((s) => s.id === view.stage)
    return (
      <div className="learn-gate">
        <Hoot pose="think" size={132} animate decorative />
        <h1 className="screen-title">Building your course</h1>
        <ol className="build-stages" aria-live="polite">
          {stages.map((stage, i) => (
            <li key={stage.id} className={i < current ? 'build-stage build-stage--done' : i === current ? 'build-stage build-stage--now' : 'build-stage'}>
              <span className="build-stage__mark" aria-hidden="true">{i < current && <Icon name="check" size={14} />}</span>
              {stage.label}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const course = courseFor(view.courseId)
  if (!course) return null
  const courseProgress = progress[course.id] ?? {}

  if (view.name === 'lesson') {
    const lesson = course.lessons.find((l) => l.id === view.lessonId)
    if (!lesson) return null
    return (
      <CoursePlayer key={lesson.id} title={lesson.title} intro={lesson.intro} blocks={lesson.blocks} aiOn={aiOn}
        onResult={(blockId, firstTry) => record(course.id, blockId, firstTry)}
        onExit={() => setView({ name: 'course', courseId: course.id })} />
    )
  }

  if (view.name === 'fix') {
    return (
      <CoursePlayer key="fix" title="Fix it" intro="These are the ones that tripped you up. Try them again." blocks={view.blocks} aiOn={aiOn}
        onResult={(blockId, firstTry) => setProgress((all) => ({ ...all, [course.id]: recordFix(all[course.id] ?? {}, blockId, firstTry) }))} onExit={() => setView({ name: 'course', courseId: course.id })} />
    )
  }

  const missed = missedBlocks(course, courseProgress)
  const mastery = masteryByConcept(course, courseProgress)
  const nextLesson = course.lessons.findIndex((lesson) => !lessonDone(lesson.blocks, courseProgress))

  return (
    <>
      <BackHeader title={course.title} backLabel="Courses" onBack={() => setView({ name: 'home' })} />
      <p className="muted">{course.summary}</p>
      {course.origin === 'sample' && <p className="tag learn-tag">Hand-written sample, not AI-made</p>}
      {course.checks && (
        <p className="check-note"><Icon name="check" size={16} /> Hoot double-checked {course.checks.checkedQuestions} questions and removed {course.checks.removedBlocks} that didn't hold up.</p>
      )}
      <ol className="course-map">
        {course.lessons.map((lesson, i) => {
          const done = lessonDone(lesson.blocks, courseProgress)
          return (
            <li key={lesson.id} className={done ? 'map-stop map-stop--done' : i === nextLesson ? 'map-stop map-stop--next' : 'map-stop'}>
              <span className="map-stop__mark" aria-hidden="true">{done ? <Icon name="check" size={18} /> : i + 1}</span>
              <button type="button" className="map-stop__card" onClick={() => setView({ name: 'lesson', courseId: course.id, lessonId: lesson.id })}>
                <span className="course-row__title">{lesson.title}</span>
                <span className="muted">{lesson.blocks.length} activities{done ? ' · Done' : ''}</span>
                {lesson.source?.quote && <span className="map-stop__source">From your work: "{lesson.source.quote}"</span>}
              </button>
            </li>
          )
        })}
      </ol>
      {missed.length > 0 && (
        <Button block variant="secondary" onClick={() => setView({ name: 'fix', courseId: course.id, blocks: missed })}>
          Fix it: {missed.length} to practice again
        </Button>
      )}
      <h2 className="learn-subhead">What you've got</h2>
      <ul className="mastery">
        {mastery.map((concept) => (
          <li key={concept.id}>
            <span className="mastery__label">{concept.name}<strong>{concept.percent === null ? 'Not tried' : `${concept.percent}%`}</strong></span>
            <span className="mastery__track"><span style={{ transform: `scaleX(${(concept.percent ?? 0) / 100})` }} /></span>
          </li>
        ))}
      </ul>
    </>
  )
}
