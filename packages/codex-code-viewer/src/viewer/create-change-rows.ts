import type {ChangeRow, InlineChange} from './types'

/** Includes neighboring current lines so a removed block can be read in place. */
export const createChangeRows = (inspection: InlineChange): readonly ChangeRow[] => {
  const hunk = inspection.hunks[inspection.active]
  if (hunk === undefined) {
    return []
  }
  const lines =
    inspection.source === '' ? [] : inspection.source.replace(/\r\n|\r/gu, '\n').split('\n')
  const start = hunk.newStart - 1
  const end = start + hunk.newLines.length
  const previous = inspection.hunks[inspection.active - 1]
  const next = inspection.hunks[inspection.active + 1]
  const before = lines.slice(
    Math.max(
      0,
      start - 2,
      previous === undefined ? 0 : previous.newStart - 1 + previous.newLines.length,
    ),
    start,
  )
  const after = lines.slice(
    end,
    Math.min(end + 2, next === undefined ? lines.length : next.newStart - 1),
  )
  return [
    ...before.map(
      (text, index): ChangeRow => ({
        current: hunk.newStart - before.length + index,
        kind: 'context',
        previous: hunk.oldStart - before.length + index,
        text,
      }),
    ),
    ...hunk.oldLines.map(
      (text, index): ChangeRow => ({
        current: null,
        kind: 'deleted',
        previous: hunk.oldStart + index,
        text,
      }),
    ),
    ...hunk.newLines.map(
      (text, index): ChangeRow => ({
        current: hunk.newStart + index,
        kind: 'added',
        previous: null,
        text,
      }),
    ),
    ...after.map(
      (text, index): ChangeRow => ({
        current: hunk.newStart + hunk.newLines.length + index,
        kind: 'context',
        previous: hunk.oldStart + hunk.oldLines.length + index,
        text,
      }),
    ),
  ]
}
