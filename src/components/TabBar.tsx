import { Icon, type IconName } from './Icon'

export type TabId = 'today' | 'planner' | 'calendar' | 'notes' | 'classes'

const tabs: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'planner', label: 'Planner', icon: 'planner' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'notes', label: 'Notes', icon: 'notes' },
  { id: 'classes', label: 'Classes', icon: 'classes' },
]

type TabBarProps = {
  active: TabId
  onChange: (tab: TabId) => void
}

// The bar pinned to the bottom of the screen, like most iPhone apps.
export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === active ? 'tabbar__tab tabbar__tab--active' : 'tabbar__tab'}
          aria-current={tab.id === active ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="tabbar__icon"><Icon name={tab.icon} /></span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
