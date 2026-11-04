import { useState } from 'react'
import { DayAgenda } from '../components/DayAgenda'
import { Icon } from '../components/Icon'
import { PlanSheet, type PlanSheetMode } from '../components/PlanSheet'
import { itemsForDay, type AgendaItem } from '../lib/agenda'
import { addDays, DAY_NAMES, isSameDay, MONTH_NAMES, startOfDay, startOfWeek, toDateKey } from '../lib/dates'
import { useAppData } from '../state/appDataContext'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// A month grid. Dots show what's due (in class colors) and your own tasks
// (gray). Tap a day to see everything on it below the grid.
export function CalendarScreen() {
  const data = useAppData()
  const [now] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(() => startOfDay(now))
  const [sheet, setSheet] = useState<PlanSheetMode | null>(null)

  // Six rows of seven days, starting on the Monday on or before the 1st.
  const gridStart = startOfWeek(month)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  function dotsFor(day: Date): string[] {
    const dots = data.assignments
      .filter((a) => isSameDay(a.due, day))
      .map((a) => `var(--class-${data.courseById(a.courseId)?.color ?? 1})`)
    if (data.tasks.some((t) => t.date === toDateKey(day) && !t.assignmentId)) dots.push('var(--text-tertiary)')
    return dots.slice(0, 3)
  }

  // The Calendar shows when things ARE: classes, due dates and your own tasks.
  // Plans and study sessions live on the Planner.
  const dayItems = itemsForDay(selected, data).filter(
    (item) => item.type !== 'plan' && !(item.type === 'task' && item.task.assignmentId),
  )

  function changeMonth(step: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))
  }

  function openItem(item: AgendaItem) {
    if (item.type === 'task') setSheet({ kind: 'task', task: item.task })
    else if (item.type === 'plan' || item.type === 'due') setSheet({ kind: 'assignment', assignment: item.assignment })
  }

  return (
    <>
      <div className="screen-head">
        <h1 className="screen-title">{MONTH_NAMES[month.getMonth()]} <span className="muted-inline">{month.getFullYear()}</span></h1>
        <div className="week-nav">
          <button type="button" className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <Icon name="back" size={20} />
          </button>
          <button type="button" className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            <Icon name="next" size={20} />
          </button>
        </div>
      </div>

      <div className="month" role="grid" aria-label="Month">
        {WEEKDAY_LETTERS.map((letter, i) => (
          <span key={i} className="month__weekday" aria-hidden="true">{letter}</span>
        ))}
        {cells.map((day) => {
          const inMonth = day.getMonth() === month.getMonth()
          const classes = ['month__day']
          if (!inMonth) classes.push('month__day--outside')
          if (isSameDay(day, now)) classes.push('month__day--today')
          if (isSameDay(day, selected)) classes.push('month__day--selected')
          return (
            <button key={toDateKey(day)} type="button" className={classes.join(' ')} onClick={() => setSelected(day)}
              aria-pressed={isSameDay(day, selected)} aria-label={day.toDateString()}>
              <span className="month__num">{day.getDate()}</span>
              <span className="month__dots">
                {dotsFor(day).map((color, i) => <span key={i} className="dot dot--small" style={{ background: color }} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="day__head">
        <h2 className="day__name">
          {DAY_NAMES[selected.getDay()]} <span className="day__date">{MONTH_NAMES[selected.getMonth()].slice(0, 3)} {selected.getDate()}</span>
        </h2>
        <button type="button" className="icon-btn" onClick={() => setSheet({ kind: 'add', dateKey: toDateKey(selected) })}
          aria-label="Add to this day">
          <Icon name="plus" size={20} />
        </button>
      </div>
      <DayAgenda items={dayItems} now={now} onOpenItem={openItem} />

      {sheet && <PlanSheet mode={sheet} now={now} onClose={() => setSheet(null)} />}
    </>
  )
}
