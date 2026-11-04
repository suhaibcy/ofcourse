// Small date helpers. We use JavaScript's built-in Date instead of a date
// library to keep the app small.

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Midnight at the start of the given day.
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// Weeks start on Monday, like a school week.
export function startOfWeek(date: Date): Date {
  const day = date.getDay() // 0 = Sunday
  const daysSinceMonday = (day + 6) % 7
  return addDays(startOfDay(date), -daysSinceMonday)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// "2026-10-13": how we save a day in storage (a Date can't be saved directly).
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// "14:30" -> "2:30 PM"
export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

// The "HH:MM" part of a Date, for sorting and display.
export function clockOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// How a due date reads in a list: "Yesterday", "11:59 PM", "Sun 9:00 AM", "Oct 24".
export function formatDue(due: Date, now: Date): string {
  const today = startOfDay(now)
  const dueDay = startOfDay(due)
  const dayDiff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)
  const time = formatClock(clockOf(due))
  if (dayDiff === 0) return time
  if (dayDiff === -1) return 'Yesterday'
  if (dayDiff < -1) return `${-dayDiff} days late`
  if (dayDiff === 1) return `Tomorrow ${time}`
  if (dayDiff < 7) return `${SHORT_DAY_NAMES[due.getDay()]} ${time}`
  return `${MONTH_NAMES[due.getMonth()].slice(0, 3)} ${due.getDate()}`
}
