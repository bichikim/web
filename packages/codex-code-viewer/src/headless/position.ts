/** Resolves a UTF-16 offset to a zero-based line and character. */
export const offsetPosition = (
  source: string,
  offset: number,
  encoding: 'utf-16' | 'utf-32' = 'utf-16',
) => {
  const prefix = source.slice(0, offset)
  const lines = prefix.split(/\r\n|\n|\r/u)
  const last = lines.at(-1) ?? ''
  return {character: encoding === 'utf-32' ? [...last].length : last.length, line: lines.length - 1}
}

/** Resolves a one-based text position to its UTF-16 source offset. */
export const sourceOffset = (source: string, line: number, column: number): number => {
  let current = 1
  let start = 0
  for (const separator of source.matchAll(/\r\n|\n|\r/gu)) {
    if (current >= line) {
      return start + column - 1
    }
    start = separator.index + separator[0].length
    current += 1
  }
  return start + column - 1
}
