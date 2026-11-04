import { useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { LEVELS, type Block, type Course, type Level, type StudyKit } from '../lib/course'
import { rewriteNotes } from '../lib/courseClient'
import { fromDateKey } from '../lib/dates'
import { courseMastery, lessonDone, masteryByConcept, missedBlocks, weakestConcepts, type Progress } from '../lib/mastery'
import { newId } from '../lib/useStoredState'
import { starsFor } from '../lib/streak'
import { buildStudyPlan } from '../lib/studyPlan'
import { useAppData } from '../state/appDataContext'
import { useToast } from '../state/toastContext'

type Tab = 'lessons' | 'notes' | 'plan'
const MINUTE_OPTIONS = [15, 25, 45]
const CHALLENGE_SIZE = 6

const niceDate = (dayKey: string) => fromDateKey(dayKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

type CourseViewProps = {
  course: Course
  progress: Progress
  aiOn: boolean
  today: string
  onBack: () => void
  onPlay: (title: string, intro: string, blocks: Block[], mode: 'lesson' | 'fix') => void
  onUpdateKit: (kit: StudyKit) => void
}

// One course: its lessons, its study notes, and a study plan for the exam.
export function CourseView({ course, progress, aiOn, today, onBack, onPlay, onUpdateKit }: CourseViewProps) {
  const [tab, setTab] = useState<Tab>('lessons')
  const missed = missedBlocks(course, progress)
  const allBlocks = course.lessons.flatMap((lesson) => lesson.blocks)

  function challenge() {
    const mixed = [...allBlocks].filter((b) => b.type !== 'voice').sort(() => Math.random() - 0.5).slice(0, CHALLENGE_SIZE)
    onPlay('Course challenge', 'A mix from the whole course. Show what you know!', mixed, 'fix')
  }

  return (
    <>
      <BackHeader title={course.title} backLabel="Learn" onBack={onBack} />
      <p className="muted">{course.summary}</p>
      <p className="course-tags">
        {course.subject && <span className="tag">{course.subject}</span>}
        {course.level && <span className="tag">{course.level}</span>}
        {course.origin === 'sample' && <span className="tag">Sample, not AI-made</span>}
      </p>
      <div className="learn-tabs" role="tablist">
        {(['lessons', 'notes', 'plan'] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'learn-tab learn-tab--on' : 'learn-tab'} onClick={() => setTab(id)}>
            {id === 'lessons' ? 'Lessons' : id === 'notes' ? 'Notes' : 'Plan'}
          </button>
        ))}
      </div>

      {tab === 'lessons' && (
        <>
          {course.checks && (
            <p className="check-note"><Icon name="check" size={16} /> Hoot double-checked {course.checks.checkedQuestions} questions and removed {course.checks.removedBlocks} that didn't hold up.</p>
          )}
          <ol className="course-map">
            {course.lessons.map((lesson, i) => {
              const done = lessonDone(lesson.blocks, progress)
              const next = course.lessons.findIndex((l) => !lessonDone(l.blocks, progress))
              const stars = done ? starsFor(lesson.blocks.filter((b) => progress[b.id].firstTry).length, lesson.blocks.length) : 0
              return (
                <li key={lesson.id} className={done ? 'map-stop map-stop--done' : i === next ? 'map-stop map-stop--next' : 'map-stop'}>
                  <span className="map-stop__mark" aria-hidden="true">{done ? <Icon name="check" size={18} /> : i + 1}</span>
                  <button type="button" className="map-stop__card" onClick={() => onPlay(lesson.title, lesson.intro, lesson.blocks, 'lesson')}>
                    <span className="course-row__title">{lesson.title}</span>
                    <span className="muted">{lesson.blocks.length} activities</span>
                    {done && <span className="map-stars" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}</span>}
                    {lesson.source?.quote && <span className="map-stop__source">From your work: "{lesson.source.quote}"</span>}
                  </button>
                </li>
              )
            })}
          </ol>
          {missed.length > 0 && (
            <Button block variant="secondary" onClick={() => onPlay('Fix it', 'These are the ones that tripped you up. Try them again.', missed, 'fix')}>
              Fix it: {missed.length} to practice again
            </Button>
          )}
          <div className="challenge-card">
            <div><strong>Course challenge</strong><p className="muted">A mix of activities from the whole course.</p></div>
            <Button small onClick={challenge}>Start</Button>
          </div>
          <h2 className="learn-subhead">Your mastery: {courseMastery(course, progress)}%</h2>
          <ul className="mastery">
            {masteryByConcept(course, progress).map((concept) => (
              <li key={concept.id} className="mastery__row">
                <span>{concept.name}</span>
                <span className={`level level--${concept.level.toLowerCase().replace(' ', '-')}`}>{concept.level}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'notes' && <NotesTab course={course} aiOn={aiOn} onUpdateKit={onUpdateKit} />}
      {tab === 'plan' && <PlanTab course={course} progress={progress} today={today} />}
    </>
  )
}

function NotesTab({ course, aiOn, onUpdateKit }: { course: Course; aiOn: boolean; onUpdateKit: (kit: StudyKit) => void }) {
  const { saveNote } = useAppData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const kit = course.kit
  if (!kit) return <p className="muted learn-note">This course has no notes.</p>

  function save(current: StudyKit) {
    const lines = [course.title, current.summary, ...current.keyIdeas.map((idea) => `• ${idea}`), ...current.terms.map((t) => `${t.term}: ${t.meaning}`)]
    saveNote({ id: newId(), folder: 'general', updatedAt: Date.now(),
      lines: lines.map((text) => ({ id: newId(), text, checklist: false, checked: false })) })
    toast('Saved to your Notes')
  }

  async function changeLevel(level: Level) {
    setBusy(true)
    setError('')
    try {
      onUpdateKit(await rewriteNotes(kit as StudyKit, level))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hoot could not rewrite these notes.')
    }
    setBusy(false)
  }

  return (
    <div className="notes-kit">
      <p className="notes-kit__summary">{kit.summary}</p>
      <h2 className="learn-subhead">Key ideas</h2>
      <ul className="notes-kit__ideas">{kit.keyIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul>
      <h2 className="learn-subhead">Words to know</h2>
      <dl className="notes-kit__terms">
        {kit.terms.map((term) => <div key={term.term}><dt>{term.term}</dt><dd>{term.meaning}</dd></div>)}
      </dl>
      <Button block variant="secondary" onClick={() => save(kit)}>Save to my Notes</Button>
      <h2 className="learn-subhead">Explain it at my level</h2>
      {aiOn ? (
        <div className="chip-row">
          {LEVELS.map((level) => <Button key={level} small variant="secondary" disabled={busy} onClick={() => void changeLevel(level)}>{level}</Button>)}
        </div>
      ) : <p className="muted">Hoot can rewrite these notes for your level when course building is on.</p>}
      {busy && <p className="muted" role="status">Hoot is rewriting your notes...</p>}
      {error && <p className="feedback feedback--wrong" role="alert">{error}</p>}
    </div>
  )
}

function PlanTab({ course, progress, today }: { course: Course; progress: Progress; today: string }) {
  const { addTask } = useAppData()
  const toast = useToast()
  const found = (course.kit?.dates ?? []).filter((d) => d.date >= today)
  const [examDate, setExamDate] = useState(found[0]?.date ?? '')
  const [minutes, setMinutes] = useState(25)
  const [added, setAdded] = useState(false)
  const [addedDates, setAddedDates] = useState<string[]>([])

  const plan = examDate ? buildStudyPlan(examDate, today, weakestConcepts(course, progress), minutes) : []

  function addPlan() {
    plan.forEach((session) => addTask({ title: `${session.title} (${session.minutes} min)`, date: session.date }))
    setAdded(true)
    toast(`Added ${plan.length} sessions to your planner`)
  }

  return (
    <div className="plan-tab">
      {found.length > 0 && (
        <>
          <h2 className="learn-subhead">Dates Hoot found</h2>
          <ul className="course-list">
            {found.map((item) => (
              <li key={item.title + item.date} className="date-row">
                <span><strong>{item.title}</strong><span className="muted"> {niceDate(item.date)}</span></span>
                <Button small variant="secondary" disabled={addedDates.includes(item.title + item.date)} onClick={() => {
                  addTask({ title: item.title, date: item.date })
                  setAddedDates([...addedDates, item.title + item.date])
                  toast('Added to your planner')
                }}>{addedDates.includes(item.title + item.date) ? 'Added' : 'Add'}</Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="learn-subhead">Plan for my exam</h2>
      <label className="learn-field">
        <span className="learn-field__label">When is it?</span>
        <input className="input" type="date" min={today} value={examDate} onChange={(e) => { setExamDate(e.target.value); setAdded(false) }} />
      </label>
      <div className="learn-field">
        <span className="learn-field__label">Minutes a day</span>
        <div className="chip-row">
          {MINUTE_OPTIONS.map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} className={minutes === m ? 'learn-tab learn-tab--on' : 'learn-tab'} onClick={() => { setMinutes(m); setAdded(false) }}>{m}</button>
          ))}
        </div>
      </div>
      {examDate && plan.length === 0 && <p className="feedback" role="status">Pick a day after today to build a plan.</p>}
      {plan.length > 0 && (
        <>
          <p className="muted learn-note">Your weakest topics come first, and the last day is a full review.</p>
          <ol className="plan-list">
            {plan.map((session) => <li key={session.date}><strong>{niceDate(session.date)}</strong><span>{session.title}</span><span className="muted">{session.minutes} min</span></li>)}
          </ol>
          <Button block disabled={added} onClick={addPlan}>{added ? 'Added to your planner' : 'Add to my planner'}</Button>
        </>
      )}
    </div>
  )
}
