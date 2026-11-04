import type { NoteLine } from '../state/appDataContext'
import { newId } from './useStoredState'

// A blank line for a note: plain text, or an unchecked checklist item.
export function emptyLine(checklist = false): NoteLine {
  return { id: newId(), text: '', checklist, checked: false }
}
