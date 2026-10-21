import type {Text} from '@codemirror/state'
import type {CodeSelection} from '../types'

/** Converts a retained file range into bounded CodeMirror document offsets. */
export const createEditorSelection = (document: Text, selection?: CodeSelection) => {
  if (selection === undefined) {
    return undefined
  }
  const start = document.line(Math.min(selection.line, document.lines))
  const end = document.line(Math.min(selection.endLine, document.lines))
  return {
    anchor: Math.min(start.to, start.from + selection.column - 1),
    head: Math.min(end.to, end.from + (selection.endColumn ?? selection.column) - 1),
  }
}
