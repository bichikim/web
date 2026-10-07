export const offsetPosition = (source: string, offset: number) => {
  const prefix = source.slice(0, offset)
  const lines = prefix.split(/\r\n|\n|\r/u)
  return {character: lines.at(-1)?.length ?? 0, line: lines.length - 1}
}
