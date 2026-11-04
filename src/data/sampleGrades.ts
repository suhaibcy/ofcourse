import { DEFAULT_CUTOFFS, type ClassGrades, type GradeItem } from '../lib/grades'

// Made-up scores for the sample classes, so the Classes tab has something to
// show. Keyed by class id (see sampleClasses.ts).

function score(id: string, name: string, earned: number, possible: number): GradeItem {
  return { id, name, earned, possible, whatIf: false }
}

export const sampleGrades: Record<string, ClassGrades> = {
  cs111: {
    credits: 3,
    cutoffs: DEFAULT_CUTOFFS,
    categories: [
      { id: 'cs-hw', name: 'Homework', weight: 25, items: [
        score('cs-hw1', 'Homework 1', 10, 10), score('cs-hw2', 'Homework 2', 9, 10), score('cs-hw3', 'Homework 3', 8, 10)] },
      { id: 'cs-lab', name: 'Labs', weight: 15, items: [
        score('cs-lab1', 'Lab 1', 5, 5), score('cs-lab2', 'Lab 2', 5, 5)] },
      { id: 'cs-mid', name: 'Midterm', weight: 25, items: [score('cs-mid1', 'Midterm', 82, 100)] },
      { id: 'cs-final', name: 'Final exam', weight: 35, items: [] },
    ],
  },
  econ120: {
    credits: 3,
    cutoffs: DEFAULT_CUTOFFS,
    categories: [
      { id: 'ec-quiz', name: 'Quizzes', weight: 20, items: [
        score('ec-q1', 'Quiz 1', 8, 10), score('ec-q2', 'Quiz 2', 7, 10)] },
      { id: 'ec-exam', name: 'Exams', weight: 50, items: [score('ec-e1', 'Exam 1', 76, 100)] },
      { id: 'ec-final', name: 'Final exam', weight: 30, items: [] },
    ],
  },
  psch100: {
    credits: 3,
    cutoffs: DEFAULT_CUTOFFS,
    categories: [
      { id: 'ps-exam', name: 'Exams', weight: 75, items: [score('ps-e1', 'Exam 1', 44, 50)] },
      { id: 'ps-part', name: 'Participation', weight: 25, items: [score('ps-p1', 'Participation', 23, 25)] },
    ],
  },
  math180: {
    credits: 5,
    cutoffs: DEFAULT_CUTOFFS,
    categories: [
      { id: 'ma-hw', name: 'Homework', weight: 20, items: [] },
      { id: 'ma-exam', name: 'Exams', weight: 50, items: [] },
      { id: 'ma-final', name: 'Final exam', weight: 30, items: [] },
    ],
  },
}

// A new class starts with the plain cutoffs and no categories.
export function emptyClassGrades(): ClassGrades {
  return { credits: 3, cutoffs: DEFAULT_CUTOFFS, categories: [] }
}
