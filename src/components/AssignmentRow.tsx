import type { Assignment } from '../data/sampleAssignments'
import type { Course } from '../data/sampleClasses'
import { formatDue } from '../lib/dates'
import { Checkbox } from './Checkbox'
import { Tag } from './Tag'

type AssignmentRowProps = {
  assignment: Assignment
  course?: Course
  done: boolean
  onToggleDone: (done: boolean) => void
  now: Date
  onOpen?: () => void // tapping the text (e.g. to plan it)
}

const THREE_HOURS = 3 * 60 * 60 * 1000

// One line in the list: checkbox, class dot and code, title, due time.
export function AssignmentRow({ assignment, course, done, onToggleDone, now, onOpen }: AssignmentRowProps) {
  const { title, due, kind } = assignment
  const msLeft = due.getTime() - now.getTime()

  // Pick the row's look: done wins over late or due soon.
  let rowClass = 'row'
  if (done) rowClass += ' row--done'
  else if (msLeft < 0) rowClass += ' row--overdue'
  else if (msLeft < THREE_HOURS) rowClass += ' row--soon'

  return (
    <div className={rowClass}>
      <Checkbox checked={done} onChange={onToggleDone} label={`Mark ${title} done`} />
      <button type="button" className="row__main" onClick={onOpen} disabled={!onOpen}>
        <span className="row__class">
          <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
          {course?.code ?? 'Class'}
          {kind === 'exam' && <Tag>Exam</Tag>}
          {kind === 'quiz' && <Tag>Quiz</Tag>}
        </span>
        <span className="row__title">{title}</span>
      </button>
      <span className="row__due">{done ? 'Done' : formatDue(due, now)}</span>
    </div>
  )
}
