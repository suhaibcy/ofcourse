import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Hoot, type HootPose, type HootReaction } from '../components/Hoot'
import { Icon } from '../components/Icon'
import type { Assignment } from '../data/sampleAssignments'
import { addDays, DAY_NAMES, startOfDay, toDateKey } from '../lib/dates'
import { dayChoices, firstToPlan } from '../lib/onboarding'
import { useSheetClose } from '../lib/useSheetClose'
import { useAppData } from '../state/appDataContext'

// First-time flow, from the approved Claude Design mockups (docs/launch-plan.md):
// welcome → connect your classes → plan your first 3 → save your plan
// (account) → free and Pro → Home Screen → reminders → Today.
// Try first, account later (decision #16). Accounts aren't connected yet:
// the sign-in buttons move ahead until Supabase is added (next step).

type Step = 'welcome' | 'login' | 'connect' | 'plan' | 'save' | 'email' | 'code' | 'plans' | 'home' | 'reminders'

// Steps that show the 4-dash progress bar, and which dash they are.
const progress: Partial<Record<Step, number>> = { connect: 1, plan: 2, save: 3, email: 3, code: 3, home: 4 }

// Already installed to the Home Screen? Then skip that step.
function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

export function OnboardingScreen() {
  const { finishOnboarding, plans } = useAppData()
  const [step, setStep] = useState<Step>('welcome')
  const [direction, setDirection] = useState<'push' | 'pop'>('push')
  const [history, setHistory] = useState<Step[]>([])
  const [email, setEmail] = useState('')
  // A step can change Hoot's pose for a moment (wrong link → "oops", typing → "look").
  const [mood, setMood] = useState<HootPose | null>(null)
  // ...or make him react once (link works → hop, wrong link → shake, picked a day → nod).
  const [reaction, setReaction] = useState<HootReaction | null>(null)
  const react = useCallback((name: HootReaction['name']) => setReaction((r) => ({ name, key: (r?.key ?? 0) + 1 })), [])

  function go(next: Step) {
    setDirection('push')
    setHistory((h) => [...h, step])
    setStep(next)
    setMood(null)
  }
  function back() {
    setDirection('pop')
    setStep(history[history.length - 1] ?? 'welcome')
    setHistory((h) => h.slice(0, -1))
    setMood(null)
  }
  const afterAccount = () => go('plans')
  const afterPlans = () => (isInstalled() ? go('reminders') : go('home'))

  let content: ReactNode
  if (step === 'welcome') content = <Welcome onStart={() => go('connect')} onLogin={() => go('login')} />
  else if (step === 'login') content = <Login onDone={finishOnboarding} />
  else if (step === 'connect') content = <Connect onDone={() => go('plan')} onMood={setMood} onReact={react} />
  else if (step === 'plan') content = <PlanFirst onDone={() => go('save')} onMood={setMood} onReact={react} />
  else if (step === 'save') content = <SavePlan onGoogle={afterAccount} onEmail={() => go('email')} onSkip={afterAccount} />
  else if (step === 'email') content = <EmailEntry email={email} setEmail={setEmail} onSent={() => go('code')} />
  else if (step === 'code') content = <EmailCode email={email} onDone={afterAccount} />
  else if (step === 'plans') content = <Plans onDone={afterPlans} />
  else if (step === 'home') content = <AddToHome onDone={() => go('reminders')} />
  else content = <Reminders onDone={finishOnboarding} />

  const dash = progress[step]
  const hoot = hootFor[step]
  return (
    // reducedMotion="user": with the phone's "reduce motion" on, Motion skips
    // movement (slides, Hoot traveling) and keeps only fades.
    <MotionConfig reducedMotion="user">
      <main className="app onboarding">
        {withBack.includes(step) && (
          <button type="button" className="icon-btn onboarding__back" onClick={back} aria-label="Back">
            <Icon name="back" size={22} />
          </button>
        )}
        {dash !== undefined && (
          <div className="onboarding__progress" role="img" aria-label={`Step ${dash} of 4`}>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="onboarding__dash">
                {/* Each dash fills from the left (scaleX), not a color swap */}
                <motion.span className="onboarding__dash-fill" initial={false}
                  animate={{ transform: `scaleX(${n <= dash ? 1 : 0})` }}
                  transition={{ duration: 0.3, ease: EASE_DRAWER }} />
              </span>
            ))}
          </div>
        )}
        {/* One Hoot for the whole flow. He lives outside the sliding steps, so
            he stays on screen: "layout" springs him to his new size and spot,
            and his pose morphs inside Hoot.tsx. Steps without him shrink him away. */}
        <motion.div layout className={step === 'welcome' ? 'onboarding__hoot onboarding__hoot--hero' : 'onboarding__hoot'}
          initial={false} animate={{ opacity: hoot ? 1 : 0 }} transition={HOOT_SPRING}>
          <Hoot pose={mood ?? hoot?.pose ?? 'idle'} size={hoot?.size ?? 0} animate decorative reaction={reaction} />
          {/* "3 planned. Save your plan?": a small burst of confetti behind Hoot.
              Only when arriving (not when coming Back from the email step). */}
          {step === 'save' && direction === 'push' && Object.keys(plans).length > 0 && <Confetti />}
        </motion.div>
        {/* The old step slides out while the new one slides in. "popLayout"
            lifts the leaving step out of the layout so both can overlap. */}
        <div className="onboarding__stage">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div key={step} className="onboarding__step" custom={direction}
              variants={pageSlide} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: EASE_DRAWER }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </MotionConfig>
  )
}

// The iOS-style curve for things that slide across the screen (animate skill).
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

// Forward ("push"): new step comes from the right, old one drifts left and fades.
// Back ("pop"): the reverse. Full transform strings stay smooth on busy phones.
const pageSlide = {
  enter: (dir: 'push' | 'pop') => ({ transform: dir === 'push' ? 'translateX(100%)' : 'translateX(-30%)', opacity: dir === 'push' ? 1 : 0 }),
  center: { transform: 'translateX(0%)', opacity: 1 },
  exit: (dir: 'push' | 'pop') => ({ transform: dir === 'push' ? 'translateX(-30%)' : 'translateX(100%)', opacity: dir === 'push' ? 0 : 1 }),
}

// Apple-style spring for Hoot moving and resizing between steps.
const HOOT_SPRING = { type: 'spring', duration: 0.5, bounce: 0.2 } as const

// Hoot's pose and size on each step. Steps that aren't listed (typing your
// email or code, Free and Pro) hide him so the screen stays focused.
const hootFor: Partial<Record<Step, { pose: HootPose; size: number }>> = {
  welcome: { pose: 'hello', size: 180 },
  login: { pose: 'hello', size: 104 },
  connect: { pose: 'point', size: 120 },
  plan: { pose: 'think', size: 96 },
  save: { pose: 'celebrate', size: 120 },
  home: { pose: 'point', size: 104 },
  reminders: { pose: 'hello', size: 104 },
}

// Steps with a Back button in the top corner
const withBack: Step[] = ['login', 'email', 'code']

// Confetti pieces: where each one flies (x, y in px from Hoot's middle), how far
// it spins, and its class color. Fixed values, so it looks the same every time.
// Wide rather than tall: Hoot sits near the top, so pieces stop below the progress bar.
const confettiPieces = [
  { x: -118, y: -40, r: 200, c: 1 }, { x: -92, y: -70, r: -160, c: 3 }, { x: -48, y: -84, r: 240, c: 5 },
  { x: 0, y: -80, r: -220, c: 7 }, { x: 46, y: -84, r: 180, c: 2 }, { x: 90, y: -72, r: -240, c: 4 },
  { x: 120, y: -38, r: 160, c: 6 }, { x: -132, y: 0, r: -180, c: 4 }, { x: 134, y: 4, r: 220, c: 1 },
  { x: -70, y: -56, r: 140, c: 6 }, { x: 68, y: -52, r: -140, c: 3 }, { x: 20, y: -66, r: 260, c: 8 },
]

// Plays once when it appears (CSS animation in onboarding.css); hidden for "reduce motion".
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {confettiPieces.map((p, i) => (
        <span key={i} className={i % 3 === 0 ? 'confetti__piece confetti__piece--dot' : 'confetti__piece'}
          style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, background: `var(--class-${p.c})` } as CSSProperties} />
      ))}
    </div>
  )
}

// ---------- The steps ----------

function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <>
      <div className="onboarding__center">
        <p className="onboarding__eyebrow">Hi, I'm Hoot.</p>
        <h1 className="onboarding__hero">Everything due, in one calm place.</h1>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={onStart}>Get started</button>
        <button type="button" className="onboarding__link" onClick={onLogin}>I already have an account</button>
      </div>
    </>
  )
}

type MoodProps = { onMood: (pose: HootPose | null) => void; onReact: (name: HootReaction['name']) => void }

function Connect({ onDone, onMood, onReact }: { onDone: () => void } & MoodProps) {
  const { connectFeed } = useAppData()
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [help, setHelp] = useState(false)

  async function submit() {
    setChecking(true)
    setError('')
    const result = await connectFeed(link)
    setChecking(false)
    if (result.ok) {
      onReact('hop') // he hops while the next step slides in
      onDone()
    } else {
      setError(result.reason)
      onMood('oops') // Hoot looks worried until you try again
      onReact('shake')
    }
  }

  return (
    <>
      <div className="onboarding__center">
        <h1 className="onboarding__title">Connect your classes</h1>
        <p className="onboarding__text">Paste your Canvas calendar link. It only shares due dates.</p>
      </div>
      <form className="onboarding__actions" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <label className="field">
          <span className="field__label">Calendar link</span>
          <input className="input" type="url" inputMode="url" autoComplete="off" placeholder="Paste link"
            value={link} onChange={(e) => setLink(e.target.value)}
            onFocus={() => onMood(error ? 'oops' : 'look')} onBlur={() => onMood(error ? 'oops' : null)}
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'link-error' : undefined} />
        </label>
        {error && <p id="link-error" className="onboarding__error" role="alert">{error}</p>}
        <button type="button" className="onboarding__link" onClick={() => setHelp(true)}>Where do I find it?</button>
        <button type="submit" className="btn btn--primary btn--block" disabled={checking}>
          {checking ? 'Checking…' : 'Continue'}
        </button>
        {/* With no feed connected, the app already shows the sample assignments
            (useCanvasFeed.ts), so this just moves on. It's also how the Vercel
            preview gets past this step: it has no /api/feed until Step 7. */}
        <button type="button" className="onboarding__link" disabled={checking}
          onClick={() => { onReact('hop'); onDone() }}>
          Try it with sample classes
        </button>
      </form>
      {help && <LinkHelp onClose={() => setHelp(false)} />}
    </>
  )
}

function LinkHelp({ onClose }: { onClose: () => void }) {
  const { closing, close } = useSheetClose(onClose)
  return (
    <BottomSheet title="Find your calendar link" onClose={close} closing={closing}>
      <ol className="onboarding__steps">
        <li><span>1</span>In Canvas, open <strong>Calendar</strong></li>
        <li><span>2</span>Tap <strong>Calendar Feed</strong> at the bottom</li>
        <li><span>3</span>Copy the link</li>
      </ol>
      <button type="button" className="btn btn--primary btn--block" onClick={close}>Got it</button>
    </BottomSheet>
  )
}

function PlanFirst({ onDone, onMood, onReact }: { onDone: () => void } & MoodProps) {
  const { assignments, isDone, planAssignment, courseById } = useAppData()
  const [now] = useState(() => new Date())
  // Picked once when the step opens, so the list doesn't shift while planning.
  const [queue] = useState<Assignment[]>(() => firstToPlan(assignments, isDone, now))
  const [index, setIndex] = useState(0)
  const empty = queue.length === 0

  // Nothing to plan: Hoot naps.
  useEffect(() => {
    if (empty) onMood('sleep')
  }, [empty, onMood])

  if (empty) {
    // Nothing coming up: nothing to plan.
    return (
      <>
        <div className="onboarding__center">
          <h1 className="onboarding__title">Nothing due soon</h1>
          <p className="onboarding__text">When something new shows up in Canvas, it lands here.</p>
        </div>
        <div className="onboarding__actions">
          <button type="button" className="btn btn--primary btn--block" onClick={onDone}>Continue</button>
        </div>
      </>
    )
  }

  const assignment = queue[index]
  const course = courseById(assignment.courseId)
  const next = () => (index + 1 < queue.length ? setIndex(index + 1) : onDone())
  const today = startOfDay(now)
  const label = (day: Date) =>
    day.getTime() === today.getTime() ? 'Today'
      : day.getTime() === addDays(today, 1).getTime() ? 'Tomorrow'
        : DAY_NAMES[day.getDay()]
  const dueLabel = `Due ${label(startOfDay(assignment.due)).replace('Today', 'today').replace('Tomorrow', 'tomorrow')}`

  return (
    <>
      <div className="onboarding__center">
        <p className="onboarding__eyebrow">{index + 1} of {queue.length}</p>
        <h1 className="onboarding__title">When will you work on it?</h1>
      </div>
      {/* key: each assignment gets its own card. The done one slides out left
          while the next slides in from the right ("popLayout" lets them overlap).
          aria-live: VoiceOver reads the new card when it arrives (only additions
          are read, so the leaving card stays quiet). */}
      <div className="onboarding__card-slot" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={assignment.id} className="onboarding__card"
            initial={{ transform: 'translateX(24px)', opacity: 0 }}
            animate={{ transform: 'translateX(0px)', opacity: 1 }}
            exit={{ transform: 'translateX(-24px)', opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_DRAWER }}>
            <span className="row__class">
              <span className="dot" style={{ background: `var(--class-${course?.color ?? 1})` }} aria-hidden="true" />
              {course?.code}
            </span>
            <span className="onboarding__card-title">{assignment.title}</span>
            <span className="onboarding__text">{dueLabel}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="onboarding__actions">
        <div className="onboarding__days">
          {dayChoices(assignment.due, now).map((day) => (
            <button key={toDateKey(day)} type="button" className="onboarding__day"
              onClick={() => { planAssignment(assignment.id, toDateKey(day)); onReact('nod'); next() }}>
              {label(day)}
            </button>
          ))}
        </div>
        <button type="button" className="onboarding__link" onClick={next}>Skip this one</button>
      </div>
    </>
  )
}

function SavePlan({ onGoogle, onEmail, onSkip }: { onGoogle: () => void; onEmail: () => void; onSkip: () => void }) {
  const { plans } = useAppData()
  const count = Object.keys(plans).length
  return (
    <>
      <div className="onboarding__center">
        <h1 className="onboarding__title">{count > 0 ? `${count} planned. Save your plan?` : 'Save your plan?'}</h1>
        <p className="onboarding__text">A free account keeps it on every device.</p>
      </div>
      <div className="onboarding__actions">
        {/* Accounts arrive with Supabase (next step); for now these move ahead. */}
        <button type="button" className="btn btn--secondary btn--block" onClick={onGoogle}>Continue with Google</button>
        <button type="button" className="btn btn--secondary btn--block" onClick={onEmail}>Continue with email</button>
        <button type="button" className="onboarding__link" onClick={onSkip}>Not now</button>
      </div>
    </>
  )
}

function EmailEntry({ email, setEmail, onSent }: {
  email: string
  setEmail: (email: string) => void
  onSent: () => void
}) {
  const [error, setError] = useState('')
  function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look complete. Check for a typo.")
      return
    }
    onSent()
  }
  return (
    <>
      <div className="onboarding__top">
        <h1 className="onboarding__title">What's your email?</h1>
        <p className="onboarding__text">We'll send a 6-digit code. No password.</p>
      </div>
      <form className="onboarding__actions" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label className="field">
          <span className="field__label">Email</span>
          <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@uic.edu"
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'email-error' : undefined} />
        </label>
        {error && <p id="email-error" className="onboarding__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block">Email me a code</button>
      </form>
    </>
  )
}

function EmailCode({ email, onDone }: { email: string; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  function submit() {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) {
      setError(`That's ${digits.length} ${digits.length === 1 ? 'digit' : 'digits'}. The code has 6.`)
      return
    }
    onDone() // Supabase checks the code for real once accounts are connected
  }
  return (
    <>
      <div className="onboarding__top">
        <h1 className="onboarding__title">Check your email</h1>
        <p className="onboarding__text">We sent a 6-digit code to {email.trim()}.</p>
      </div>
      <form className="onboarding__actions" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label className="field">
          <span className="field__label">Code</span>
          <input className="input onboarding__code" type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoFocus
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'code-error' : undefined} />
        </label>
        {error && <p id="code-error" className="onboarding__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block">Continue</button>
      </form>
    </>
  )
}

function Plans({ onDone }: { onDone: () => void }) {
  const [asked, setAsked] = useState(false)
  return (
    <>
      <div className="onboarding__center onboarding__center--left">
        <h1 className="onboarding__title">You're all set on Free</h1>
        <div className="onboarding__plan onboarding__plan--current">
          <div className="onboarding__plan-head"><strong>Free</strong><span className="tag">Your plan</span></div>
          <p className="onboarding__text">Everything due, reminders, planner, grades. Free for good.</p>
        </div>
        <div className="onboarding__plan">
          <div className="onboarding__plan-head"><strong>Pro</strong><span className="tag">Coming soon</span></div>
          <p className="onboarding__text">Hoot as your AI study coach, and flashcards from your slides.</p>
          <button type="button" className="btn btn--secondary btn--block" disabled={asked} onClick={() => setAsked(true)}>
            {asked ? "You're on the list" : 'Get early access'}
          </button>
        </div>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={onDone}>Continue</button>
      </div>
    </>
  )
}

function AddToHome({ onDone }: { onDone: () => void }) {
  return (
    <>
      <div className="onboarding__center">
        <h1 className="onboarding__title">Put me on your Home Screen</h1>
        <p className="onboarding__text">That's how your iPhone lets me send reminders.</p>
        <ol className="onboarding__steps onboarding__steps--card">
          <li><span>1</span>Tap <strong>Share</strong> in Safari</li>
          <li><span>2</span>Tap <strong>Add to Home Screen</strong></li>
        </ol>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={onDone}>Done</button>
        <button type="button" className="onboarding__link" onClick={onDone}>Later</button>
      </div>
    </>
  )
}

function Reminders({ onDone }: { onDone: () => void }) {
  async function turnOn() {
    // Asks the phone for permission. The reminders themselves come in Step 8.
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        // Some browsers refuse outside an installed app; Settings can ask again later.
      }
    }
    onDone()
  }
  return (
    <>
      <div className="onboarding__center">
        <h1 className="onboarding__title">Can I remind you before things are due?</h1>
        <p className="onboarding__text">A morning summary and a nudge the day before. Change it anytime.</p>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={() => void turnOn()}>Turn on reminders</button>
        <button type="button" className="onboarding__link" onClick={onDone}>Not now</button>
      </div>
    </>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  return (
    <>
      <div className="onboarding__center">
        <h1 className="onboarding__title">Welcome back</h1>
        <p className="onboarding__text">Your plan is right where you left it.</p>
      </div>
      <div className="onboarding__actions">
        {/* Accounts arrive with Supabase (next step); for now these open the app. */}
        <button type="button" className="btn btn--secondary btn--block" onClick={onDone}>Continue with Google</button>
        <button type="button" className="btn btn--secondary btn--block" onClick={onDone}>Continue with email</button>
      </div>
    </>
  )
}
