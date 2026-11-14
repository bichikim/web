import {readEditorLines} from './read-editor-lines.ts'
import {EditorSelection, EditorState, Text} from '@codemirror/state'
import {isEditableFile, offsetPosition, sourceOffset} from '../../../src/headless/index.ts'
import {editorKey} from './editor-keys.js'
import {layoutSource, sourceColumn, sourceViewport} from './source-rows.ts'
const PRECEDING_LINES = 4
const GUTTER_COLUMNS = 5
const MAX_SNAPSHOT_LENGTH = 20000
let epoch = 0
let serial = 0
let start
let horizontal = 0
let lineAnchor
let editor
let tokens
let currentPath
let currentSource
let measuredRows
let requestedRows
const MAX_VIEWPORT_ROWS = 1000
const isViewportRows = (rows) => Number.isInteger(rows) && rows > 0 && rows <= MAX_VIEWPORT_ROWS
let layout
let dimensions = {columns: 60, height: 24, numbers: true, wrap: false}
const contentColumns = () =>
  Math.max(2, dimensions.columns - (dimensions.numbers ? GUTTER_COLUMNS : 0) - 1)
function visualRows() {
  const source = editor.doc.toString()
  const columns = contentColumns()
  if (layout?.source !== source || layout.columns !== columns || layout.wrap !== dimensions.wrap) {
    const rows = layoutSource(source, columns, dimensions.wrap)
    layout = {
      columns,
      maxColumns: dimensions.wrap
        ? columns
        : rows.reduce((maximum, row) => Math.max(maximum, sourceColumn(source, row, row.to)), 0),
      rows,
      source,
      wrap: dimensions.wrap,
    }
  }
  return layout.rows
}
export function setEditorTokens(path, source, lines) {
  tokens = {lines, path, source}
}
export function resetEditor(generation = 0) {
  epoch = Math.max(epoch + 1, generation)
  serial = 0
  start = undefined
  horizontal = 0
  lineAnchor = undefined
  editor = undefined
  currentSource = undefined
  currentPath = undefined
  layout = undefined
}
function synchronize(document) {
  if (currentSource !== document.source || editor === undefined) {
    editor = EditorState.create({
      doc: Text.of(document.source.split('\n')),
      selection: EditorSelection.cursor(
        sourceOffset(document.source, document.line, document.column),
      ),
    })
    currentSource = document.source
  }
  start ??= Math.max(
    0,
    visualRows().findIndex((row) => row.number === document.line) - PRECEDING_LINES,
  )
}
function reveal() {
  const rows = visualRows()
  const {head} = editor.selection.main
  const index = Math.max(
    0,
    rows.findLastIndex((row) => row.from <= head),
  )
  if (index < start) {
    start = index
  }
  if (index >= start + dimensions.height) {
    start = Math.max(0, index - dimensions.height + 1)
  }
  if (dimensions.wrap) {
    horizontal = 0
    return
  }
  const column = sourceColumn(editor.doc.toString(), rows[index], head)
  const available = contentColumns()
  if (column < horizontal) {
    horizontal = column
  }
  if (column >= horizontal + available) {
    horizontal = column - available + 1
  }
}
export function scrollEditor(delta) {
  if (editor !== undefined) {
    start = Math.max(
      0,
      Math.min(Math.max(0, visualRows().length - dimensions.height), start + delta),
    )
  }
}
export const editorScrollOffset = () => start ?? 0
export function editorProps(document, rows, columns, preferences) {
  const previous = dimensions
  if (requestedRows !== rows) {
    measuredRows = undefined
    requestedRows = rows
  }
  dimensions = {
    columns,
    height: Math.min(rows, measuredRows ?? rows),
    numbers: preferences?.numbers !== false,
    wrap: preferences?.wrap === 'wrap',
  }
  synchronize(document)
  currentPath = document.path
  if (
    previous.columns !== columns ||
    previous.wrap !== dimensions.wrap ||
    previous.numbers !== dimensions.numbers
  ) {
    reveal()
  }
  const lines = visualRows()
    .slice(start, start + dimensions.height)
    .map((row) => ({
      ...sourceViewport(document.source, row, dimensions.wrap ? 0 : horizontal, contentColumns()),
      tokens:
        tokens?.path === document.path && tokens.source === document.source
          ? (tokens.lines[row.number - 1] ?? []).filter(
              (token) => token.offset < row.to && token.offset + token.text.length > row.from,
            )
          : [],
    }))
  return {
    ...dimensions,
    anchor: editor.selection.main.anchor,
    epoch,
    head: editor.selection.main.head,
    horizontal,
    horizontalMax: Math.max(0, layout.maxColumns - contentColumns()),
    lines,
    offset: sourceOffset(document.source, document.line, document.column),
    path: document.path,
    serial,
    source: document.source.length < MAX_SNAPSHOT_LENGTH ? document.source : '',
    start,
    totalRows: visualRows().length,
  }
}
async function applyEditor(context, next) {
  const previousSource = currentSource
  editor = next
  currentSource = editor.doc.toString()
  reveal()
  const selection = editor.selection.main
  const from = offsetPosition(currentSource, selection.from)
  const end = offsetPosition(currentSource, selection.to)
  context.replace(currentSource)
  context.selection({
    column: from.character + 1,
    empty: selection.empty,
    endColumn: end.character + 1,
    endLine: end.line + 1,
    line: from.line + 1,
  })
  await context.persist()
  if (currentSource !== previousSource) {
    await context.highlight()
  }
}
const MAX_EVENTS = 256
const MAX_KEY_LENGTH = 50000
const MAX_SOURCE_LENGTH = 524288
function verticalHead(event) {
  if (!dimensions.wrap || event.meta || event.ctrl) {
    return undefined
  }
  const distances = {down: 1, pagedown: dimensions.height, pageup: -dimensions.height, up: -1}
  const distance = distances[event.key]
  if (distance === undefined) {
    return undefined
  }
  const rows = visualRows()
  const source = editor.doc.toString()
  const {head} = editor.selection.main
  const index = Math.max(
    0,
    rows.findLastIndex((row) => row.from <= head),
  )
  const column = sourceColumn(source, rows[index], head)
  const target = rows[Math.max(0, Math.min(rows.length - 1, index + distance))]
  const {stops} = sourceViewport(source, target, 0, contentColumns())
  return stops[Math.min(column, stops.length - 1)]
}
async function clipboardCommand(command, context) {
  const range = editor.selection.main
  if (command === 'paste') {
    if (!context.editable()) {
      return
    }
    const text = await context.paste()
    if (
      typeof text !== 'string' ||
      editor.doc.length - (range.to - range.from) + text.length > MAX_SOURCE_LENGTH
    ) {
      return
    }
    await applyEditor(
      context,
      editor.update({
        changes: {from: range.from, insert: Text.of(text.split('\n')), to: range.to},
        selection: EditorSelection.cursor(range.from + text.length),
      }).state,
    )
    return
  }
  const lines = readEditorLines(editor.doc)
  const line = lines.lineAt(range.head)
  const from = range.empty ? line.from : range.from
  const to = range.empty
    ? line.number < lines.lines
      ? lines.line(line.number + 1).from
      : line.to
    : range.to
  await context.copy(
    command === 'cut'
      ? editor.sliceDoc(from, to)
      : range.empty
        ? line.text
        : editor.sliceDoc(from, to),
  )
  if (command === 'cut' && context.editable()) {
    await applyEditor(
      context,
      editor.update({
        changes: {from, insert: '', to},
        selection: EditorSelection.cursor(from),
      }).state,
    )
  }
}

async function selectGutter(event, context) {
  const lines = readEditorLines(editor.doc)
  if (!Number.isInteger(event.line) || event.line < 1 || event.line > lines.lines) {
    return
  }
  if (event.begin) {
    lineAnchor = event.shift ? lines.lineAt(editor.selection.main.anchor).number : event.line
  }
  const anchor = Math.min(lines.lines, lineAnchor ?? event.line)
  const first = lines.line(Math.min(anchor, event.line))
  const last = lines.line(Math.max(anchor, event.line))
  await applyEditor(
    context,
    editor.update({
      selection: EditorSelection.range(first.from, last.to),
    }).state,
  )
}

async function followCode(event, context) {
  const document = context.document()
  if (
    !Number.isInteger(event.offset) ||
    event.offset < 0 ||
    event.offset >= editor.doc.length ||
    tokens?.path !== document.path ||
    tokens.source !== currentSource
  ) {
    return
  }
  const position = offsetPosition(currentSource, event.offset)
  const token = tokens.lines[position.line]?.find(
    (entry) =>
      entry.navigation !== null &&
      entry.offset <= event.offset &&
      event.offset < entry.offset + entry.text.length,
  )
  if (token === undefined) {
    return
  }
  await applyEditor(context, editor.update({selection: EditorSelection.cursor(token.offset)}).state)
  await context.command(token.navigation, event.point)
}
async function openCodeMenu(event, context) {
  if (!Number.isInteger(event.offset) || event.offset < 0 || event.offset > editor.doc.length) {
    return
  }
  const selection = editor.selection.main
  if (selection.empty || event.offset < selection.from || event.offset >= selection.to) {
    await applyEditor(
      context,
      editor.update({selection: EditorSelection.cursor(event.offset)}).state,
    )
  }
  await context.command('context', event.point)
}
async function applyEvent(event, context) {
  switch (event.kind) {
    case 'viewport':
      if (isViewportRows(event.rows)) {
        measuredRows = event.rows
      }
      return
    case 'context':
      await openCodeMenu(event, context)
      return
    case 'follow':
      await followCode(event, context)
      return
    case 'lines':
      await selectGutter(event, context)
      return
    case 'cursor':
    case 'extend': {
      if (!Number.isInteger(event.offset) || event.offset < 0 || event.offset > editor.doc.length) {
        return
      }
      const anchor =
        event.kind === 'extend' || event.shift ? editor.selection.main.anchor : event.offset
      await applyEditor(
        context,
        editor.update({selection: EditorSelection.range(anchor, event.offset)}).state,
      )
      return
    }
    case 'key': {
      if (typeof event.key !== 'string' || event.key.length > MAX_KEY_LENGTH) {
        return
      }
      const document = context.document()
      const result = editorKey(editor, event, {
        editable: context.editable() && isEditableFile(document.path),
        rows: dimensions.height,
        verticalHead: verticalHead(event),
      })
      if (result.editor !== undefined) {
        await applyEditor(context, result.editor)
      }
      if (result.command !== undefined) {
        if (['copy', 'paste', 'cut'].includes(result.command)) {
          await clipboardCommand(result.command, context)
        } else {
          await context.command(result.command)
        }
      }
      break
    }
    default:
      break
  }
}
/** Applies ordered surface events to the shared CodeMirror document before persisting session state. */
export async function receiveEditor(data, context) {
  const document = context.document()
  if (
    data === null ||
    typeof data !== 'object' ||
    document === undefined ||
    data.path !== document.path ||
    data.epoch !== epoch
  ) {
    return
  }
  if (data.kind !== 'events' || !Array.isArray(data.events) || data.events.length > MAX_EVENTS) {
    return
  }
  synchronize(document)
  const receivedEpoch = epoch
  for (const event of data.events) {
    if (receivedEpoch === epoch && Number.isInteger(event?.serial) && event.serial > serial) {
      ;({serial} = event)
      // Each transaction must observe the preceding selection and document.
      // oxlint-disable-next-line no-await-in-loop
      await applyEvent(event, context)
    }
  }
  await context.persist()
}

/** Scrolls an active unwrapped document without changing its source selection. */
export function scrollEditorHorizontal(data) {
  if (
    data?.kind !== 'horizontal' ||
    data.epoch !== epoch ||
    data.path !== currentPath ||
    dimensions.wrap ||
    !Number.isInteger(data.value)
  ) {
    return
  }
  horizontal = Math.max(0, Math.min(Math.max(0, layout.maxColumns - contentColumns()), data.value))
}
