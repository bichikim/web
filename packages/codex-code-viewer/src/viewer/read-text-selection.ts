import type {CodeTextRange} from './types'

const rowAt = (node: Node): HTMLElement | null =>
  (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-line]') ?? null

const columnAt = (row: HTMLElement, node: Node, offset: number): number => {
  const code = row.querySelector('code')
  if (code === null) {
    return 1
  }
  const prefix = row.ownerDocument.createRange()
  prefix.selectNodeContents(code)
  const position = prefix.comparePoint(node, offset)
  if (position < 0) {
    return 1
  }
  if (position === 0) {
    prefix.setEnd(node, offset)
  }
  return prefix.toString().length + 1
}

/** Returns ordered UTF-16 positions with an exclusive endpoint without changing the native selection. */
export const readTextSelection = (container: HTMLElement): CodeTextRange | null => {
  const selection = container.ownerDocument.getSelection()
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null
  }
  const start = rowAt(range.startContainer)
  const end = rowAt(range.endContainer)
  if (start === null || end === null) {
    return null
  }
  return {
    column: columnAt(start, range.startContainer, range.startOffset),
    endColumn: columnAt(end, range.endContainer, range.endOffset),
    endLine: Number(end.dataset.line),
    line: Number(start.dataset.line),
  }
}
