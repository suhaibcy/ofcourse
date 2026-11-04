import { useState } from 'react'
import type { Course, Meeting } from '../data/sampleClasses'
import { SHORT_DAY_NAMES } from '../lib/dates'
import { useSheetClose } from '../lib/useSheetClose'
import { useToast } from '../state/toastContext'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'

// Monday-first order for the day buttons.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

// A class's details: code, name, color, and meeting times. Opened from the
// Classes tab (Add class) and from a class's page (Edit).
export type ClassEditorProps = {
  course: Course
  isNew: boolean
  onSave: (course: Course) => void
  onDelete: () => void
  onClose: () => void
}

export function ClassEditor({ course, isNew: startedNew, onSave, onDelete, onClose }: ClassEditorProps) {
  const [draft, setDraft] = useState<Course>(course)
  // Remember "new" from when it opened, so the title doesn't flip while it slides away after saving.
  const [isNew] = useState(startedNew)
  const { closing, close } = useSheetClose(onClose)
  const showToast = useToast()

  function updateMeeting(index: number, changes: Partial<Meeting>) {
    setDraft({ ...draft, meetings: draft.meetings.map((m, i) => (i === index ? { ...m, ...changes } : m)) })
  }

  function toggleDay(index: number, day: number) {
    const days = draft.meetings[index].days
    updateMeeting(index, { days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] })
  }

  return (
    <BottomSheet title={isNew ? 'New class' : draft.code || 'Class'} onClose={close} closing={closing}>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        if (!draft.code.trim()) return
        onSave(draft)
        showToast(isNew ? `${draft.code} added` : 'Class saved')
        close()
      }}>
        <label className="field">
          <span className="field__label">Class code</span>
          <input className="input" value={draft.code} placeholder="e.g. CS 111" autoFocus={isNew}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Name (optional)</span>
          <input className="input" value={draft.name} placeholder="e.g. Program Design I"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>

        <div className="field">
          <span className="field__label">Color</span>
          <div className="swatches">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
              <button key={c} type="button" className={draft.color === c ? 'swatch swatch--on' : 'swatch'}
                style={{ background: `var(--class-${c})` }} aria-label={`Color ${c}`} aria-pressed={draft.color === c}
                onClick={() => setDraft({ ...draft, color: c })} />
            ))}
          </div>
        </div>

        {draft.meetings.map((meeting, index) => (
          <fieldset key={index} className="meeting">
            <legend className="field__label">Meets on</legend>
            <div className="day-toggles">
              {WEEK_ORDER.map((day) => (
                <button key={day} type="button" className={meeting.days.includes(day) ? 'day-toggle day-toggle--on' : 'day-toggle'}
                  aria-pressed={meeting.days.includes(day)} onClick={() => toggleDay(index, day)}>
                  {SHORT_DAY_NAMES[day].slice(0, 2)}
                </button>
              ))}
            </div>
            <div className="time-row">
              <label className="field">
                <span className="field__label">Starts</span>
                <input className="input" type="time" value={meeting.start} onChange={(e) => updateMeeting(index, { start: e.target.value })} />
              </label>
              <label className="field">
                <span className="field__label">Ends</span>
                <input className="input" type="time" value={meeting.end} onChange={(e) => updateMeeting(index, { end: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Room (optional)</span>
              <input className="input" value={meeting.place ?? ''} placeholder="e.g. Lecture Center A1"
                onChange={(e) => updateMeeting(index, { place: e.target.value || undefined })} />
            </label>
            {draft.meetings.length > 1 && (
              <Button variant="ghost" small onClick={() => setDraft({ ...draft, meetings: draft.meetings.filter((_, i) => i !== index) })}>
                Remove this time
              </Button>
            )}
          </fieldset>
        ))}
        <Button variant="secondary" onClick={() => setDraft({ ...draft, meetings: [...draft.meetings, { days: [], start: '09:00', end: '09:50' }] })}>
          Add another meeting time
        </Button>

        <Button type="submit" block disabled={!draft.code.trim()}>Save class</Button>
        {!isNew && <Button variant="destructive" block onClick={() => { onDelete(); showToast('Class deleted'); close() }}>
          Delete class
        </Button>}
      </form>
    </BottomSheet>
  )
}
