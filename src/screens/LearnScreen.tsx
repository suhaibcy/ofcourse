import { useEffect, useRef, useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Button } from '../components/Button'
import { Hoot } from '../components/Hoot'
import { Icon } from '../components/Icon'
import { sampleLibrary } from '../data/sampleLibrary'
import { LEVELS, type Course, type Level } from '../lib/course'
import { aiAvailable, buildCourse, generatePractice, startDraft, transcribeLecture, type BuildDraft, type BuildProgress } from '../lib/courseClient'
import { AudioTooLongError } from '../lib/wavEncode'
import { toDateKey } from '../lib/dates'
import { courseMastery, missedBlocks, pointsFor, rankFor, recordFix, recordResult, teachKey, type Progress } from '../lib/mastery'
import { EMPTY_MEMORY, normalizeMemory, nowMs, recommendNext, recordAttempt, type Attempt, type NextStep } from '../lib/memory'
import { addSet, applyPracticeResult, practiceRequest, unplayedSet, type PracticeStore } from '../lib/practice'
import type { MissDetail } from '../lib/tutor'
import { readPdf } from '../lib/pdfPages'
import { shrinkImage } from '../lib/shrinkImage'
import { currentCount, playedToday, type Streak } from '../lib/streak'
import { newId, useStoredState } from '../lib/useStoredState'
import { useAppData, type Note } from '../state/appDataContext'
import { CoursePlayer } from './CoursePlayer'
import { CourseView, type PlayRequest } from './CourseView'
import { PracticeRun } from './PracticeRun'

const MAX_PAGES = 5
const MAX_TEXT = 60_000 // matches the server's limit

type View =
  | { name: 'home' }
  | { name: 'add' }
  | { name: 'building'; progress: BuildProgress }
  | { name: 'course'; courseId: string }
  | { name: 'play'; courseId: string; request: PlayRequest }
  | { name: 'practice'; courseId: string; conceptId: string }

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
  const { notes, onboarded } = useAppData()
  const [adult, setAdult] = useStoredState('learn-adult-ok', false)
  const [courses, setCourses] = useStoredState<Course[]>('courses-v2', [])
  const [progress, setProgress] = useStoredState<Record<string, Progress>>('course-progress-v2', {})
  const [streak, setStreak] = useStoredState<Streak>('learn-streak', { count: 0, lastDay: null })
  const [savedMemory, setMemory] = useStoredState<unknown>('learning-memory-v1', EMPTY_MEMORY)
  const memory = normalizeMemory(savedMemory)
  const [practiceSets, setPracticeSets] = useStoredState<PracticeStore>('practice-sets-v1', {})
  const [today] = useState(() => toDateKey(new Date()))
  const [aiOn, setAiOn] = useState(false)
  const [view, setView] = useState<View>(noteId ? { name: 'add' } : { name: 'home' })
  const [subject, setSubject] = useState('All')
  const [topic, setTopic] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [docs, setDocs] = useState<{ name: string; text: string; pages: number; transcript?: boolean }[]>([])
  const [lecture, setLecture] = useState<{ file: File; allowed: boolean; working: boolean; done: number; total: number; error: string } | null>(null)
  const [draft, setDraft] = useStoredState<BuildDraft | null>('course-build-draft', null)
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
        {onboarded && <Button block variant="ghost" onClick={onExit}>Not now</Button>}
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
    const documents = [...docs]
    const notices: string[] = []
    for (const file of chosen) {
      try {
        const room = MAX_PAGES - pages.length
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const { text: pdfText, images, totalPages } = await readPdf(file, Math.max(room, 0))
          if (pdfText) {
            documents.push({ name: file.name, text: pdfText, pages: totalPages })
          } else {
            if (room <= 0) { notices.push(`No room left for ${file.name}.`); continue }
            pages = [...pages, ...images]
            notices.push(totalPages > images.length ? `${file.name} looks scanned, so Hoot will use photos of its first ${images.length} of ${totalPages} pages.` : `${file.name} looks scanned, so Hoot will read photos of its pages.`)
          }
        } else if (file.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(file.name)) {
          if (aiOn) setLecture({ file, allowed: false, working: false, done: 0, total: 0, error: '' })
          else notices.push(`Transcribing ${file.name} needs course building to be on.`)
        } else if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) {
          pasted = `${pasted}${pasted ? '\n\n' : ''}${await file.text()}`
        } else if (file.type.startsWith('image/')) {
          if (room <= 0) { notices.push(`No room left for ${file.name}.`); continue }
          pages = [...pages, await shrinkImage(file)]
        } else {
          notices.push(`${file.name} isn't supported yet. Try a PDF, photo, text, or audio file.`)
        }
      } catch {
        notices.push(`${file.name} could not be opened.`)
      }
    }
    setPhotos(pages)
    setDocs(documents)
    setText(pasted)
    setFileNote(notices.join(' '))
    setReadingFiles(false)
  }

  async function transcribe() {
    if (!lecture) return
    const { file } = lecture
    setLecture({ ...lecture, working: true, error: '' })
    try {
      const transcript = await transcribeLecture(file, (done, total) => setLecture((l) => l && { ...l, done, total }))
      setDocs((all) => [...all, { name: file.name, text: transcript, pages: 0, transcript: true }])
      setLecture(null)
    } catch (e) {
      const error = e instanceof AudioTooLongError ? 'That recording is over 10 minutes. Try a shorter clip.' : "Hoot couldn't transcribe that recording. Try again, or use an MP3 or WAV file."
      setLecture((l) => l && { ...l, working: false, error })
    }
  }

  async function build(resume?: BuildDraft) {
    setError('')
    const allText = [...docs.map((doc) => doc.text), text].filter((part) => part.trim()).join('\n\n').slice(0, MAX_TEXT)
    const input = { topic: resume?.topic ?? topic, photos, text: allText, level: resume?.level ?? level }
    try {
      const built = await buildCourse(input, resume ?? startDraft(input), setDraft, (next) => setView({ name: 'building', progress: next }))
      const course: Course = { ...built, id: newId(), origin: 'generated', level: input.level }
      setCourses((all) => [course, ...all])
      setDraft(null)
      setTopic('')
      setPhotos([])
      setDocs([])
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
        {onboarded
          ? <BackHeader title="Learn" backLabel="ofCourse" onBack={onExit} />
          : <div className="screen-head learn-home-head"><h1 className="screen-title">Learn</h1></div>}
        <div className="learn-home">
        <div className="learn-home__side">
        <div className="rank-card">
          <Hoot pose="point" size={72} animate decorative />
          <div>
            <p className="rank-card__name">{rank.name}</p>
            <p className="muted">{points} owl points{rank.toNext !== null ? ` · ${rank.toNext} to ${rank.nextName}` : ''}</p>
            {days > 0 && <p className="streak">{days}-day streak</p>}
          </div>
        </div>
        {draft?.reading && aiOn && (
          <div className="resume-card" role="status">
            <div><strong>Your course isn't finished</strong><p className="muted">{draft.outline?.title ?? draft.topic}. Hoot kept what it had done so far.</p></div>
            <div className="resume-card__actions">
              <Button small onClick={() => void build(draft)}>Finish it</Button>
              <Button small variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
            </div>
          </div>
        )}
        <div className="make-card">
          <strong>What do you want to learn?</strong>
          <p className="muted">Tell Hoot, add your notes or docs, and get a full course: lessons that teach, games to practice, quizzes, notes, and a study plan.</p>
          <Button block onClick={() => setView({ name: 'add' })}><Icon name="plus" size={20} /> Build my course</Button>
        </div>
        </div>
        <div className="learn-home__main">
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
        </div>
        </div>
      </>
    )
  }

  if (view.name === 'add') {
    const ready = topic.trim().length > 0 || photos.length > 0 || docs.length > 0 || text.trim().length > 0
    const docChars = docs.reduce((sum, doc) => sum + doc.text.length, 0)
    return (
      <div className="learn-narrow">
        <BackHeader title="Build my course" onBack={() => setView({ name: 'home' })} />
        <label className="learn-field">
          <span className="learn-field__label">What do you want to learn?</span>
          <textarea className="input learn-textarea" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="How supply and demand set prices, for my econ midterm" />
        </label>
        <div className="learn-field">
          <span className="learn-field__label">Add your materials (optional)</span>
          <p className="muted learn-hint">PDFs, photos, or text files: notes, a syllabus, or practice work. Or a lecture recording of up to 10 minutes. Leave out names, ID numbers, and anything private.</p>
          <input ref={fileInput} type="file" accept="image/*,application/pdf,.pdf,text/plain,.txt,.md,audio/*,.m4a,.mp3,.wav" multiple hidden
            onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
          {docs.length > 0 && (
            <ul className="doc-list">
              {docs.map((doc, i) => (
                <li key={doc.name + i} className="doc-chip">
                  <Icon name="notes" size={18} />
                  <span><strong>{doc.name}</strong> <span className="muted">{doc.transcript ? 'Transcribed by AI, so it may contain mistakes' : `${doc.pages} ${doc.pages === 1 ? 'page' : 'pages'} read`}</span></span>
                  <button type="button" className="doc-chip__remove" aria-label={`Remove ${doc.name}`} onClick={() => setDocs(docs.filter((_, n) => n !== i))}><Icon name="close" size={16} /></button>
                </li>
              ))}
            </ul>
          )}
          {lecture && (
            <div className="lecture-card">
              <strong>{lecture.file.name}</strong>
              <label className="point point--check">
                <input type="checkbox" checked={lecture.allowed} disabled={lecture.working} onChange={(e) => setLecture({ ...lecture, allowed: e.target.checked })} />
                <span>I have permission to use this recording. Many classes and some laws restrict recording people.</span>
              </label>
              <p className="muted">The audio is sent to Meta's Muse Voice Transcribe for text, and ofCourse doesn't save it.</p>
              {lecture.error && <p className="feedback feedback--wrong" role="alert">{lecture.error}</p>}
              {lecture.working
                ? <p className="muted" role="status">Hoot is listening... {lecture.total > 0 ? `${lecture.done} of ${lecture.total} parts` : 'getting the audio ready'}</p>
                : <div className="chip-row"><Button small disabled={!lecture.allowed} onClick={() => void transcribe()}>Transcribe</Button><Button small variant="ghost" onClick={() => setLecture(null)}>Remove</Button></div>}
            </div>
          )}
          {docChars > MAX_TEXT && <p className="feedback learn-basis" role="status">That's a lot of text, so Hoot will use about the first {Math.round(MAX_TEXT / 1000)},000 characters.</p>}
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
        {aiOn && <p className="muted learn-note">Building usually takes about 2 minutes. You can watch each step.</p>}
        <Button block disabled={!ready || !aiOn || readingFiles || Boolean(lecture?.working)} onClick={() => void build()}>Build my course</Button>
      </div>
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
  const courseProgress = progress[course.id] ?? {}
  const lessonPlay = (lessonId: string): PlayRequest | null => {
    const lesson = course.lessons.find((l) => l.id === lessonId)
    return lesson ? { title: lesson.title, intro: lesson.intro, blocks: lesson.blocks, lesson, graded: lesson.kind === 'quiz', retry: false } : null
  }
  const logAttempt = (attempt: Omit<Attempt, 'courseId' | 'at'>) => {
    const at = nowMs()
    setMemory((saved: unknown) => recordAttempt(normalizeMemory(saved), { ...attempt, courseId: course.id, at }))
  }

  // Saved practice first (no AI call), then new questions, then the learner's own misses.
  const loadPractice = async (conceptId: string, miss?: MissDetail) => {
    const sets = practiceSets[course.id] ?? []
    const saved = unplayedSet(sets, conceptId, courseProgress)
    if (saved) return { blocks: saved.blocks, source: 'saved' as const }
    if (aiOn) {
      try {
        const blocks = await generatePractice(practiceRequest(course, conceptId, courseProgress, memory, sets, miss))
        const added = addSet(sets, conceptId, blocks, `practice-${newId()}`, nowMs())
        setPracticeSets((all) => ({ ...all, [course.id]: added.sets }))
        return { blocks: added.set.blocks, source: 'new' as const }
      } catch {
        // Fall through to Fix it.
      }
    }
    return { blocks: missedBlocks(course, courseProgress).filter((block) => block.conceptId === conceptId), source: 'fixit' as const }
  }
  const practiceResult = (blockId: string, conceptId: string, firstTry: boolean) => {
    setStreak((s) => playedToday(s, today))
    setProgress((all) => ({ ...all, [course.id]: applyPracticeResult(course, all[course.id] ?? {}, blockId, conceptId, firstTry) }))
  }

  const nextLabel = (step: NextStep): string | undefined => {
    if (step.kind === 'practice') return 'Practice this'
    if (step.kind === 'fix') return 'Try them again'
    if (step.kind === 'review') return 'Review the lesson'
    if (step.kind === 'next') return 'Start it'
    return undefined
  }
  const goToStep = (step: NextStep) => {
    if (step.kind === 'practice') setView({ name: 'practice', courseId: course.id, conceptId: step.conceptId })
    else if (step.kind === 'fix') setView({ name: 'play', courseId: course.id, request: { title: 'Fix it', intro: 'These are the ones that tripped you up. Try them again.', blocks: missedBlocks(course, courseProgress), graded: false, retry: true } })
    else if (step.kind === 'review' || step.kind === 'next') {
      const request = lessonPlay(step.lessonId)
      if (request) setView({ name: 'play', courseId: course.id, request })
    }
  }

  if (view.name === 'practice') {
    return (
      <ErrorBoundary actionLabel="Back to the course" onReset={backToCourse}>
        <div className="learn-player"><PracticeRun key={view.conceptId} course={course} conceptId={view.conceptId} progress={courseProgress} memory={memory} aiOn={aiOn}
          load={loadPractice} onResult={practiceResult} onAttempt={logAttempt} onExit={backToCourse} /></div>
      </ErrorBoundary>
    )
  }

  if (view.name === 'play') {
    const { request } = view
    return (
      <ErrorBoundary actionLabel="Back to the course" onReset={backToCourse}>
      <div className="learn-player">
      <CoursePlayer key={request.title} title={request.title} intro={request.intro} blocks={request.blocks} teach={request.lesson?.teach} graded={request.graded} aiOn={aiOn} onExit={backToCourse}
        course={course} lesson={request.lesson} progress={courseProgress} memory={memory} onAttempt={logAttempt}
        practice={{ load: loadPractice, onResult: practiceResult }}
        next={(() => { const step = recommendNext(course, courseProgress, aiOn); const label = nextLabel(step); return { text: step.text, label, run: () => goToStep(step) } })()}
        onTeachDone={() => {
          if (!request.lesson) return
          const key = teachKey(request.lesson.id)
          setProgress((all) => ({ ...all, [course.id]: recordResult(all[course.id] ?? {}, key, true) }))
        }}
        onResult={(blockId, firstTry, unverified) => {
          setStreak((s) => playedToday(s, today))
          setProgress((all) => {
            const current = all[course.id] ?? {}
            return { ...all, [course.id]: request.retry && current[blockId] ? recordFix(current, blockId, firstTry) : recordResult(current, blockId, firstTry, unverified) }
          })
        }} />
      </div>
      </ErrorBoundary>
    )
  }

  return (
    <CourseView course={course} progress={courseProgress} memory={memory} aiOn={aiOn} today={today}
      onPractice={(conceptId) => setView({ name: 'practice', courseId: course.id, conceptId })} onNextStep={goToStep} nextLabel={nextLabel}
      onBack={() => setView({ name: 'home' })}
      onPlay={(request) => setView({ name: 'play', courseId: course.id, request })}
      onUpdateKit={(kit) => setCourses(courses.map((c) => (c.id === course.id ? { ...c, kit } : c)))} />
  )
}
