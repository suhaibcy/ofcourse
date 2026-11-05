import { useEffect, useState } from 'react'
import { AskButton } from './components/AskButton'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TabBar, type TabId } from './components/TabBar'
import { CalendarScreen } from './screens/CalendarScreen'
import { ClassesScreen } from './screens/ClassesScreen'
import { LearnScreen } from './screens/LearnScreen'
import { NotesScreen } from './screens/NotesScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PlannerScreen } from './screens/PlannerScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'
import { PLANNER_HASH, routeFor } from './lib/route'
import { useAppData } from './state/appDataContext'

// Pages opened from the profile button on Today (not tabs of their own).
type Page = 'settings' | null

// How deep each page is: Today (0) > Settings (1).
const depth = (page: Page) => (page === 'settings' ? 1 : 0)

// How the next screen comes in (see motion.css):
// "tab" fades up, "push" slides in from the right, "pop" (going back) from the left.
type Transition = 'tab' | 'push' | 'pop'

// The app shell: the current screen, the floating Ask button,
// and the tab bar at the bottom.
function App() {
  const { onboarded } = useAppData()
  const [tab, setTab] = useState<TabId>('today')
  const [page, setPage] = useState<Page>(null)
  const [transition, setTransition] = useState<Transition>('tab')
  const [learnHash, setLearnHash] = useState(window.location.hash)
  const [learnKey, setLearnKey] = useState(0) // a new key rebuilds Learn after a crash

  useEffect(() => {
    const onChange = () => setLearnHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  function changeTab(next: TabId) {
    setTransition('tab')
    setTab(next)
    setPage(null)
    window.scrollTo(0, 0)
  }

  function openPage(next: Page) {
    setTransition(depth(next) > depth(page) ? 'push' : 'pop')
    setPage(next)
    window.scrollTo(0, 0)
  }

  // Learn opens before the onboarding check. Leaving it for the planner is an explicit choice.
  if (routeFor(learnHash, onboarded) === 'learn') {
    return (
      <main className="app app--learn">
        <div className="screen screen--tab">
          <ErrorBoundary actionLabel="Back to Learn" onReset={() => setLearnKey((n) => n + 1)}>
            <LearnScreen key={learnKey} noteId={learnHash.split('note=')[1]} onExit={() => { window.location.hash = PLANNER_HASH }} />
          </ErrorBoundary>
        </div>
      </main>
    )
  }

  // First time: onboarding instead of the tabs (no tab bar, no Ask button).
  if (!onboarded) return <OnboardingScreen />

  let screen
  if (page === 'settings') screen = <SettingsScreen onBack={() => openPage(null)} />
  else if (tab === 'today') screen = <TodayScreen onOpenSettings={() => openPage('settings')} />
  else if (tab === 'planner') screen = <PlannerScreen />
  else if (tab === 'calendar') screen = <CalendarScreen />
  else if (tab === 'notes') screen = <NotesScreen />
  else screen = <ClassesScreen />

  return (
    <>
      <main className="app">
        {/* A new key for each screen makes React build it fresh, so its entrance animation plays */}
        <div key={page ?? tab} className={`screen screen--${transition}`}>{screen}</div>
      </main>
      <AskButton />
      <TabBar active={tab} onChange={changeTab} />
    </>
  )
}

export default App
