import { useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { ClassEditor } from '../components/ClassEditor'
import { Icon } from '../components/Icon'
import { Tag } from '../components/Tag'
import type { Course } from '../data/sampleClasses'
import {
  categoryPercent,
  classPercent,
  formatPercent,
  letterFor,
  neededOnFinal,
  type ClassGrades,
  type Cutoffs,
  type GradeCategory,
  type GradeItem,
} from '../lib/grades'
import { useSheetClose } from '../lib/useSheetClose'
import { newId } from '../lib/useStoredState'
import { useAppData } from '../state/appDataContext'
import { useToast } from '../state/toastContext'

type EditingScore = { categoryId: string; item: GradeItem }

// One class: its grade, scores, what-if scores, and the "what do I need on
// the final?" calculator. Edit changes its name, color and times.
// Opened from the Classes tab.
export function ClassScreen({ course, onBack }: { course: Course; onBack: () => void }) {
  const { classes, setClasses, gradesFor, saveClassGrades } = useAppData()
  const grades = gradesFor(course.id)
  const [editingScore, setEditingScore] = useState<EditingScore | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(false)

  const current = classPercent(grades.categories)
  const withWhatIf = classPercent(grades.categories, true)
  const hasWhatIf = grades.categories.some((c) => c.items.some((i) => i.whatIf))
  const totalWeight = grades.categories.reduce((sum, c) => sum + c.weight, 0)

  function save(next: ClassGrades) {
    saveClassGrades(course.id, next)
  }

  function saveScore(categoryId: string, item: GradeItem) {
    save({
      ...grades,
      categories: grades.categories.map((c) => {
        if (c.id !== categoryId) return c
        const exists = c.items.some((i) => i.id === item.id)
        return { ...c, items: exists ? c.items.map((i) => (i.id === item.id ? item : i)) : [...c.items, item] }
      }),
    })
  }

  function deleteScore(categoryId: string, itemId: string) {
    save({
      ...grades,
      categories: grades.categories.map((c) =>
        c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c),
    })
  }

  return (
    <>
      <BackHeader title={course.code} backLabel="Classes" onBack={onBack}
        action={<Button variant="secondary" small onClick={() => setEditingClass(true)}>Edit</Button>} />

      <div className="grade-hero">
        <span className="dot" style={{ background: `var(--class-${course.color})` }} aria-hidden="true" />
        <div className="grade-hero__main">
          {current === null ? (
            <span className="grade-hero__value">–</span>
          ) : (
            <span className="grade-hero__value">
              {formatPercent(current)} <span className="grade-hero__letter">{letterFor(current, grades.cutoffs)}</span>
            </span>
          )}
          {course.name && <span className="grade-hero__label">{course.name}</span>}
          {hasWhatIf && withWhatIf !== null && (
            <span className="grade-hero__whatif">
              With what-if: {formatPercent(withWhatIf)} {letterFor(withWhatIf, grades.cutoffs)}
            </span>
          )}
        </div>
      </div>

      {grades.categories.length === 0 ? (
        <div className="empty">
          <span className="empty__mark"><Icon name="grades" size={24} /></span>
          <h2 className="empty__title">No grade categories yet</h2>
          <Button onClick={() => setSetupOpen(true)}>Add from the syllabus</Button>
        </div>
      ) : (
        <>
          <div className="grade-head">
            <h2 className="grade-head__title">Grade</h2>
            <Button variant="ghost" small onClick={() => setSetupOpen(true)}>Edit weights</Button>
          </div>
          {totalWeight !== 100 && (
            <p className="grade-warning">Weights add up to {totalWeight}%, not 100%.</p>
          )}

          {grades.categories.map((category) => {
            const percent = categoryPercent(category)
            return (
              <section key={category.id}>
                <div className="section">
                  <h2 className="section__label">{category.name} · {category.weight}%</h2>
                  <span className="section__count">{percent === null ? '' : formatPercent(percent)}</span>
                </div>
                {category.items.length > 0 && (
                  <ul className="list list--flush">
                    {category.items.map((item) => (
                      <li key={item.id}>
                        <button type="button" className="list__item list__item--nav"
                          onClick={() => setEditingScore({ categoryId: category.id, item })}>
                          <span className="list__main">
                            <span className="list__label">{item.name}</span>
                            <span className="list__desc">
                              {item.earned} / {item.possible} {item.whatIf && <Tag>What-if</Tag>}
                            </span>
                          </span>
                          <span className="list__value">
                            {item.possible > 0 ? formatPercent((item.earned / item.possible) * 100) : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="ghost" small className="add-score" onClick={() => setEditingScore({
                  categoryId: category.id,
                  item: { id: newId(), name: '', earned: 0, possible: 0, whatIf: false },
                })}>
                  <Icon name="plus" size={16} /> Add score
                </Button>
              </section>
            )
          })}

          <FinalCalculator grades={grades} />
        </>
      )}

      {editingScore && (
        <ScoreSheet
          item={editingScore.item}
          categoryName={grades.categories.find((c) => c.id === editingScore.categoryId)?.name ?? ''}
          isNew={!grades.categories.some((c) => c.items.some((i) => i.id === editingScore.item.id))}
          onSave={(item) => saveScore(editingScore.categoryId, item)}
          onDelete={() => deleteScore(editingScore.categoryId, editingScore.item.id)}
          onClose={() => setEditingScore(null)}
        />
      )}
      {setupOpen && <SetupSheet course={course} grades={grades} onSave={save} onClose={() => setSetupOpen(false)} />}
      {editingClass && (
        <ClassEditor course={course} isNew={false}
          onSave={(updated) => setClasses(classes.map((c) => (c.id === updated.id ? updated : c)))}
          // Removing the class sends you back to the list, since its page no longer exists.
          onDelete={() => setClasses(classes.filter((c) => c.id !== course.id))}
          onClose={() => setEditingClass(false)} />
      )}
    </>
  )
}

const TARGETS = ['A', 'B', 'C', 'D'] as const

// "What do I need on the final?" If a category named "Final..." has no real
// scores yet, it's used as the final and everything else is the current grade.
function FinalCalculator({ grades }: { grades: ClassGrades }) {
  const finalCategory = grades.categories.find((c) => /final/i.test(c.name) && c.items.every((i) => i.whatIf))
  const [weightText, setWeightText] = useState(String(finalCategory?.weight ?? 30))
  const [target, setTarget] = useState<(typeof TARGETS)[number]>('A')

  const others = grades.categories.filter((c) => c !== finalCategory)
  const current = classPercent(others)
  const weight = Number(weightText)
  const goal = grades.cutoffs[target]
  const needed = current === null || weightText === '' ? null : neededOnFinal(current, weight, goal)

  const aTarget = target === 'A' ? 'an A' : `a ${target}`
  let result: string
  if (current === null) result = 'Type in some scores first.'
  else if (needed === null) result = 'Enter what the final is worth, from 1 to 100%.'
  else if (needed > 100) {
    const best = current * (1 - weight / 100) + weight
    result = `Even 100% on the final won't get you ${aTarget}. With 100%, you'd end at ${formatPercent(best)}.`
  } else if (needed <= 0) result = `You'll keep at least ${aTarget} even with a 0 on the final.`
  else result = `You need ${formatPercent(needed)} on the final to get ${aTarget} (${goal}% or higher).`

  return (
    <section className="final-calc">
      <h2 className="final-calc__title">What do I need on the final?</h2>
      <div className="final-calc__inputs">
        <label className="field">
          <span className="field__label">Final is worth</span>
          <span className="input-suffix">
            <input className="input" type="number" inputMode="decimal" min="1" max="100" step="any" value={weightText}
              onChange={(e) => setWeightText(e.target.value)} />
            <span aria-hidden="true">%</span>
          </span>
        </label>
        <div className="field">
          <span className="field__label">Grade I want</span>
          <div className="target-chips" role="radiogroup" aria-label="Grade I want">
            {TARGETS.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={target === t}
                className={target === t ? 'filter-chip filter-chip--on' : 'filter-chip'} onClick={() => setTarget(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="final-calc__result" aria-live="polite">{result}</p>
    </section>
  )
}

type ScoreSheetProps = {
  item: GradeItem
  categoryName: string
  isNew: boolean
  onSave: (item: GradeItem) => void
  onDelete: () => void
  onClose: () => void
}

function ScoreSheet({ item, categoryName, isNew: startedNew, onSave, onDelete, onClose }: ScoreSheetProps) {
  const [isNew] = useState(startedNew)
  const [name, setName] = useState(item.name)
  const [earned, setEarned] = useState(isNew ? '' : String(item.earned))
  const [possible, setPossible] = useState(isNew ? '' : String(item.possible))
  const [whatIf, setWhatIf] = useState(item.whatIf)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  const valid = name.trim() !== '' && earned !== '' && Number(earned) >= 0 && possible !== '' && Number(possible) > 0

  return (
    <BottomSheet title={isNew ? `New ${categoryName.toLowerCase()} score` : item.name} onClose={close} closing={closing}>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave({ ...item, name: name.trim(), earned: Number(earned), possible: Number(possible), whatIf })
        showToast(isNew ? 'Score added' : 'Score saved')
        close()
      }}>
        <label className="field">
          <span className="field__label">Name</span>
          <input className="input" value={name} placeholder="e.g. Quiz 3" autoFocus={isNew}
            onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="time-row">
          <label className="field">
            <span className="field__label">Points earned</span>
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={earned}
              placeholder="18" onChange={(e) => setEarned(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Out of</span>
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={possible}
              placeholder="20" onChange={(e) => setPossible(e.target.value)} />
          </label>
        </div>
        <div className="whatif-row">
          <Checkbox checked={whatIf} onChange={setWhatIf} label="What-if score" />
          <span className="list__main">
            <span className="list__label">What-if score</span>
            <span className="list__desc">Pretend score. Not counted in your real grade.</span>
          </span>
        </div>
        <Button type="submit" block disabled={!valid}>Save score</Button>
        {!isNew && (
          <Button variant="destructive" block onClick={() => { onDelete(); showToast('Score deleted'); close() }}>
            Delete score
          </Button>
        )}
      </form>
    </BottomSheet>
  )
}

// While editing, numbers are text so a field can be empty for a moment.
type DraftCategory = { id: string; name: string; weight: string; items: GradeItem[] }
type DraftCutoffs = Record<keyof Cutoffs, string>

type SetupSheetProps = {
  course: Course
  grades: ClassGrades
  onSave: (grades: ClassGrades) => void
  onClose: () => void
}

// Credit hours, the syllabus categories and weights, and the letter cutoffs.
function SetupSheet({ course, grades, onSave, onClose }: SetupSheetProps) {
  const [credits, setCredits] = useState(String(grades.credits))
  const [categories, setCategories] = useState<DraftCategory[]>(() =>
    grades.categories.length > 0
      ? grades.categories.map((c) => ({ ...c, weight: String(c.weight) }))
      : [{ id: newId(), name: '', weight: '', items: [] }])
  const [cutoffs, setCutoffs] = useState<DraftCutoffs>({
    A: String(grades.cutoffs.A), B: String(grades.cutoffs.B), C: String(grades.cutoffs.C), D: String(grades.cutoffs.D),
  })
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  function update(id: string, changes: Partial<DraftCategory>) {
    setCategories(categories.map((c) => (c.id === id ? { ...c, ...changes } : c)))
  }

  const total = categories.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  const cut = { A: Number(cutoffs.A), B: Number(cutoffs.B), C: Number(cutoffs.C), D: Number(cutoffs.D) }
  const cutoffsValid = Object.values(cutoffs).every((v) => v !== '') && cut.A > cut.B && cut.B > cut.C && cut.C > cut.D && cut.D >= 0
  const categoriesValid = categories.every((c) => c.name.trim() !== '' && c.weight !== '' && Number(c.weight) >= 0)
  const valid = credits !== '' && Number(credits) > 0 && categoriesValid && cutoffsValid

  return (
    <BottomSheet title={`${course.code} grade setup`} onClose={close} closing={closing}>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave({
          credits: Number(credits),
          cutoffs: cut,
          categories: categories.map((c): GradeCategory => ({ ...c, name: c.name.trim(), weight: Number(c.weight) })),
        })
        showToast('Class set up')
        close()
      }}>
        <label className="field">
          <span className="field__label">Credit hours</span>
          <input className="input" type="number" inputMode="decimal" min="0" step="any" value={credits}
            onChange={(e) => setCredits(e.target.value)} />
        </label>

        <div className="field">
          <span className="field__label">Categories from the syllabus</span>
          {categories.map((category) => (
            <div key={category.id} className="category-row">
              <input className="input" value={category.name} placeholder="e.g. Homework" aria-label="Category name"
                onChange={(e) => update(category.id, { name: e.target.value })} />
              <span className="input-suffix">
                <input className="input" type="number" inputMode="decimal" min="0" max="100" step="any" value={category.weight}
                  placeholder="20" aria-label={`${category.name || 'Category'} weight`}
                  onChange={(e) => update(category.id, { weight: e.target.value })} />
                <span aria-hidden="true">%</span>
              </span>
              <button type="button" className="icon-btn" aria-label={`Remove ${category.name || 'category'}`}
                onClick={() => setCategories(categories.filter((c) => c.id !== category.id))}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
          <span className={total === 100 ? 'field__hint' : 'field__hint field__hint--warn'}>
            Total: {total}%{total === 100 ? '' : ' (should be 100%)'}
          </span>
          <Button variant="secondary" onClick={() => setCategories([...categories, { id: newId(), name: '', weight: '', items: [] }])}>
            Add category
          </Button>
        </div>

        <div className="field">
          <span className="field__label">Lowest percent for each letter</span>
          <div className="cutoff-row">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <label key={letter} className="cutoff">
                <span className="cutoff__letter">{letter}</span>
                <input className="input" type="number" inputMode="decimal" min="0" max="100" step="any" value={cutoffs[letter]}
                  aria-label={`Lowest percent for ${letter}`} onChange={(e) => setCutoffs({ ...cutoffs, [letter]: e.target.value })} />
              </label>
            ))}
          </div>
          <span className={cutoffsValid ? 'field__hint' : 'field__hint field__hint--warn'}>
            {cutoffsValid ? 'Below D is an F.' : 'Each letter needs a lower number than the one before.'}
          </span>
        </div>

        <Button type="submit" block disabled={!valid}>Save</Button>
      </form>
    </BottomSheet>
  )
}
