import { useEffect, useRef, useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Button } from '../components/Button'
import { Hoot } from '../components/Hoot'
import { Icon } from '../components/Icon'
import { sampleLibrary } from '../data/sampleLibrary'
import { LEVELS, type Block, type Course, type Level } from '../lib/course'
import { aiAvailable, buildCourse, type BuildStage } from '../lib/courseClient'
import { toDateKey } from '../lib/dates'
import { courseMastery, pointsFor, rankFor, recordFix, recordResult, type Progress } from '../lib/mastery'
import { shrinkImage } from '../lib/shrinkImage'
import { currentCount, playedToday, type Streak } from '../lib/streak'
import { newId, useStoredState } from '../lib/useStoredState'
import { useAppData, type Note } from '../state/appDataContext'
import { CoursePlayer } from './CoursePlayer'
import { CourseView } from './CourseView'

const MAX_PHOTOS = 5

type View =
  | { name: 'home' }
  | { name: 'add' }
  | { name: 'building'; stage: BuildStage }
  | { name: 'course'; courseId: string }
  | { name: 'play'; courseId: string; title: string; intro: string; blocks: Block[]; mode: 'lesson' | 'fix' }

const stages: { id: BuildStage; label: string }[] = [
  { id: 'reading', label: 'Reading and summarizing your work' },
  { id: 'designing', label: 'Designing your lessons and games' },
  { id: 'checking', label: 'Double-checking the answers' },
]

function noteText(note: Note): string {
  return note.lines.map((line) => line.text).join('\n')
}

// The Learn hub: explore subjects, make a course from your own work, and play.
export function LearnScreen({ noteId, onExit }: { noteId?: string; onExit: () => void }) {
  const { notes } = useAppData()
  const [adult, setAdult] = useStoredState('learn-adult-ok', false)
  const [courses, setCourses] = useStoredState<Course[]>('courses-v1', [])
  const [progress, setProgress] = useStoredState<Record<string, Progress>>('course-progress-v1', {})
  const [streak, setStreak] = useStoredState<Streak>('learn-streak', { count: 0, lastDay: null })
  const [today] = useState(() => toDateKey(new Date()))
  const [aiOn, setAiOn] = useState(false)
  const [view, setView] = useState<View>(noteId ? { name: 'add' } : { name: 'home' })
  const [subject, setSubject] = useState('All')
  const [photos, setPhotos] = useState<string[]>([])
  const [text, setText] = useState(() => {
    const note = notes.find((n) => n.id === noteId)
    return note ? noteText(note) : ''
  })
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<Level>('Some background')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => { void aiAvailable().then(setAiOn) }, [])

  const allCourses = [...courses, ...sampleLibrary]
  const courseFor = (id: string) => allCourses.find((c) => c.id === id)

  if (!adult) {
    return (
      <div className="learn-gate">
        <Hoot pose="hello" size={132} animate decorative />
        <h1 className="screen-title">Learn anything, your way</h1>
        <p className="muted">Turn your coursework into games, notes, and a study plan, or explore courses in any subject. Hoot's AI is powered by Meta's models.</p>
        <p className="muted">Hoot is for learners 18 and older for now.</p>
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
      const built = await buildCourse({ photos, text, goal, level }, (stage) => setView({ name: 'building', stage }))
      const course: Course = { ...built, id: newId(), origin: 'generated', level }
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

  if (view.name === 'home') {
    const points = pointsFor(progress)
    const rank = rankFor(points)
    const days = currentCount(streak, today)
    const subjects = ['All', ...new Set(sampleLibrary.map((c) => c.subject ?? 'Other'))]
    const explore = sampleLibrary.filter((c) => subject === 'All' || c.subject === subject)
    const card = (course: Course) => {
      const mastery = courseMastery(course, progress[course.id] ?? {})
      return (
        <li key={course.id}>
          <button type="button" className="course-row" onClick={() => setView({ name: 'course', courseId: course.id })}>
            <span className="course-row__title">{course.title}</span>
            <span className="muted">{[course.subject, course.level, `${course.lessons.length} lessons`].filter(Boolean).join(' · ')}</span>
            <span className="mastery__track" aria-label={`${mastery}% mastered`}><span style={{ transform: `scaleX(${mastery / 100})` }} /></span>
          </button>
        </li>
      )
    }
    return (
      <>
        <BackHeader title="Learn" backLabel="ofCourse" onBack={onExit} />
        <div className="rank-card">
          <Hoot pose="point" size={72} animate decorative />
          <div>
            <p className="rank-card__name">{rank.name}</p>
            <p className="muted">{points} owl points{rank.toNext !== null ? ` · ${rank.toNext} to ${rank.nextName}` : ''}</p>
            {days > 0 && <p className="streak">{days}-day streak</p>}
          </div>
        </div>
        <div className="make-card">
          <strong>Turn your work into a course</strong>
          <p className="muted">Hoot summarizes your notes, finds your exam dates, and builds games from what you're studying.</p>
          <Button block onClick={() => setView({ name: 'add' })}><Icon name="camera" size={20} /> Make a course</Button>
        </div>
        {courses.length > 0 && (
          <>
            <h2 className="learn-subhead">My courses</h2>
            <ul className="course-list">{courses.map(card)}</ul>
          </>
        )}
        <h2 className="learn-subhead">Explore</h2>
        <div className="filter-chips" role="tablist" aria-label="Filter by subject">
          {subjects.map((name) => (
            <button key={name} type="button" role="tab" aria-selected={subject === name} className={subject === name ? 'filter-chip filter-chip--on' : 'filter-chip'} onClick={() => setSubject(name)}>{name}</button>
          ))}
        </div>
        <ul className="course-list">{explore.map(card)}</ul>
        <p className="muted learn-note">Explore courses are hand-written samples, not AI-made.</p>
      </>
    )
  }

  if (view.name === 'add') {
    const ready = photos.length > 0 || text.trim().length > 0
    return (
      <>
        <BackHeader title="Make a course" onBack={() => setView({ name: 'home' })} />
        <p className="muted">Add photos of your notes, a syllabus, or practice work. Leave out names, ID numbers, and anything private.</p>
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
        <div className="learn-field">
          <span className="learn-field__label">How much do you already know?</span>
          <div className="chip-row">
            {LEVELS.map((name) => (
              <button key={name} type="button" aria-pressed={level === name} className={level === name ? 'learn-tab learn-tab--on' : 'learn-tab'} onClick={() => setLevel(name)}>{name}</button>
            ))}
          </div>
        </div>
        <label className="learn-field">
          <span className="learn-field__label">What do you want to get good at? (optional)</span>
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ready for Friday's quiz" />
        </label>
        <p className="muted learn-note">Hoot teaches the method with new practice problems. It won't answer your actual assignment. Photos aren't saved.</p>
        {error && <p className="feedback feedback--wrong" role="alert">{error}</p>}
        {!aiOn && <p className="feedback" role="status">Course building is turned off right now. You can still try the sample courses.</p>}
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
  const backToCourse = () => setView({ name: 'course', courseId: course.id })

  if (view.name === 'play') {
    return (
      <CoursePlayer key={view.title} title={view.title} intro={view.intro} blocks={view.blocks} aiOn={aiOn} onExit={backToCourse}
        onResult={(blockId, firstTry) => {
          setStreak((s) => playedToday(s, today))
          setProgress((all) => {
            const current = all[course.id] ?? {}
            return { ...all, [course.id]: view.mode === 'fix' && current[blockId] ? recordFix(current, blockId, firstTry) : recordResult(current, blockId, firstTry) }
          })
        }} />
    )
  }

  return (
    <CourseView course={course} progress={progress[course.id] ?? {}} aiOn={aiOn} today={today}
      onBack={() => setView({ name: 'home' })}
      onPlay={(title, intro, blocks, mode) => setView({ name: 'play', courseId: course.id, title, intro, blocks, mode })}
      onUpdateKit={(kit) => setCourses(courses.map((c) => (c.id === course.id ? { ...c, kit } : c)))} />
  )
}
