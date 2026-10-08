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
