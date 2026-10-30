export interface SourceLine {
  readonly number: number
  readonly from: number
  readonly to: number
  readonly text: string
  readonly ending: string
}

/** Indexes logical lines while preserving each original separator and UTF-16 offset. */
export const sourceLines = (source: string): readonly SourceLine[] => {
  const parts = source.split(/(?<ending>\r\n|\n|\r)/u)
  const lines: SourceLine[] = []
  let from = 0
  for (let index = 0; index < parts.length; index += 2) {
    const text = parts[index]!
    const ending = parts[index + 1] ?? ''
    const to = from + text.length
    lines.push({ending, from, number: lines.length + 1, text, to})
    from = to + ending.length
  }
  return lines
}
