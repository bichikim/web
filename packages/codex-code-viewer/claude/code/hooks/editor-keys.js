import {readEditorLines} from './read-editor-lines.ts'
import {EditorSelection, findClusterBreak, Text} from '@codemirror/state'
const lineEnd = (line) => line.to
const cluster = (document, offset, forward) => {
  const line = document.lineAt(offset)
  if (forward && offset >= lineEnd(line)) {
    return line.number < document.lines ? document.line(line.number + 1).from : document.length
  }
  if (!forward && offset === line.from) {
    return line.number > 1 ? lineEnd(document.line(line.number - 1)) : 0
  }
  return line.from + findClusterBreak(line.text, offset - line.from, forward)
}
function navigationHead(editor, event, rows) {
  const selected = editor.selection.main
  const document = readEditorLines(editor.doc)
  const current = document.lineAt(selected.head)
  switch (event.key) {
    case 'home':
      return current.from
    case 'end':
      return lineEnd(current)
    case 'left':
      return !event.shift && !selected.empty
        ? selected.from
        : cluster(document, selected.head, false)
    case 'right':
      return !event.shift && !selected.empty ? selected.to : cluster(document, selected.head, true)
    case 'up':
    case 'down':
    case 'pageup':
    case 'pagedown': {
      const direction = event.key === 'up' || event.key === 'pageup' ? -1 : 1
      const distance = event.key.startsWith('page') ? rows : 1
      const target = document.line(
        Math.max(1, Math.min(document.lines, current.number + direction * distance)),
      )
      return Math.min(lineEnd(target), target.from + selected.head - current.from)
    }
    default:
      return undefined
  }
}
const select = (editor, head, shift = false) => ({
  editor: editor.update({
    selection: EditorSelection.range(shift ? editor.selection.main.anchor : head, head),
  }).state,
})
function modifiedKey(editor, event) {
  const key = event.key.toLowerCase()
  if (event.ctrl && event.shift && ['.', '>'].includes(key)) {
    return {command: 'context'}
  }
  const commands = new Map([
    ['s', 'save'],
    ['c', 'copy'],
    ['v', 'paste'],
    ['x', 'cut'],
    ['f', 'find'],
    ['z', event.shift ? 'redo' : 'undo'],
    ['g', 'location'],
    ['p', 'focusPath'],
  ])
  if (commands.has(key)) {
    return {command: commands.get(key)}
  }
  if (key === 'return' && event.shift) {
    return {command: 'attach'}
  }
  if (key === 'a') {
    return {editor: editor.update({selection: EditorSelection.range(0, editor.doc.length)}).state}
  }
  if (key === 'home' || key === 'up') {
    return select(editor, 0, event.shift)
  }
  if (key === 'end' || key === 'down') {
    return select(editor, editor.doc.length, event.shift)
  }
  if (key === 'left' || key === 'right') {
    const line = readEditorLines(editor.doc).lineAt(editor.selection.main.head)
    return select(editor, key === 'left' ? line.from : lineEnd(line), event.shift)
  }
  return {}
}
function editTransaction(editor, event) {
  const selected = editor.selection.main
  const document = readEditorLines(editor.doc)
  let {from, to} = selected
  let insert = event.key
  switch (event.key) {
    case 'backspace':
      from = selected.empty ? cluster(document, from, false) : from
      insert = ''
      break
    case 'delete':
      to = selected.empty ? cluster(document, to, true) : to
      insert = ''
      break
    case 'return':
      insert = document.toString().match(/\r\n|\n|\r/u)?.[0] ?? '\n'
      break
    case 'space':
      insert = ' '
      break
    case 'tab':
      insert = '  '
      break
    case 'escape':
    case 'insert':
    case 'capslock':
    case 'shift':
    case 'control':
    case 'alt':
    case 'meta':
      return {}
    default:
      break
  }
  return {
    editor: editor.update({
      changes: {from, insert: Text.of(insert.split('\n')), to},
      selection: EditorSelection.cursor(from + insert.length),
    }).state,
  }
}
/** Produces a document transaction or a command for an editor key. */
export function editorKey(editor, event, {editable, rows, verticalHead}) {
  if (event.key === 'f10' && event.shift) {
    return {command: 'context'}
  }
  if (event.meta || event.ctrl) {
    return modifiedKey(editor, event)
  }
  if (verticalHead !== undefined) {
    return select(editor, verticalHead, event.shift)
  }
  const head = navigationHead(editor, event, rows)
  if (head !== undefined) {
    return select(editor, head, event.shift)
  }
  if (event.key === 'f12') {
    return {command: 'definition'}
  }
  return editable && !/^f\d+$/u.test(event.key) ? editTransaction(editor, event) : {}
}
