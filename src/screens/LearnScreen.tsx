import { useEffect, useRef, useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Button } from '../components/Button'
import { Hoot } from '../components/Hoot'
import { Icon } from '../components/Icon'
import { sampleLibrary } from '../data/sampleLibrary'
import { LEVELS, type Course, type Level } from '../lib/course'
import { aiAvailable, buildCourse, type BuildProgress } from '../lib/courseClient'
import { toDateKey } from '../lib/dates'
import { courseMastery, pointsFor, rankFor, recordFix, recordResult, teachKey, type Progress } from '../lib/mastery'
import { pdfToImages } from '../lib/pdfPages'
import { shrinkImage } from '../lib/shrinkImage'
import { currentCount, playedToday, type Streak } from '../lib/streak'
import { newId, useStoredState } from '../lib/useStoredState'
import { useAppData, type Note } from '../state/appDataContext'
import { CoursePlayer } from './CoursePlayer'
import { CourseView, type PlayRequest } from './CourseView'

const MAX_PAGES = 5

type View =
  | { name: 'home' }
  | { name: 'add' }
  | { name: 'building'; progress: BuildProgress }
  | { name: 'course'; courseId: string }
  | { name: 'play'; courseId: string; request: PlayRequest }

const stages: { id: BuildProgress['stage']; label: string }[] = [
  { id: 'reading', label: 'Reading what you gave me' },
  { id: 'planning', label: 'Planning your units' },
  { id: 'writing', label: 'Writing your lessons and games' },
  { id: 'checking', label: 'Double-checking the course' },
]

function noteText(note: Note): string {
  return note.lines.map((line) => line.text).join('\n')
}

// The Learn hub: explore subjects, build a full course from your own work, and play.
export function LearnScreen({ noteId, onExit }: { noteId?: string; onExit: () => void }) {
  const { notes } = useAppData()
  const [adult, setAdult] = useStoredState('learn-adult-ok', false)
  const [courses, setCourses] = useStoredState<Course[]>('courses-v2', [])
  const [progress, setProgress] = useStoredState<Record<string, Progress>>('course-progress-v2', {})
  const [streak, setStreak] = useStoredState<Streak>('learn-streak', { count: 0, lastDay: null })
  const [today] = useState(() => toDateKey(new Date()))
  const [aiOn, setAiOn] = useState(false)
  const [view, setView] = useState<View>(noteId ? { name: 'add' } : { name: 'home' })
  const [subject, setSubject] = useState('All')
  const [topic, setTopic] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [text, setText] = useState(() => {
    const note = notes.find((n) => n.id === noteId)
    return note ? noteText(note) : ''
  })
  const [level, setLevel] = useState<Level>('Some background')
  const [error, setError] = useState('')
  const [fileNote, setFileNote] = useState('')
  const [readingFiles, setReadingFiles] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => { void aiAvailable().then(setAiOn) }, [])

  const allCourses = [...courses, ...sampleLibrary]
  const courseFor = (id: string) => allCourses.find((c) => c.id === id)

  if (!adult) {
    return (
      <div className="learn-gate">
        <Hoot pose="hello" size={132} animate decorative />
        <h1 className="screen-title">Learn anything, your way</h1>
        <p className="muted">Tell Hoot what you want to learn and add your notes, docs, or photos. Hoot builds you a full course that teaches first, then lets you practice. Hoot's AI is powered by Meta's models.</p>
        <p className="muted">Hoot is for learners 18 and older for now.</p>
        <Button block onClick={() => setAdult(true)}>I'm 18 or older</Button>
        <Button block variant="ghost" onClick={onExit}>Not now</Button>
      </div>
    )
  }

  // Photos and PDF pages become images, and text files join the notes box.
  async function addFiles(files: FileList | null) {
    if (!files) return
    const chosen = [...files] // copy now: the file picker's list empties when it resets below
    setError('')
    setFileNote('')
    setReadingFiles(true)
    let pages = [...photos]
    let pasted = text
    const notices: string[] = []
    for (const file of chosen) {
      try {
        const room = MAX_PAGES - pages.length
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          if (room <= 0) { notices.push(`No room left for ${file.name}.`); continue }
          const { images, totalPages } = await pdfToImages(file, room)
          pages = [...pages, ...images]
          if (totalPages > images.length) notices.push(`Using the first ${images.length} of ${totalPages} pages from ${file.name}.`)
        } else if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) {
          pasted = `${pasted}${pasted ? '\n\n' : ''}${await file.text()}`
        } else if (file.type.startsWith('image/')) {
          if (room <= 0) { notices.push(`No room left for ${file.name}.`); continue }
          pages = [...pages, await shrinkImage(file)]
        } else {
          notices.push(`${file.name} isn't supported yet. Try a PDF, photo, or text file.`)
        }
      } catch {
        notices.push(`${file.name} could not be opened.`)
      }
    }
    setPhotos(pages)
    setText(pasted)
    setFileNote(notices.join(' '))
    setReadingFiles(false)
  }

  async function build() {
    setError('')
    try {
      const built = await buildCourse({ topic, photos, text, level }, (next) => setView({ name: 'building', progress: next }))
      const course: Course = { ...built, id: newId(), origin: 'generated', level }
      setCourses([course, ...courses])
      setTopic('')
      setPhotos([])
      setText('')
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
      const units = new Set(course.lessons.map((l) => l.unit)).size
      return (
        <li key={course.id}>
          <button type="button" className="course-row" onClick={() => setView({ name: 'course', courseId: course.id })}>
            <span className="course-row__title">{course.title}</span>
            <span className="muted">{[course.subject, course.level, `${units} ${units === 1 ? 'unit' : 'units'}`].filter(Boolean).join(' · ')}</span>
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
          <strong>What do you want to learn?</strong>
          <p className="muted">Tell Hoot, add your notes or docs, and get a full course: lessons that teach, games to practice, quizzes, notes, and a study plan.</p>
          <Button block onClick={() => setView({ name: 'add' })}><Icon name="plus" size={20} /> Build my course</Button>
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
        <p className="muted learn-note">Explore courses are samples written in advance, not generated by Hoot or Meta's models.</p>
      </>
    )
  }

  if (view.name === 'add') {
    const ready = topic.trim().length > 0 || photos.length > 0 || text.trim().length > 0
    return (
      <>
        <BackHeader title="Build my course" onBack={() => setView({ name: 'home' })} />
        <label className="learn-field">
          <span className="learn-field__label">What do you want to learn?</span>
          <textarea className="input learn-textarea" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="How supply and demand set prices, for my econ midterm" />
        </label>
        <div className="learn-field">
          <span className="learn-field__label">Add your materials (optional)</span>
          <p className="muted learn-hint">Photos, PDFs, or text files: notes, a syllabus, or practice work. Leave out names, ID numbers, and anything private.</p>
          <input ref={fileInput} type="file" accept="image/*,application/pdf,.pdf,text/plain,.txt,.md" multiple hidden
            onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
          <div className="photo-grid">
            {photos.map((photo, i) => (
              <div key={i} className="photo-thumb">
                <img src={photo} alt={`Page ${i + 1}`} />
                <button type="button" className="photo-thumb__remove" aria-label={`Remove page ${i + 1}`} onClick={() => setPhotos(photos.filter((_, n) => n !== i))}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PAGES && (
              <button type="button" className="photo-add" disabled={readingFiles} onClick={() => fileInput.current?.click()}>
                <Icon name="camera" size={24} /><span>{readingFiles ? 'Reading...' : 'Add files'}</span>
              </button>
            )}
          </div>
          {fileNote && <p className="feedback learn-basis" role="status">{fileNote}</p>}
        </div>
        <label className="learn-field">
          <span className="learn-field__label">Or paste your notes</span>
          <textarea className="input learn-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="learn-field">
          <span className="learn-field__label">How much do you already know?</span>
          <div className="chip-row">
            {LEVELS.map((name) => (
              <button key={name} type="button" aria-pressed={level === name} className={level === name ? 'learn-tab learn-tab--on' : 'learn-tab'} onClick={() => setLevel(name)}>{name}</button>
            ))}
          </div>
        </div>
        <p className="muted learn-note">Hoot teaches the method with new practice problems. It won't answer your actual assignment. Files aren't saved.</p>
        {error && <p className="feedback feedback--wrong" role="alert">{error}</p>}
        {!aiOn && <p className="feedback learn-basis" role="status">Course building is turned off right now. You can still try the sample courses.</p>}
        <Button block disabled={!ready || !aiOn || readingFiles} onClick={() => void build()}>Build my course</Button>
      </>
    )
  }

  if (view.name === 'building') {
    const current = stages.findIndex((s) => s.id === view.progress.stage)
    return (
      <div className="learn-gate">
        <Hoot pose="think" size={132} animate decorative />
        <h1 className="screen-title">Building your course</h1>
        <ol className="build-stages" aria-live="polite">
          {stages.map((stage, i) => (
            <li key={stage.id} className={i < current ? 'build-stage build-stage--done' : i === current ? 'build-stage build-stage--now' : 'build-stage'}>
              <span className="build-stage__mark" aria-hidden="true">{i < current && <Icon name="check" size={14} />}</span>
              {stage.label}{i === current && view.progress.detail ? `: ${view.progress.detail}` : ''}
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
    const { request } = view
    return (
      <CoursePlayer key={request.title} title={request.title} intro={request.intro} blocks={request.blocks} teach={request.lesson?.teach} graded={request.graded} aiOn={aiOn} onExit={backToCourse}
        onTeachDone={() => {
          if (!request.lesson) return
          const key = teachKey(request.lesson.id)
          setProgress((all) => ({ ...all, [course.id]: recordResult(all[course.id] ?? {}, key, true) }))
        }}
        onResult={(blockId, firstTry) => {
          setStreak((s) => playedToday(s, today))
          setProgress((all) => {
            const current = all[course.id] ?? {}
            return { ...all, [course.id]: request.retry && current[blockId] ? recordFix(current, blockId, firstTry) : recordResult(current, blockId, firstTry) }
          })
        }} />
    )
  }

  return (
    <CourseView course={course} progress={progress[course.id] ?? {}} aiOn={aiOn} today={today}
      onBack={() => setView({ name: 'home' })}
      onPlay={(request) => setView({ name: 'play', courseId: course.id, request })}
      onUpdateKit={(kit) => setCourses(courses.map((c) => (c.id === course.id ? { ...c, kit } : c)))} />
  )
}
