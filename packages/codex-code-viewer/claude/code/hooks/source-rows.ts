import {findClusterBreak} from '@codemirror/state'

export interface SourceRow {
  readonly from: number
  readonly to: number
  readonly number: number
  readonly continuation: boolean
  readonly column: number
}
export interface SourceSegment {
  readonly from: number
  readonly to: number
  readonly column: number
  readonly width: number
  readonly text: string
}
export interface SourceViewport extends SourceRow {
  readonly segments: readonly SourceSegment[]
  readonly stops: readonly number[]
  readonly text: string
}
const TAB_COLUMNS = 4
const wideScripts = /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u
const wideSymbols =
  /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3\u3000-\u303f\uff01-\uff60\uffe0-\uffe6]/u
const clusterWidth = (text: string, column: number): number =>
  text === '\t'
    ? TAB_COLUMNS - (column % TAB_COLUMNS)
    : wideScripts.test(text) || wideSymbols.test(text)
      ? 2
      : 1

/** Indexes visual rows while retaining logical line numbers and absolute source positions. */
export const layoutSource = (source: string, columns: number, wrap: boolean): SourceRow[] => {
  const width = Math.max(2, Math.floor(columns))
  const rows: SourceRow[] = []
  let offset = 0
  for (const [index, raw] of source.split('\n').entries()) {
    const text = raw.replace(/\r$/u, '')
    let start = 0
    let column = 0
    let startColumn = 0
    let cursor = 0
    while (cursor < text.length) {
      const end = findClusterBreak(text, cursor, true)
      const size = clusterWidth(text.slice(cursor, end), column)
      if (wrap && cursor > start && column - startColumn + size > width) {
        rows.push({
          column: startColumn,
          continuation: start > 0,
          from: offset + start,
          number: index + 1,
          to: offset + cursor,
        })
        start = cursor
        startColumn = column
      }
      column += size
      cursor = end
    }
    rows.push({
      column: startColumn,
      continuation: start > 0,
      from: offset + start,
      number: index + 1,
      to: offset + text.length,
    })
    offset += raw.length + 1
  }
  return rows
}

/** Projects one visual row into bounded display cells and maps each cell back to source. */
export const sourceViewport = (
  source: string,
  row: SourceRow,
  horizontal: number,
  columns: number,
): SourceViewport => {
  const segments: SourceSegment[] = []
  const stops: number[] = []
  const text = source.slice(row.from, row.to)
  let cursor = 0
  let column = 0
  while (cursor < text.length && column < horizontal + columns) {
    const end = findClusterBreak(text, cursor, true)
    const cluster = text.slice(cursor, end)
    const width = clusterWidth(cluster, row.column + column)
    const left = column - horizontal
    if (left + width > 0) {
      const from = row.from + cursor
      const to = row.from + end
      const tab = cluster === '\t'
      const visibleWidth = Math.min(columns, left + width) - Math.max(0, left)
      segments.push({
        column: tab ? Math.max(0, left) : left,
        from,
        text: tab ? ' '.repeat(visibleWidth) : cluster,
        to,
        width: tab ? visibleWidth : width,
      })
      for (let cell = Math.max(0, left); cell <= Math.min(columns, left + width); cell += 1) {
        stops[cell] = cell - left < width ? from : to
      }
    }
    column += width
    cursor = end
  }
  if (stops.length === 0) {
    stops.push(row.to)
  }
  return {...row, segments, stops, text: segments.map((segment) => segment.text).join('')}
}

/** Returns the visual cell column for an absolute source position in a row. */
export const sourceColumn = (source: string, row: SourceRow, offset: number): number => {
  const text = source.slice(row.from, Math.min(row.to, offset))
  let column = 0
  let cursor = 0
  while (cursor < text.length) {
    const end = findClusterBreak(text, cursor, true)
    column += clusterWidth(text.slice(cursor, end), row.column + column)
    cursor = end
  }
  return column
}
