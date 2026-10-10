import type {CodeSelection} from './types'

export const formatSelection = (selection: CodeSelection): string =>
  `${selection.path}:${selection.line}:${selection.column}${
    selection.endLine === selection.line &&
    (selection.endColumn === undefined || selection.endColumn === selection.column)
      ? ''
      : `-${selection.endLine}:${selection.endColumn ?? 1}`
  }`
