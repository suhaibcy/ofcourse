import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Checkbox } from '../components/Checkbox'
import { emptyLine } from '../lib/noteLines'
import type { NoteLine } from '../state/appDataContext'

type NoteEditorProps = {
  lines: NoteLine[]
  onChange: (lines: NoteLine[]) => void
  autoFocus?: boolean
}

// Grow a text box to fit its text, so each line wraps like normal writing.
function fitHeight(box: HTMLTextAreaElement | null) {
  if (!box) return
  box.style.height = 'auto'
  box.style.height = `${box.scrollHeight}px`
}

// A simple note editor in the style of iOS Notes. A note is a list of lines;
// each line is plain text or a checklist item. The first line is the title.
//   Enter      -> starts a new line (a checklist line continues the checklist;
//                 Enter on an empty checklist line turns it back into text)
//   Backspace  -> at the start of a line, joins it with the line above
export function NoteEditor({ lines, onChange, autoFocus }: NoteEditorProps) {
  const boxes = useRef(new Map<string, HTMLTextAreaElement>())
  // Where to put the cursor after the next redraw (e.g. on a new line).
  const pendingFocus = useRef<{ id: string; caret: number } | null>(
    autoFocus && lines[0] ? { id: lines[0].id, caret: lines[0].text.length } : null,
  )
  const [focusedId, setFocusedId] = useState<string | null>(null)

  useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    const box = boxes.current.get(target.id)
    if (box) {
      box.focus()
      box.setSelectionRange(target.caret, target.caret)
      pendingFocus.current = null
    }
  })

  function update(index: number, changes: Partial<NoteLine>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...changes } : line)))
  }

  function handleTyping(index: number, value: string) {
    // Pasting several lines at once splits them into separate lines.
    const [first, ...rest] = value.split('\n')
    if (rest.length === 0) return update(index, { text: value })
    const current = lines[index]
    const added = rest.map((text) => ({ ...emptyLine(current.checklist && index > 0), text }))
    const next = [...lines.slice(0, index), { ...current, text: first }, ...added, ...lines.slice(index + 1)]
    const last = added[added.length - 1]
    pendingFocus.current = { id: last.id, caret: last.text.length }
    onChange(next)
  }

  function handleKey(index: number, event: KeyboardEvent<HTMLTextAreaElement>) {
    const line = lines[index]
    const box = event.currentTarget
    const caret = box.selectionStart
    const nothingSelected = box.selectionStart === box.selectionEnd

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (line.checklist && line.text === '') {
        update(index, { checklist: false, checked: false }) // leave the checklist
        return
      }
      const newLine = { ...emptyLine(line.checklist && index > 0), text: line.text.slice(caret) }
      const next = [...lines]
      next.splice(index, 1, { ...line, text: line.text.slice(0, caret) }, newLine)
      pendingFocus.current = { id: newLine.id, caret: 0 }
      onChange(next)
      return
    }

    if (event.key === 'Backspace' && caret === 0 && nothingSelected) {
      if (line.checklist) {
        event.preventDefault()
        update(index, { checklist: false, checked: false }) // remove the checkbox first
        return
      }
      if (index > 0) {
        event.preventDefault()
        const previous = lines[index - 1]
        const next = [...lines]
        next.splice(index - 1, 2, { ...previous, text: previous.text + line.text })
        pendingFocus.current = { id: previous.id, caret: previous.text.length }
        onChange(next)
      }
    }
  }

  // The toolbar button: turn the line you're on into a checklist item, or back.
  const focusedIndex = lines.findIndex((line) => line.id === focusedId)
  function toggleChecklist() {
    const index = focusedIndex > 0 ? focusedIndex : lines.length - 1
    if (index <= 0) {
      // Only a title so far: start a checklist on a new line under it.
      const newLine = emptyLine(true)
      pendingFocus.current = { id: newLine.id, caret: 0 }
      onChange([...lines, newLine])
      return
    }
    const line = lines[index]
    pendingFocus.current = { id: line.id, caret: line.text.length }
    update(index, { checklist: !line.checklist, checked: false })
  }

  return (
    <div className="note-editor">
      <div className="note-toolbar">
        <button type="button" className="note-toolbar__btn" onMouseDown={(e) => e.preventDefault()} onClick={toggleChecklist}
          aria-pressed={focusedIndex > 0 && lines[focusedIndex].checklist}>
          <span className="note-toolbar__icon" aria-hidden="true" />
          Checklist
        </button>
      </div>

      {lines.map((line, index) => (
        <div key={line.id} className={line.checked ? 'note-line note-line--checked' : 'note-line'}>
          {line.checklist && (
            <Checkbox checked={line.checked} onChange={(checked) => update(index, { checked })}
              label={`Check off ${line.text || 'item'}`} />
          )}
          <textarea
            ref={(box) => {
              if (box) boxes.current.set(line.id, box)
              else boxes.current.delete(line.id)
              fitHeight(box)
            }}
            className={index === 0 ? 'note-line__text note-line__text--title' : 'note-line__text'}
            value={line.text}
            rows={1}
            placeholder={index === 0 ? 'Title' : lines.length === 2 && index === 1 ? 'Start writing' : ''}
            aria-label={index === 0 ? 'Note title' : 'Note line'}
            onChange={(e) => { handleTyping(index, e.target.value); fitHeight(e.target) }}
            onKeyDown={(e) => handleKey(index, e)}
            onFocus={() => setFocusedId(line.id)}
          />
        </div>
      ))}
    </div>
  )
}
