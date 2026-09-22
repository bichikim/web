/** Returns independent, increasing request identifiers scoped to one executor. */
export const createRequestSequence = (prefix: string): (() => string) => {
  let sequence = 0
  return () => {
    const requestId = `${prefix}-${sequence}`
    sequence += 1
    return requestId
  }
}
