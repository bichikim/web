import type {CodeDocument} from '../shared/contracts'
import type {CodeSelection} from './types'
import {readCodeText} from './read-code-text'
import {readTextSelection} from './read-text-selection'

interface ContextSelectionOptions {
  container: HTMLElement
  document: CodeDocument
  selection: CodeSelection
  target: HTMLElement
  point?: {x: number; y: number}
}

const containsSelectionPoint = (options: ContextSelectionOptions): boolean => {
  const {container, target, point} = options
  const selection = container.ownerDocument.getSelection()
  if (
    selection === null ||
    selection.rangeCount === 0 ||
    target.closest('[data-code-offset]') === null
  ) {
    return false
  }
  const range = selection.getRangeAt(0)
  return point === undefined
    ? range.intersectsNode(target)
    : Array.from(range.getClientRects()).some(
        (rect) =>
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom,
      )
}

/** Resolves the range and copied text at a context-menu invocation. */
export const readContextSelection = (options: ContextSelectionOptions) => {
  const {container, document, selection, target} = options
  const native = readTextSelection(container)
  if (native !== null && containsSelectionPoint(options)) {
    return {
      preserveNativeSelection: true,
      selection: {...native, path: document.location.path},
      text: readCodeText(container) ?? '',
    }
  }
  const row = target.closest<HTMLElement>('[data-line]')
  const line = Number(row?.dataset.line)
  const element = target.closest<HTMLElement>('[data-code-offset]')
  const tokens = document.lines[line - 1] ?? []
  const index =
    element === null
      ? -1
      : tokens.findIndex((token) => token.offset === Number(element.dataset.codeOffset))
  const token = tokens[index]
  const text = token?.text.trim() ?? ''
  if (token !== undefined && text.length > 0) {
    const column =
      tokens.slice(0, index).reduce((length, entry) => length + entry.text.length, 0) +
      token.text.length -
      token.text.trimStart().length +
      1
    return {
      preserveNativeSelection: false,
      selection: {
        column,
        endColumn: column + text.length,
        endLine: line,
        line,
        path: document.location.path,
      },
      text,
    }
  }
  const selected =
    row === null ? selection : {column: 1, endLine: line, line, path: document.location.path}
  const rows = document.source.split('\n').slice(selected.line - 1, selected.endLine)
  if (selected.endColumn !== undefined) {
    const last = rows.length - 1
    rows[last] = rows[last]?.slice(0, selected.endColumn - 1) ?? ''
    rows[0] = rows[0]?.slice(selected.column - 1) ?? ''
  }
  return {preserveNativeSelection: row === null, selection: selected, text: rows.join('\n')}
}
