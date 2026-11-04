import type { AgendaItem } from '../lib/agenda'
import { formatClock, formatDue } from '../lib/dates'
import { useAppData } from '../state/appDataContext'
import { Checkbox } from './Checkbox'
import { Tag } from './Tag'

type DayAgendaProps = {
  items: AgendaItem[]
  now: Date
  onOpenItem?: (item: AgendaItem) => void // tap a plan or task to change it
  showTimes?: boolean // hide the time column when nothing has a time
}

// Everything on one day, in time order. Classes show a colored bar;
// things you can finish (due, planned, tasks) get a checkbox.
export function DayAgenda({ items, now, onOpenItem, showTimes = true }: DayAgendaProps) {
  const { isDone, setDone, setTaskDone, assignments, courseById } = useAppData()

  if (items.length === 0) return <p className="agenda-empty">Nothing yet</p>

  return (
    <ul className="agenda">
      {items.map((item) => {
        const time = item.time ? formatClock(item.time) : ''

        if (item.type === 'class') {
          return (
            <li key={item.key} className="agenda__item agenda__item--class">
              {showTimes && <span className="agenda__time">{time}</span>}
              <span className="agenda__bar" style={{ background: `var(--class-${item.course.color})` }} />
              <span className="agenda__main">
                <span className="agenda__title">{item.course.code} class</span>
                <span className="agenda__meta">
                  {formatClock(item.time)}–{formatClock(item.endTime)}
                  {item.place ? ` · ${item.place}` : ''}
                </span>
              </span>
            </li>
          )
        }

        if (item.type === 'task') {
          const { task } = item
          // A study session is a task linked to an exam: show that exam's class.
          const exam = task.assignmentId ? assignments.find((a) => a.id === task.assignmentId) : undefined
          const examCourse = exam ? courseById(exam.courseId) : undefined
          return (
            <li key={item.key} className={task.done ? 'agenda__item agenda__item--done' : 'agenda__item'}>
              {showTimes && <span className="agenda__time">{time}</span>}
              <Checkbox checked={task.done} onChange={(done) => setTaskDone(task.id, done)} label={`Mark ${task.title} done`} />
              <button type="button" className="agenda__main" onClick={() => onOpenItem?.(item)}>
                <span className="agenda__meta">
                  {examCourse ? (
                    <><span className="dot" style={{ background: `var(--class-${examCourse.color})` }} aria-hidden="true" />Study · {examCourse.code}</>
                  ) : (
                    <><span className="dot dot--me" aria-hidden="true" />My task</>
                  )}
                </span>
                <span className="agenda__title">{task.title}</span>
              </button>
            </li>
          )
        }

        // "due" and "plan" are both about an assignment.
        const { assignment, course } = item
        const done = isDone(assignment.id)
        const late = !done && assignment.due < now
        const kindTag = assignment.kind === 'exam' ? 'Exam' : assignment.kind === 'quiz' ? 'Quiz' : null
        return (
          <li key={item.key} className={done ? 'agenda__item agenda__item--done' : 'agenda__item'}>
            {showTimes && <span className={late && item.type === 'due' ? 'agenda__time agenda__time--late' : 'agenda__time'}>{time}</span>}
            <Checkbox checked={done} onChange={(value) => setDone(assignment.id, value)} label={`Mark ${assignment.title} done`} />
            <button type="button" className="agenda__main" onClick={() => onOpenItem?.(item)}>
              <span className="agenda__meta">
                <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
                {item.type === 'due' ? 'Due' : 'Work on'} · {course?.code}
                {kindTag && <Tag>{kindTag}</Tag>}
              </span>
              <span className="agenda__title">{assignment.title}</span>
              {item.type === 'plan' && <span className="agenda__meta">Due {formatDue(assignment.due, now)}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
