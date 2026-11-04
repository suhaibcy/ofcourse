import { useState } from 'react'
import { AssignmentRow } from '../components/AssignmentRow'
import { DayAgenda } from '../components/DayAgenda'
import { Icon } from '../components/Icon'
import { PlanSheet, type PlanSheetMode } from '../components/PlanSheet'
import { SectionHeader } from '../components/SectionHeader'
import { WeekCard } from '../components/WeekCard'
import { itemsForDay, type AgendaItem } from '../lib/agenda'
import { addDays } from '../lib/dates'
import { sectionFor, type Section } from '../lib/sections'
import { useAppData } from '../state/appDataContext'

const sections: { id: Section; label: string }[] = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
  { id: 'week', label: 'This week' },
  { id: 'later', label: 'Later' },
]

const SHOW_FIRST = 8 // a section with more than this many shows "Show all"

// "Good morning" before noon, "Good afternoon" until 5 PM, then "Good evening".
function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function TodayScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const data = useAppData()
  const { name, assignments, isDone, setDone, courseById } = data
  const [now] = useState(() => new Date()) // read the clock once per visit
  const [sheet, setSheet] = useState<PlanSheetMode | null>(null)
  const [expanded, setExpanded] = useState<Section[]>([]) // sections opened with "Show all"

  // Only what you planned for today, plus your own tasks for today.
  const planned = itemsForDay(now, data).filter((item) => item.type === 'plan' || item.type === 'task')

  // Overdue only shows unfinished things from the past week. The feed can't
  // tell us what was submitted, so older ones are assumed handled.
  const weekAgo = addDays(now, -7)
  function inSection(section: Section) {
    return assignments.filter((a) => {
      if (sectionFor(a.due, now) !== section) return false
      return section !== 'overdue' || (!isDone(a.id) && a.due >= weekAgo)
    })
  }

  function updatedLabel(): string {
    if (data.feedRefreshing) return 'Updating…'
    if (!data.feedUpdatedAt) return ''
    const minutes = Math.round((now.getTime() - data.feedUpdatedAt) / 60000)
    if (minutes < 1) return 'Updated just now'
    if (minutes < 60) return `Updated ${minutes} min ago`
    return `Updated ${Math.round(minutes / 60)} h ago`
  }

  function openItem(item: AgendaItem) {
    if (item.type === 'task') setSheet({ kind: 'task', task: item.task })
    else if (item.type === 'plan' || item.type === 'due') setSheet({ kind: 'assignment', assignment: item.assignment })
  }

  return (
    <>
      <div className="today-head">
        <h1 className="greeting">{greetingFor(now.getHours())}, {name}</h1>
        <button type="button" className="profile-btn" onClick={onOpenSettings} aria-label="Settings and classes">
          <Icon name="profile" size={22} />
        </button>
      </div>
      <p className="summary">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      <WeekCard
        now={now}
        overdue={inSection('overdue')}
        updatedLabel={data.feedLive ? updatedLabel() : 'Sample data'}
        onRefresh={() => void data.refreshFeed()}
        onPlan={(list) => setSheet({ kind: 'queue', assignments: list })}
      />

      {planned.length > 0 && (
        <section aria-label="Planned for today" className="group-card">
          <SectionHeader label="Planned for today" count={planned.length} />
          <DayAgenda items={planned} now={now} onOpenItem={openItem} />
        </section>
      )}

      {sections.map((section) => {
        const items = inSection(section.id)
        if (items.length === 0) return null
        // Long sections show the first few, with "Show all" to open the rest.
        const isLong = items.length > SHOW_FIRST
        const open = expanded.includes(section.id)
        const shown = isLong && !open ? items.slice(0, SHOW_FIRST) : items
        return (
          <section key={section.id} aria-label={section.label}
            className={section.id === 'overdue' ? 'group-card group-card--overdue' : 'group-card'}>
            <SectionHeader label={section.label} count={items.length} />
            {shown.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                course={courseById(assignment.courseId)}
                done={isDone(assignment.id)}
                onToggleDone={(done) => setDone(assignment.id, done)}
                now={now}
                onOpen={() => setSheet({ kind: 'assignment', assignment })}
              />
            ))}
            {isLong && (
              <button type="button" className="group-card__more" aria-expanded={open}
                onClick={() => setExpanded(open ? expanded.filter((id) => id !== section.id) : [...expanded, section.id])}>
                {open ? 'Show less' : `Show all ${items.length}`}
              </button>
            )}
          </section>
        )
      })}

      {!data.feedLive && <p className="sample-note">Sample assignments. Your real ones arrive in Step 5.</p>}
      {sheet && <PlanSheet mode={sheet} now={now} onClose={() => setSheet(null)} />}
    </>
  )
}
