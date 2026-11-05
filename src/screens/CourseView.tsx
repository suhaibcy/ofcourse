import { useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Button } from '../components/Button'
import { HootNoticed } from '../components/HootNoticed'
import { Icon } from '../components/Icon'
import { LEVELS, type Block, type Course, type Lesson, type Level, type StudyKit } from '../lib/course'
import { rewriteNotes } from '../lib/courseClient'
import { fromDateKey } from '../lib/dates'
import { courseMastery, lessonFinished, masteryByConcept, missedBlocks, weakestConcepts, type Progress } from '../lib/mastery'
import { noticed, recommendNext, type LearningMemory, type NextStep } from '../lib/memory'
import { newId } from '../lib/useStoredState'
import { starsFor } from '../lib/streak'
import { buildStudyPlan } from '../lib/studyPlan'
import { useAppData } from '../state/appDataContext'
import { useToast } from '../state/toastContext'

type Tab = 'lessons' | 'notes' | 'plan'
const MINUTE_OPTIONS = [15, 25, 45]
const EXAM_SIZE = 6

const niceDate = (dayKey: string) => fromDateKey(dayKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export type PlayRequest = { title: string; intro: string; blocks: Block[]; lesson?: Lesson; graded: boolean; retry: boolean }

type CourseViewProps = {
  course: Course
  progress: Progress
  memory: LearningMemory
  aiOn: boolean
  today: string
  onPractice: (conceptId: string) => void
  onNextStep: (step: NextStep) => void
  nextLabel: (step: NextStep) => string | undefined
  onBack: () => void
  onPlay: (request: PlayRequest) => void
  onUpdateKit: (kit: StudyKit) => void
}

// Lessons in order, grouped under their units.
function groupByUnit(lessons: Lesson[]) {
  const units: { title: string; lessons: Lesson[] }[] = []
  for (const lesson of lessons) {
    const title = lesson.unit ?? 'Lessons'
    const unit = units[units.length - 1]
    if (unit?.title === title) unit.lessons.push(lesson)
    else units.push({ title, lessons: [lesson] })
  }
  return units
}

// One course: its units and lessons, its study notes, and a study plan for the exam.
export function CourseView({ course, progress, memory, aiOn, today, onPractice, onNextStep, nextLabel, onBack, onPlay, onUpdateKit }: CourseViewProps) {
  const [tab, setTab] = useState<Tab>('lessons')
  const missed = missedBlocks(course, progress)
  const allBlocks = course.lessons.flatMap((lesson) => lesson.blocks)
  const next = course.lessons.find((lesson) => !lessonFinished(lesson, progress))
  const done = course.lessons.filter((lesson) => lessonFinished(lesson, progress)).length
  const notes = noticed(course, progress, memory)
  const step = recommendNext(course, progress, aiOn)

  function exam() {
    const mixed = allBlocks.filter((b) => b.type !== 'voice' && b.type !== 'explain').sort(() => Math.random() - 0.5).slice(0, EXAM_SIZE)
    onPlay({ title: 'Course exam', intro: 'A mix from the whole course. Show what you know!', blocks: mixed, graded: true, retry: true })
  }

  function open(lesson: Lesson) {
    onPlay({ title: lesson.title, intro: lesson.intro, blocks: lesson.blocks, lesson, graded: lesson.kind === 'quiz', retry: false })
  }

  return (
    <>
      <BackHeader title={course.title} backLabel="Learn" onBack={onBack} />
      <p className="muted">{course.summary}</p>
      <p className="course-tags">
        {course.subject && <span className="tag">{course.subject}</span>}
        {course.level && <span className="tag">{course.level}</span>}
        {course.origin === 'sample' && <span className="tag">Sample, not made by Hoot</span>}
      </p>
      {course.basedOn === 'general' && (
        <p className="feedback learn-basis" role="note">You didn't add materials, so Hoot taught this from general knowledge. AI can make mistakes, so check anything important against your class.</p>
      )}
      <div className="learn-tabs" role="tablist">
        {(['lessons', 'notes', 'plan'] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'learn-tab learn-tab--on' : 'learn-tab'} onClick={() => setTab(id)}>
            {id === 'lessons' ? 'Lessons' : id === 'notes' ? 'Notes' : 'Plan'}
          </button>
        ))}
      </div>

      {tab === 'lessons' && (
        <div className="course-layout">
          <div className="course-layout__main">
          {course.checks && (
            <p className="check-note"><Icon name="check" size={16} /> Hoot double-checked this course: {course.checks.checkedQuestions} step-by-step questions solved separately, teaching fact-checked by a second AI, {course.checks.removedBlocks + (course.checks.flaggedCards ?? 0) === 1 ? '1 item' : `${course.checks.removedBlocks + (course.checks.flaggedCards ?? 0)} items`} removed.</p>
          )}
          <p className="sort-count course-progress">{done} of {course.lessons.length} finished</p>
          {groupByUnit(course.lessons).map((unit, u) => (
            <section key={unit.title} className="unit">
              <p className="unit__number">Unit {u + 1}</p>
              <h2 className="unit__title">{unit.title}</h2>
              <ol className="course-map">
                {unit.lessons.map((lesson) => {
                  const finished = lessonFinished(lesson, progress)
                  const isQuiz = lesson.kind === 'quiz'
                  const stars = finished && lesson.blocks.length > 0 ? starsFor(lesson.blocks.filter((b) => progress[b.id].firstTry).length, lesson.blocks.length) : 0
                  return (
                    <li key={lesson.id} className={finished ? 'map-stop map-stop--done' : lesson.id === next?.id ? 'map-stop map-stop--next' : 'map-stop'}>
                      <span className="map-stop__mark" aria-hidden="true">{finished ? <Icon name="check" size={18} /> : <Icon name={isQuiz ? 'grades' : 'notes'} size={18} />}</span>
                      <button type="button" className={isQuiz ? 'map-stop__card map-stop__card--quiz' : 'map-stop__card'} onClick={() => open(lesson)}>
                        <span className="course-row__title">{lesson.title}</span>
                        <span className="muted">{isQuiz ? `Quiz · ${lesson.blocks.length} questions` : `Learn ${(lesson.teach ?? []).length} · Practice ${lesson.blocks.length}`}</span>
                        {stars > 0 && <span className="map-stars" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}</span>}
                        {lesson.source?.quote && <span className="map-stop__source">From your work: "{lesson.source.quote}"</span>}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
          </div>
          <aside className="course-layout__side">
          {notes.tried > 0 && <HootNoticed notes={notes} next={step} nextLabel={nextLabel(step)} onNext={() => onNextStep(step)} aiOn={aiOn} onPractice={onPractice} />}
          {missed.length > 0 && (
            <Button block variant="secondary" onClick={() => onPlay({ title: 'Fix it', intro: 'These are the ones that tripped you up. Try them again.', blocks: missed, graded: false, retry: true })}>
              Fix it: {missed.length} to practice again
            </Button>
          )}
          <div className="challenge-card">
            <div><strong>Course exam</strong><p className="muted">Finish the units first, then show what you know.</p></div>
            <Button small onClick={exam}>Start</Button>
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
          </aside>
        </div>
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
    const lines = [course.title, current.summary, ...current.keyIdeas.map((idea) => `• ${idea}`), ...(current.emphasized ?? []).map((idea) => `Stressed in lecture: ${idea}`), ...current.terms.map((t) => `${t.term}: ${t.meaning}`)]
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
      {kit.emphasized && kit.emphasized.length > 0 && (
        <>
          <h2 className="learn-subhead">What your instructor stressed</h2>
          <ul className="notes-kit__ideas">{kit.emphasized.map((idea) => <li key={idea}>{idea}</li>)}</ul>
          <p className="muted learn-note">Based on the words in the transcript, not tone of voice.</p>
        </>
      )}
      <h2 className="learn-subhead">Words to know</h2>
      <dl className="notes-kit__terms">
        {kit.terms.map((term) => <div key={term.term}><dt>{term.term}</dt><dd>{term.meaning}</dd></div>)}
      </dl>
      <Button block variant="secondary" onClick={() => save(kit)}>Save to my Notes</Button>
      <h2 className="learn-subhead">Explain it at my level</h2>
      {aiOn && course.origin === 'generated' ? (
        <div className="chip-row">
          {LEVELS.map((level) => <Button key={level} small variant="secondary" disabled={busy} onClick={() => void changeLevel(level)}>{level}</Button>)}
        </div>
      ) : <p className="muted">{course.origin === 'sample' ? 'Hoot can rewrite notes for your level on courses you build.' : 'Hoot can rewrite these notes for your level when course building is on.'}</p>}
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
