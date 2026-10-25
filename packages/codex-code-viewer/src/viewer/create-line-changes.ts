import {diffArrays} from 'diff'
import type {ChangeHunk} from '../shared/change-contracts'

const lines = (source: string): string[] =>
  source === '' ? [] : source.replace(/\r\n|\r/gu, '\n').split('\n')
const MAX_EDIT_LENGTH = 1000
const COMPUTE_BUDGET_MS = 40

/** Compares whole lines without treating a platform line-ending change as a changed block. */
export const createLineChanges = (before: string, after: string): readonly ChangeHunk[] => {
  const parts = diffArrays(lines(before), lines(after), {
    maxEditLength: MAX_EDIT_LENGTH,
    timeout: COMPUTE_BUDGET_MS,
  })
  if (parts === undefined) {
    const oldLines = lines(before)
    const newLines = lines(after)
    return [
      {
        kind: oldLines.length === 0 ? 'added' : newLines.length === 0 ? 'deleted' : 'modified',
        newLines,
        newStart: 1,
        oldLines,
        oldStart: 1,
      },
    ]
  }
  const result: ChangeHunk[] = []
  let oldStart = 1
  let newStart = 1
  let previous: string[] = []
  let current: string[] = []
  const flush = (): void => {
    if (previous.length > 0 || current.length > 0) {
      result.push({
        kind: previous.length === 0 ? 'added' : current.length === 0 ? 'deleted' : 'modified',
        newLines: current,
        newStart,
        oldLines: previous,
        oldStart,
      })
      oldStart += previous.length
      newStart += current.length
      previous = []
      current = []
    }
  }
  for (const part of parts) {
    if (part.added) {
      current.push(...part.value)
    } else if (part.removed) {
      previous.push(...part.value)
    } else {
      flush()
      oldStart += part.value.length
      newStart += part.value.length
    }
  }
  flush()
  return result
}

/** Deletions attach above the next surviving line, or below the last line at EOF. */
interface ChangeLineOptions {
  readonly lineCount?: number
  readonly expanded?: ChangeHunk
}
export const lineChange = (
  hunks: readonly ChangeHunk[],
  line: number,
  foldedEnd = line,
  options: ChangeLineOptions = {},
): ChangeHunk | undefined =>
  hunks.find((hunk) => {
    const start =
      hunk.newLines.length === 0
        ? Math.max(
            1,
            Math.min(
              hunk.newStart - (hunk === options.expanded ? 1 : 0),
              options.lineCount ?? Infinity,
            ),
          )
        : hunk.newStart
    const end = Math.max(start, hunk.newStart + hunk.newLines.length - 1)
    return start <= foldedEnd && end >= line
  })
