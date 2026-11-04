import type { Assignment } from '../data/sampleAssignments'
import { addDays, isSameDay, startOfDay } from '../lib/dates'
import { sectionFor } from '../lib/sections'
import { useAppData } from '../state/appDataContext'
import { Icon } from './Icon'

// The card at the top of Today: how this week is going, at a glance.
// Inspired by Bevel's home card (rings with big numbers, one coaching line,
// "last updated"), in ofCourse's own calm style. See docs/launch-plan.md.

type WeekCardProps = {
  now: Date
  overdue: Assignment[]
  updatedLabel: string
  onRefresh: () => void
  onPlan: (assignments: Assignment[]) => void
}

export function WeekCard({ now, overdue, updatedLabel, onRefresh, onPlan }: WeekCardProps) {
  const { assignments, isDone, plans } = useAppData()

  const week = assignments.filter((a) => {
    const section = sectionFor(a.due, now)
    return section === 'today' || section === 'week'
  })
  const today = week.filter((a) => sectionFor(a.due, now) === 'today')
  const done = week.filter((a) => isDone(a.id))
  const left = week.filter((a) => !isDone(a.id))
  const planned = left.filter((a) => plans[a.id])
  const unplanned = left.filter((a) => !plans[a.id])

  return (
    <section className="week-card" aria-label="Your week">
      <div className="week-card__head">
        <h2 className="week-card__title">Your week</h2>
        {updatedLabel && (
          <button type="button" className="week-card__updated" onClick={onRefresh}>
            {updatedLabel}
          </button>
        )}
      </div>

      <div className="week-card__rings">
        <Ring label="Due today" part={today.filter((a) => isDone(a.id)).length} whole={today.length} />
        <Ring label="Planned" part={planned.length} whole={left.length} />
        <Ring label="Done" part={done.length} whole={week.length} tone="success" />
      </div>

      {unplanned.length > 0 && (
        <button type="button" className="week-card__unplanned" onClick={() => onPlan(unplanned)}>
          <span className="dot" style={{ background: 'var(--due-soon)' }} aria-hidden="true" />
          <span>{unplanned.length} unplanned</span>
          <span className="week-card__plan-link">
            Plan now <Icon name="next" size={16} />
          </span>
        </button>
      )}

      <p className="week-card__nudge">{nudgeFor({ now, overdue, week, left, unplanned })}</p>
    </section>
  )
}

// A ring that fills as `part` gets closer to `whole`, with "part/whole" inside.
function Ring({ label, part, whole, tone = 'primary' }: {
  label: string
  part: number
  whole: number
  tone?: 'primary' | 'success'
}) {
  const size = 64
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = whole === 0 ? 0 : part / whole
  const color = tone === 'success' ? 'var(--success)' : 'var(--primary)'

  return (
    <div className="ring" role="img" aria-label={whole === 0 ? `${label}: nothing` : `${label}: ${part} of ${whole}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          className="ring__fill"
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring__value" aria-hidden="true">
        {whole === 0 ? 'None' : `${part}/${whole}`}
      </span>
      <span className="ring__label" aria-hidden="true">{label}</span>
    </div>
  )
}

// One short coaching line, from simple rules (the Pro AI coach can write these later).
function nudgeFor({ now, overdue, week, left, unplanned }: {
  now: Date
  overdue: Assignment[]
  week: Assignment[]
  left: Assignment[]
  unplanned: Assignment[]
}): string {
  if (overdue.length === 1) return `${overdue[0].title} is overdue. Start there.`
  if (overdue.length > 1) return `${overdue.length} things are overdue. Start with the oldest.`
  if (week.length === 0) return 'Nothing due this week. Enjoy it.'
  if (left.length === 0) return 'Everything this week is done. Nice work.'
  const tomorrow = addDays(startOfDay(now), 1)
  const tomorrowUnplanned = unplanned.filter((a) => isSameDay(a.due, tomorrow))
  if (tomorrowUnplanned.length === 1) return `${tomorrowUnplanned[0].title} is due tomorrow and isn't planned yet.`
  if (tomorrowUnplanned.length > 1) return `${tomorrowUnplanned.length} things due tomorrow aren't planned yet.`
  if (unplanned.length > 0) return 'Plan the rest of your week in a minute.'
  return "Everything's planned. You're set."
}
