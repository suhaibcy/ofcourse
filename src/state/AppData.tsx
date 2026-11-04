import { useEffect, type ReactNode } from 'react'
import { sampleDoneIds } from '../data/sampleAssignments'
import { sampleClasses, type Course } from '../data/sampleClasses'
import { emptyClassGrades, sampleGrades } from '../data/sampleGrades'
import type { ClassGrades, PastSemester } from '../lib/grades'
import { newId, useStoredState } from '../lib/useStoredState'
import { AppDataContext, type AppData, type Note, type Task } from './appDataContext'
import { useCanvasFeed } from './useCanvasFeed'

// Wraps the whole app (see main.tsx) so every screen shares the same data.
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useStoredState('name', 'Suhaib')
  const [classes, setClasses] = useStoredState<Course[]>('classes', sampleClasses)
  const [doneIds, setDoneIds] = useStoredState<string[]>('done', sampleDoneIds)
  const [plans, setPlans] = useStoredState<Record<string, string>>('plans', {})
  const [tasks, setTasks] = useStoredState<Task[]>('tasks', [])
  const [skippedExams, setSkippedExams] = useStoredState<string[]>('skipped-exams', [])
  // "notes-v2": notes changed shape when we switched to the simple editor.
  const [notes, setNotes] = useStoredState<Note[]>('notes-v2', [])
  const [grades, setGrades] = useStoredState<Record<string, ClassGrades>>('grades', sampleGrades)
  const [pastSemesters, setPastSemesters] = useStoredState<PastSemester[]>('past-semesters', [])
  const feed = useCanvasFeed()
  // false until the student finishes (or skips through) onboarding
  const [onboarded, setOnboarded] = useStoredState<boolean>('onboarded', false)

  // A class in the feed that the Classes tab doesn't have yet (e.g. LAS 110)
  // gets added with its code as its name and the next free color.
  const { feedClasses } = feed
  useEffect(() => {
    setClasses((current) => {
      const missing = feedClasses.filter((fc) => !current.some((c) => c.id === fc.id))
      if (missing.length === 0) return current
      const added = [...current]
      for (const { id, code } of missing) {
        const used = added.map((c) => c.color)
        const color = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => !used.includes(n)) ?? 1
        added.push({ id, code, name: code, color, meetings: [] })
      }
      return added
    })
  }, [feedClasses, setClasses])

  const value: AppData = {
    name,
    setName,
    classes,
    setClasses,
    courseById: (id) => classes.find((course) => course.id === id),
    assignments: feed.assignments,
    feedLive: feed.live,
    feedUpdatedAt: feed.updatedAt,
    feedRefreshing: feed.refreshing,
    refreshFeed: feed.refresh,
    connectFeed: feed.connect,
    onboarded,
    finishOnboarding: () => setOnboarded(true),
    isDone: (id) => doneIds.includes(id),
    setDone: (id, done) =>
      setDoneIds((ids) => (done ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id))),
    plans,
    planAssignment: (id, dateKey) =>
      setPlans((current) => {
        const next = { ...current }
        if (dateKey) next[id] = dateKey
        else delete next[id]
        return next
      }),
    tasks,
    addTask: (task) => setTasks((current) => [...current, { ...task, id: newId(), done: false }]),
    setTaskDone: (id, done) => setTasks((current) => current.map((t) => (t.id === id ? { ...t, done } : t))),
    moveTask: (id, dateKey) => setTasks((current) => current.map((t) => (t.id === id ? { ...t, date: dateKey } : t))),
    deleteTask: (id) => setTasks((current) => current.filter((t) => t.id !== id)),
    skippedExams,
    skipExam: (id) => setSkippedExams((current) => [...current, id]),
    notes,
    saveNote: (note) =>
      setNotes((current) =>
        current.some((n) => n.id === note.id) ? current.map((n) => (n.id === note.id ? note : n)) : [note, ...current],
      ),
    deleteNote: (id) => setNotes((current) => current.filter((n) => n.id !== id)),
    grades,
    gradesFor: (courseId) => grades[courseId] ?? emptyClassGrades(),
    saveClassGrades: (courseId, classGrades) => setGrades((current) => ({ ...current, [courseId]: classGrades })),
    pastSemesters,
    setPastSemesters,
    resetAll: () => {
      setName('Suhaib')
      setClasses(sampleClasses)
      setDoneIds(sampleDoneIds)
      setPlans({})
      setTasks([])
      setSkippedExams([])
      setNotes([])
      setGrades(sampleGrades)
      setPastSemesters([])
      setOnboarded(false) // so a reset also replays onboarding
    },
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
