// Made-up classes and meeting times, so the planner and calendar have
// something to show. Students edit these in the Classes tab.

export type Meeting = {
  days: number[] // 0 = Sunday ... 6 = Saturday
  start: string // "09:00"
  end: string // "09:50"
  place?: string
}

export type Course = {
  id: string
  code: string // "CS 111"
  name: string // "Program Design I"
  color: number // 1-8, picks one of the --class-N colors
  meetings: Meeting[]
}

export const sampleClasses: Course[] = [
  { id: 'cs111', code: 'CS 111', name: 'Program Design I', color: 1,
    meetings: [{ days: [1, 3, 5], start: '09:00', end: '09:50', place: 'Lecture Center A1' }] },
  { id: 'econ120', code: 'ECON 120', name: 'Principles of Microeconomics', color: 2,
    meetings: [{ days: [2, 4], start: '12:30', end: '13:45', place: 'Room 1050' }] },
  { id: 'psch100', code: 'PSCH 100', name: 'Introduction to Psychology', color: 3,
    meetings: [{ days: [2, 4], start: '15:30', end: '16:45', place: 'Lecture Center C3' }] },
  { id: 'math180', code: 'MATH 180', name: 'Calculus I', color: 4,
    meetings: [{ days: [1, 3, 5], start: '11:00', end: '11:50', place: 'Room 2100' }] },
]
