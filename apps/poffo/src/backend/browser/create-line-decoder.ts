/** Retains fragments until a delimiter arrives; a large document is joined only once. */
export const createLineDecoder = () => {
  const fragments: string[] = []
  return (chunk: string): ReadonlyArray<string> => {
    const lines = chunk.split('\n')
    const tail = lines.pop()!
    const complete = lines.map((line) => {
      if (fragments.length === 0) {
        return line
      }
      fragments.push(line)
      const value = fragments.join('')
      fragments.length = 0
      return value
    })
    if (tail !== '') {
      fragments.push(tail)
    }
    return complete
  }
}
