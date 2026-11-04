import { useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Icon } from '../components/Icon'
import { emptyLine } from '../lib/noteLines'
import { newId } from '../lib/useStoredState'
import { useAppData, type Note } from '../state/appDataContext'
import { NoteEditor } from './NoteEditor'

function noteTitle(note: Note): string {
  return note.lines[0]?.text.trim() || 'New note'
}

// The first bit of text after the title, for the list preview.
function notePreview(note: Note): string {
  return note.lines.slice(1).map((line) => line.text.trim()).filter(Boolean).join(' ') || 'No additional text'
}

function isEmpty(note: Note): boolean {
  return note.lines.every((line) => !line.text.trim())
}

function shortDate(timestamp: number): string {
  const date = new Date(timestamp)
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Notes, like iOS Notes: one list (filter by class), search, and a simple editor.
export function NotesScreen() {
  const { notes, saveNote, deleteNote, classes, courseById } = useAppData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState(false)
  const [folder, setFolder] = useState('all')
  const [search, setSearch] = useState('')

  function createNote() {
    const note: Note = { id: newId(), folder: folder === 'all' ? 'general' : folder,
      lines: [emptyLine(), emptyLine()], updatedAt: Date.now() }
    saveNote(note)
    setJustCreated(true)
    setOpenId(note.id)
  }

  const open = notes.find((n) => n.id === openId)
  if (open) {
    const close = () => {
      if (isEmpty(open)) deleteNote(open.id) // an untouched new note is thrown away
      setOpenId(null)
      setJustCreated(false)
    }
    return (
      <>
        <BackHeader title="" backLabel="Notes" onBack={close}
          action={
            <span>
              <button type="button" className="icon-btn" aria-label="Make a course from this note"
                onClick={() => { window.location.hash = `#/learn?note=${open.id}` }}>
                <Icon name="ask" size={20} />
              </button>
              <button type="button" className="icon-btn" aria-label="Delete note"
                onClick={() => { deleteNote(open.id); setOpenId(null) }}>
                <Icon name="trash" size={20} />
              </button>
            </span>
          } />
        <label className="note-folder">
          <span className="muted-inline">Class</span>
          <select value={open.folder} onChange={(e) => saveNote({ ...open, folder: e.target.value, updatedAt: Date.now() })}>
            <option value="general">General</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </label>
        <NoteEditor key={open.id} lines={open.lines} autoFocus={justCreated}
          onChange={(lines) => saveNote({ ...open, lines, updatedAt: Date.now() })} />
      </>
    )
  }

  const query = search.trim().toLowerCase()
  const shown = notes
    .filter((n) => folder === 'all' || n.folder === folder)
    .filter((n) => !query || n.lines.some((line) => line.text.toLowerCase().includes(query)))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const filters = [{ id: 'all', label: 'All' }, { id: 'general', label: 'General' },
    ...classes.map((c) => ({ id: c.id, label: c.code }))]

  return (
    <>
      <div className="screen-head">
        <h1 className="screen-title">Notes</h1>
        <button type="button" className="icon-btn icon-btn--accent" onClick={createNote} aria-label="New note">
          <Icon name="compose" size={22} />
        </button>
      </div>

      <label className="search">
        <Icon name="search" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search notes" />
      </label>

      <div className="filter-chips" role="tablist" aria-label="Filter by class">
        {filters.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={folder === f.id}
            className={folder === f.id ? 'filter-chip filter-chip--on' : 'filter-chip'} onClick={() => setFolder(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <span className="empty__mark"><Icon name="notes" size={24} /></span>
          <h2 className="empty__title">{query ? 'No matching notes' : 'No notes yet'}</h2>
          <p className="empty__body">{query ? 'Try a different word.' : 'Tap the pencil to jot something down.'}</p>
        </div>
      ) : (
        <ul className="list">
          {shown.map((note) => {
            const course = courseById(note.folder)
            return (
              <li key={note.id}>
                <button type="button" className="list__item list__item--nav" onClick={() => { setJustCreated(false); setOpenId(note.id) }}>
                  <span className="list__main">
                    <span className="list__label list__label--strong">{noteTitle(note)}</span>
                    <span className="list__desc list__desc--clamp">
                      <span className="note-date">{shortDate(note.updatedAt)}</span> {notePreview(note)}
                    </span>
                    {course && (
                      <span className="list__desc note-class">
                        <span className="dot" style={{ background: `var(--class-${course.color})` }} aria-hidden="true" />
                        {course.code}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
