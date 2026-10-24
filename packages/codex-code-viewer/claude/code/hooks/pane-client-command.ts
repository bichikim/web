import type {FileTreeNode} from '../../../src/viewer/file-tree/types'
interface TreeWindow {
  readonly nodes: readonly FileTreeNode[]
  readonly offset: number
  readonly rows: number
}
interface TreeInput {
  readonly action?: unknown
  readonly point?: {readonly x: number; readonly y: number}

  readonly kind?: unknown
  readonly index?: unknown
  readonly path?: unknown
  readonly direction?: unknown
}
const moveIndex = (input: TreeInput, window: TreeWindow, current: number): number | undefined => {
  switch (input.direction) {
    case 'up':
      return Math.max(0, current - 1)
    case 'down':
      return Math.min(window.nodes.length - 1, current + 1)
    case 'pageup':
      return Math.max(0, current - window.rows)
    case 'pagedown':
      return Math.min(window.nodes.length - 1, current + window.rows)
    case 'home':
      return 0
    case 'end':
      return window.nodes.length - 1
    case 'parent': {
      const parent = window.nodes[current].path.split('/').slice(0, -1).join('/')
      const index = window.nodes.findIndex((node) => node.path === parent)
      return index < 0 ? current : index
    }
    default:
      return undefined
  }
}
/** Resolves a surface tree request only against the currently displayed row. */
export const paneClientCommand = (data: unknown, window: TreeWindow) => {
  if (typeof data !== 'object' || data === null) {
    return undefined
  }
  const input = data as TreeInput
  if (
    typeof input.index !== 'number' ||
    !Number.isInteger(input.index) ||
    input.index < 0 ||
    input.index >= window.rows
  ) {
    return undefined
  }
  const current = window.offset + input.index
  const row = window.nodes[current]
  if (row === undefined || row.path !== input.path) {
    return undefined
  }
  if (input.kind === 'focus' || input.kind === 'move') {
    const index = input.kind === 'focus' ? current : moveIndex(input, window, current)
    if (index === undefined) {
      return undefined
    }
    const offset = Math.max(0, Math.min(index, Math.max(window.offset, index - window.rows + 1)))
    return {kind: 'treeFocus', offset, path: window.nodes[index].path}
  }
  if (input.kind === 'menu') {
    return {entryKind: row.kind, kind: 'entryMenu', path: row.path, point: input.point}
  }
  if (input.kind === 'action') {
    return typeof input.action === 'string' &&
      ['copy', 'cut', 'paste', 'rename', 'remove'].includes(input.action)
      ? {action: input.action, entryKind: row.kind, kind: 'entryAction', path: row.path}
      : undefined
  }
  if (input.kind !== 'activate') {
    return undefined
  }
  if (row.kind === 'directory') {
    return {kind: 'folder', path: row.path}
  }
  return row.openable ? {kind: 'open', location: {column: 1, line: 1, path: row.path}} : undefined
}
