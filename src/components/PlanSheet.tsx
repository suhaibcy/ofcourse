import { useState } from 'react'
import type { Assignment } from '../data/sampleAssignments'
import { addDays, DAY_NAMES, formatDue, fromDateKey, SHORT_DAY_NAMES, startOfDay, toDateKey } from '../lib/dates'
import { useSheetClose } from '../lib/useSheetClose'
import { useAppData, type Task } from '../state/appDataContext'
import { useToast } from '../state/toastContext'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'

// Three ways this panel opens:
//  - "add": from a day's + button: plan an assignment or add a task for that day
//  - "assignment": tapped an assignment: pick a day to work on it
//  - "task": tapped your own task or a study session: move or delete it
//  - "queue": tapped "4 unplanned" on the Your week card: plan them one after another
export type PlanSheetMode =
  | { kind: 'add'; dateKey: string }
  | { kind: 'assignment'; assignment: Assignment }
  | { kind: 'task'; task: Task }
  | { kind: 'queue'; assignments: Assignment[] }

type PlanSheetProps = {
  mode: PlanSheetMode
  now: Date
  onClose: () => void
}

export function PlanSheet({ mode, now, onClose }: PlanSheetProps) {
  if (mode.kind === 'add') return <AddToDay dateKey={mode.dateKey} now={now} onClose={onClose} />
  if (mode.kind === 'assignment') return <PlanAssignment assignment={mode.assignment} now={now} onClose={onClose} />
  if (mode.kind === 'queue') return <PlanQueue assignments={mode.assignments} now={now} onClose={onClose} />
  return <TaskDetails task={mode.task} now={now} onClose={onClose} />
}

// One sheet that walks through several assignments: pick a day (or skip) and
// the next one slides in, so planning the whole week takes a few taps.
function PlanQueue({ assignments, now, onClose }: { assignments: Assignment[]; now: Date; onClose: () => void }) {
  const { planAssignment, courseById } = useAppData()
  const [index, setIndex] = useState(0)
  const [plannedCount, setPlannedCount] = useState(0)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()
  const assignment = assignments[index]
  const course = courseById(assignment.courseId)
  const today = startOfDay(now)
  const last = startOfDay(assignment.due) < today ? today : startOfDay(assignment.due)

  // Closing early (the X, or tapping outside) still says what got planned.
  function finish(total: number) {
    if (total > 0) showToast(`Planned ${total} of ${assignments.length}`)
    close()
  }

  function next(planned: boolean) {
    const total = plannedCount + (planned ? 1 : 0)
    setPlannedCount(total)
    if (index + 1 < assignments.length) setIndex(index + 1)
    else finish(total)
  }

  return (
    <BottomSheet title={`Plan ${index + 1} of ${assignments.length}`} onClose={() => finish(plannedCount)} closing={closing}>
      <div key={assignment.id} className="plan-queue__item">
        <p className="row__class">
          <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
          {course?.code}
        </p>
        <p className="plan-queue__title">{assignment.title}</p>
        <p className="muted">Due {formatDue(assignment.due, now)}</p>
        <p className="field__label">When will you work on it?</p>
        <DayPicker first={today} last={last} onPick={(key) => { planAssignment(assignment.id, key); next(true) }} />
      </div>
      <Button variant="ghost" onClick={() => next(false)}>Skip</Button>
    </BottomSheet>
  )
}

// "today", "tomorrow", or a weekday name, for the message after you save.
function dayWord(dateKey: string, now: Date): string {
  if (dateKey === toDateKey(now)) return 'today'
  if (dateKey === toDateKey(addDays(startOfDay(now), 1))) return 'tomorrow'
  return DAY_NAMES[fromDateKey(dateKey).getDay()]
}

function dayTitle(dateKey: string): string {
  const day = fromDateKey(dateKey)
  return `${DAY_NAMES[day.getDay()]}, ${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

// A row of day buttons from `first` to `last` (at most 14 days).
function DayPicker({ first, last, selected, onPick }: {
  first: Date
  last: Date
  selected?: string
  onPick: (dateKey: string) => void
}) {
  const days: Date[] = []
  for (let day = first; day <= last && days.length < 14; day = addDays(day, 1)) days.push(day)
  return (
    <div className="day-picker">
      {days.map((day) => {
        const key = toDateKey(day)
        return (
          <button key={key} type="button" className={selected === key ? 'day-picker__day day-picker__day--on' : 'day-picker__day'}
            aria-pressed={selected === key} onClick={() => onPick(key)}>
            <span>{SHORT_DAY_NAMES[day.getDay()]}</span>
            <strong>{day.getDate()}</strong>
          </button>
        )
      })}
    </div>
  )
}

function AddToDay({ dateKey, now, onClose }: { dateKey: string; now: Date; onClose: () => void }) {
  const { assignments, isDone, plans, planAssignment, addTask, courseById } = useAppData()
  const [tab, setTab] = useState<'plan' | 'task'>('plan')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const day = fromDateKey(dateKey)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  // Unfinished work that isn't planned for this day yet and is due on or after it.
  const choices = assignments.filter(
    (a) => !isDone(a.id) && plans[a.id] !== dateKey && a.due >= startOfDay(now) && a.due >= day,
  )

  function saveTask() {
    if (!title.trim()) return
    addTask({ title: title.trim(), date: dateKey, time: time || undefined })
    showToast(`Task added for ${dayWord(dateKey, now)}`)
    close()
  }

  return (
    <BottomSheet title={dayTitle(dateKey)} onClose={close} closing={closing}>
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'plan'} onClick={() => setTab('plan')}>Plan an assignment</button>
        <button type="button" role="tab" aria-selected={tab === 'task'} onClick={() => setTab('task')}>New task</button>
      </div>

      {tab === 'plan' ? (
        choices.length === 0 ? (
          <p className="muted">Nothing left to plan for this day.</p>
        ) : (
          <ul className="pick-list">
            {choices.map((a) => {
              const course = courseById(a.courseId)
              return (
                <li key={a.id}>
                  <button type="button" className="pick-list__item" onClick={() => {
                    planAssignment(a.id, dateKey)
                    showToast(`Planned for ${dayWord(dateKey, now)}`)
                    close()
                  }}>
                    <span className="row__class">
                      <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
                      {course?.code}
                    </span>
                    <span className="row__title">{a.title}</span>
                    <span className="pick-list__due">Due {formatDue(a.due, now)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )
      ) : (
        <form className="form" onSubmit={(event) => { event.preventDefault(); saveTask() }}>
          <label className="field">
            <span className="field__label">Task</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Psych research credits" autoFocus />
          </label>
          <label className="field">
            <span className="field__label">Time (optional)</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <Button type="submit" block disabled={!title.trim()}>Add task</Button>
        </form>
      )}
    </BottomSheet>
  )
}

function PlanAssignment({ assignment, now, onClose }: { assignment: Assignment; now: Date; onClose: () => void }) {
  const { plans, planAssignment, courseById } = useAppData()
  const course = courseById(assignment.courseId)
  const planned = plans[assignment.id]
  const today = startOfDay(now)
  // From today up to the due date (at least today, even if it's already late).
  const last = startOfDay(assignment.due) < today ? today : startOfDay(assignment.due)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  return (
    <BottomSheet title={assignment.title} onClose={close} closing={closing}>
      <p className="muted">{course?.code} · Due {formatDue(assignment.due, now)}</p>
      <p className="field__label">When will you work on it?</p>
      <DayPicker first={today} last={last} selected={planned}
        onPick={(key) => { planAssignment(assignment.id, key); showToast(`Planned for ${dayWord(key, now)}`); close() }} />
      {planned && (
        <Button variant="ghost" onClick={() => { planAssignment(assignment.id, null); showToast('Removed from your plan'); close() }}>
          Remove from plan
        </Button>
      )}
    </BottomSheet>
  )
}

function TaskDetails({ task, now, onClose }: { task: Task; now: Date; onClose: () => void }) {
  const { deleteTask, moveTask, assignments } = useAppData()
  const today = startOfDay(now)
  // A study session can move to any day before its exam; a task, to the next two weeks.
  const exam = assignments.find((a) => a.id === task.assignmentId)
  const last = exam ? addDays(startOfDay(exam.due), -1) : addDays(today, 13)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  return (
    <BottomSheet title={task.title} onClose={close} closing={closing}>
      <p className="muted">{exam ? 'Study session' : 'My task'} · {dayTitle(task.date)}</p>
      {last >= today && (
        <>
          <p className="field__label">Move to</p>
          <DayPicker first={today} last={last} selected={task.date}
            onPick={(key) => { moveTask(task.id, key); showToast(`Moved to ${dayWord(key, now)}`); close() }} />
        </>
      )}
      <Button variant="destructive" block onClick={() => { deleteTask(task.id); showToast(exam ? 'Session removed' : 'Task deleted'); close() }}>
        {exam ? 'Remove session' : 'Delete task'}
      </Button>
    </BottomSheet>
  )
}
