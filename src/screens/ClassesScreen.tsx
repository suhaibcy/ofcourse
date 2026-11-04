import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { ClassEditor } from '../components/ClassEditor'
import { Icon } from '../components/Icon'
import { SectionHeader } from '../components/SectionHeader'
import type { Course } from '../data/sampleClasses'
import { classPercent, cumulativeGpa, formatPercent, gpa, letterFor, type Letter, type PastSemester } from '../lib/grades'
import { useSheetClose } from '../lib/useSheetClose'
import { newId } from '../lib/useStoredState'
import { useAppData } from '../state/appDataContext'
import { useToast } from '../state/toastContext'
import { ClassScreen } from './ClassScreen'

// The Classes tab: the GPA estimate, each class with its current grade, and
// past semesters. Tap a class to see its scores and edit its details.
export function ClassesScreen() {
  const { classes, setClasses, gradesFor, pastSemesters, setPastSemesters } = useAppData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [newClass, setNewClass] = useState<Course | null>(null)
  const [editingSemester, setEditingSemester] = useState<PastSemester | null>(null)

  const open = classes.find((c) => c.id === openId)
  if (open) return <ClassScreen course={open} onBack={() => setOpenId(null)} />

  // Each class's grade right now (null until it has a score).
  const rows = classes.map((course) => {
    const grades = gradesFor(course.id)
    const percent = classPercent(grades.categories)
    const letter = percent === null ? null : letterFor(percent, grades.cutoffs)
    return { course, credits: grades.credits, percent, letter }
  })
  const graded = rows.filter((r): r is typeof r & { letter: Letter } => r.letter !== null)
  const semesterGpa = gpa(graded)
  const semesterCredits = graded.reduce((sum, r) => sum + r.credits, 0)
  const overallGpa = cumulativeGpa([
    ...pastSemesters,
    ...(semesterGpa === null ? [] : [{ credits: semesterCredits, gpa: semesterGpa }]),
  ])

  function startNewClass() {
    const usedColors = classes.map((c) => c.color)
    const color = [1, 2, 3, 4, 5, 6, 7, 8].find((c) => !usedColors.includes(c)) ?? 1
    setNewClass({ id: newId(), code: '', name: '', color, meetings: [{ days: [], start: '09:00', end: '09:50' }] })
  }

  function saveSemester(semester: PastSemester) {
    const exists = pastSemesters.some((s) => s.id === semester.id)
    setPastSemesters(exists ? pastSemesters.map((s) => (s.id === semester.id ? semester : s)) : [...pastSemesters, semester])
  }

  return (
    <>
      <div className="screen-head">
        <h1 className="screen-title">Classes</h1>
        <button type="button" className="icon-btn icon-btn--accent" onClick={startNewClass} aria-label="Add class">
          <Icon name="plus" size={22} />
        </button>
      </div>

      <div className="gpa-card">
        <div className="gpa-card__stat">
          <span className="gpa-card__value">{semesterGpa === null ? '–' : semesterGpa.toFixed(2)}</span>
          <span className="gpa-card__label">Estimated GPA</span>
        </div>
        {pastSemesters.length > 0 && (
          <div className="gpa-card__stat">
            <span className="gpa-card__value">{overallGpa === null ? '–' : overallGpa.toFixed(2)}</span>
            <span className="gpa-card__label">Overall</span>
          </div>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="empty">
          <span className="empty__mark"><Icon name="classes" size={24} /></span>
          <h2 className="empty__title">No classes yet</h2>
          <Button onClick={startNewClass}>Add a class</Button>
        </div>
      ) : (
        <ul className="list">
          {rows.map(({ course, percent, letter }) => (
            <li key={course.id}>
              <button type="button" className="list__item list__item--nav" onClick={() => setOpenId(course.id)}>
                <span className="dot" style={{ background: `var(--class-${course.color})` }} aria-hidden="true" />
                <span className="list__main">
                  <span className="list__label">{course.code}</span>
                  {course.name && <span className="list__desc list__desc--clamp">{course.name}</span>}
                </span>
                {percent === null ? (
                  <span className="list__value">–</span>
                ) : (
                  <span className="grade-value">
                    <span className="grade-value__percent">{formatPercent(percent)}</span>
                    <span className="grade-value__letter">{letter}</span>
                  </span>
                )}
                <Icon name="next" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SectionHeader label="Past semesters" />
      {pastSemesters.length > 0 && (
        <ul className="list list--flush">
          {pastSemesters.map((semester) => (
            <li key={semester.id}>
              <button type="button" className="list__item list__item--nav" onClick={() => setEditingSemester(semester)}>
                <span className="list__main">
                  <span className="list__label">{semester.name}</span>
                </span>
                <span className="grade-value__percent">{semester.gpa.toFixed(2)}</span>
                <Icon name="next" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" small className="add-score" onClick={() => setEditingSemester({ id: newId(), name: '', credits: 15, gpa: 0 })}>
        <Icon name="plus" size={16} /> Add past semester
      </Button>

      {newClass && (
        <ClassEditor course={newClass} isNew onSave={(course) => setClasses([...classes, course])}
          onDelete={() => {}} onClose={() => setNewClass(null)} />
      )}
      {editingSemester && (
        <SemesterSheet
          semester={editingSemester}
          isNew={!pastSemesters.some((s) => s.id === editingSemester.id)}
          onSave={saveSemester}
          onDelete={() => setPastSemesters(pastSemesters.filter((s) => s.id !== editingSemester.id))}
          onClose={() => setEditingSemester(null)}
        />
      )}
    </>
  )
}

type SemesterSheetProps = {
  semester: PastSemester
  isNew: boolean
  onSave: (semester: PastSemester) => void
  onDelete: () => void
  onClose: () => void
}

function SemesterSheet({ semester, isNew: startedNew, onSave, onDelete, onClose }: SemesterSheetProps) {
  // Numbers are kept as text while typing, so a field can be empty for a moment.
  const [name, setName] = useState(semester.name)
  const [credits, setCredits] = useState(startedNew ? '' : String(semester.credits))
  const [gpaText, setGpaText] = useState(startedNew ? '' : String(semester.gpa))
  const [isNew] = useState(startedNew)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  const creditsNumber = Number(credits)
  const gpaNumber = Number(gpaText)
  const valid = name.trim() !== '' && credits !== '' && creditsNumber > 0 && gpaText !== '' && gpaNumber >= 0 && gpaNumber <= 4

  return (
    <BottomSheet title={isNew ? 'Past semester' : semester.name} onClose={close} closing={closing}>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave({ ...semester, name: name.trim(), credits: creditsNumber, gpa: gpaNumber })
        showToast(isNew ? 'Semester added' : 'Semester saved')
        close()
      }}>
        <label className="field">
          <span className="field__label">Semester</span>
          <input className="input" value={name} placeholder="e.g. Fall 2026" autoFocus={isNew}
            onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="time-row">
          <label className="field">
            <span className="field__label">Credit hours</span>
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={credits}
              placeholder="15" onChange={(e) => setCredits(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">GPA</span>
            <input className="input" type="number" inputMode="decimal" min="0" max="4" step="any" value={gpaText}
              placeholder="3.50" onChange={(e) => setGpaText(e.target.value)} />
          </label>
        </div>
        <Button type="submit" block disabled={!valid}>Save semester</Button>
        {!isNew && (
          <Button variant="destructive" block onClick={() => { onDelete(); showToast('Semester deleted'); close() }}>
            Delete semester
          </Button>
        )}
      </form>
    </BottomSheet>
  )
}
