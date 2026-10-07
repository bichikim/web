import type {CodeSelection} from './types'

export const formatSelection = (selection: CodeSelection): string =>
  `${selection.path}:${selection.line}:${selection.column}${
    selection.endColumn === undefined && selection.endLine === selection.line
      ? ''
      : `-${selection.endLine}:${selection.endColumn ?? 1}`
  }`
