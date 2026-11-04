import { useState } from 'react'
import { Button } from '../components/Button'
import { DayAgenda } from '../components/DayAgenda'
import { Icon } from '../components/Icon'
import { PlanSheet, type PlanSheetMode } from '../components/PlanSheet'
import { SectionHeader } from '../components/SectionHeader'
import { itemsForDay, type AgendaItem } from '../lib/agenda'
import { addDays, DAY_NAMES, formatDue, isSameDay, MONTH_NAMES, SHORT_DAY_NAMES, startOfWeek, toDateKey } from '../lib/dates'
import { suggestedStudyDays } from '../lib/study'
import { useAppData } from '../state/appDataContext'

// The Planner is only about YOUR plan: what you'll work on each day.
// (When things are due or when classes meet lives on the Calendar.)
export function PlannerScreen() {
  const data = useAppData()
  const { assignments, isDone, plans, tasks, skippedExams, skipExam, addTask, courseById } = data
  const [now] = useState(() => new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now))
  const [sheet, setSheet] = useState<PlanSheetMode | null>(null)

  const twoWeeksOut = addDays(now, 14)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = days[6]
  const short = (d: Date) => `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`

  // The tray: unfinished work due in the next two weeks that has no day yet.
  // Exams aren't "worked on" in one go, so they get study sessions instead.
  const toPlan = assignments
    .filter((a) => a.kind !== 'exam' && !isDone(a.id) && !plans[a.id] && a.due >= now && a.due < twoWeeksOut)
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  // Exams coming up that don't have study sessions yet (and weren't dismissed).
  const examsToStudyFor = assignments.filter(
    (a) =>
      a.kind === 'exam' && !isDone(a.id) && a.due >= now && a.due < twoWeeksOut &&
      !skippedExams.includes(a.id) && !tasks.some((t) => t.assignmentId === a.id) &&
      suggestedStudyDays(a.due, now).length > 0,
  )

  function addStudySessions(examId: string, examTitle: string, examDue: Date) {
    for (const day of suggestedStudyDays(examDue, now)) {
      addTask({ title: `Study for ${examTitle}`, date: toDateKey(day), assignmentId: examId })
    }
  }

  function openItem(item: AgendaItem) {
    if (item.type === 'task') setSheet({ kind: 'task', task: item.task })
    else if (item.type === 'plan' || item.type === 'due') setSheet({ kind: 'assignment', assignment: item.assignment })
  }

  return (
    <>
      <h1 className="screen-title">Plan</h1>

      {examsToStudyFor.map((exam) => {
        const course = courseById(exam.courseId)
        const studyDays = suggestedStudyDays(exam.due, now)
        return (
          <div key={exam.id} className="suggestion">
            <span className="row__class">
              <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
              {course?.code} · {exam.title} {formatDue(exam.due, now)}
            </span>
            <p className="suggestion__text">
              Study a little each day before: {studyDays.map((d) => SHORT_DAY_NAMES[d.getDay()]).join(', ')}.
            </p>
            <div className="suggestion__actions">
              <Button small onClick={() => addStudySessions(exam.id, exam.title, exam.due)}>
                Add {studyDays.length} study {studyDays.length === 1 ? 'session' : 'sessions'}
              </Button>
              <Button small variant="ghost" onClick={() => skipExam(exam.id)}>Not now</Button>
            </div>
          </div>
        )
      })}

      <section aria-label="To plan">
        <SectionHeader label="To plan" count={toPlan.length} />
        {toPlan.length === 0 ? (
          <p className="agenda-empty agenda-empty--flush">Everything coming up has a day.</p>
        ) : (
          <ul className="agenda">
            {toPlan.map((a) => {
              const course = courseById(a.courseId)
              return (
                <li key={a.id} className="agenda__item">
                  <button type="button" className="agenda__main" onClick={() => setSheet({ kind: 'assignment', assignment: a })}>
                    <span className="agenda__meta">
                      <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
                      {course?.code} · due {formatDue(a.due, now)}
                    </span>
                    <span className="agenda__title">{a.title}</span>
                  </button>
                  <Button small variant="secondary" onClick={() => setSheet({ kind: 'assignment', assignment: a })}>Plan</Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="week-bar">
        <button type="button" className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
          <Icon name="back" size={20} />
        </button>
        <span className="week-bar__range">{short(weekStart)} – {short(weekEnd)}</span>
        <button type="button" className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
          <Icon name="next" size={20} />
        </button>
      </div>

      {days.map((day) => {
        const isToday = isSameDay(day, now)
        // Only your plan: planned assignments, study sessions, and your tasks.
        const planItems = itemsForDay(day, data).filter((item) => item.type === 'plan' || item.type === 'task')
        return (
          <section key={toDateKey(day)} className="day" aria-label={DAY_NAMES[day.getDay()]}>
            <div className="day__head">
              <h2 className={isToday ? 'day__name day__name--today' : 'day__name'}>
                {DAY_NAMES[day.getDay()]} <span className="day__date">{day.getDate()}</span>
                {isToday && <span className="day__today">Today</span>}
              </h2>
              <button type="button" className="icon-btn" onClick={() => setSheet({ kind: 'add', dateKey: toDateKey(day) })}
                aria-label={`Add to ${DAY_NAMES[day.getDay()]}`}>
                <Icon name="plus" size={20} />
              </button>
            </div>
            {planItems.length === 0 ? (
              <p className="agenda-empty agenda-empty--flush">Nothing planned</p>
            ) : (
              <DayAgenda items={planItems} now={now} onOpenItem={openItem} showTimes={planItems.some((i) => i.time)} />
            )}
          </section>
        )
      })}

      {sheet && <PlanSheet mode={sheet} now={now} onClose={() => setSheet(null)} />}
    </>
  )
}
