import { useEffect, useState } from 'react'

// Like useState, but the value is also saved in this browser (localStorage),
// so it survives a refresh. Until logins exist (Step 7), this is where the
// student's tasks, plans, classes and notes live.
export function useStoredState<T>(key: string, initialValue: T) {
  const storageKey = `study-dashboard:${key}`

  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved === null ? initialValue : (JSON.parse(saved) as T)
    } catch {
      return initialValue // storage blocked or the saved value was broken
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Storage full or blocked: the app still works, it just won't remember.
    }
  }, [storageKey, value])

  return [value, setValue] as const
}

// A short random id for new tasks, notes and classes.
export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}
