export const createGetId = (startFrom: number = 0): (() => string) => {
  const history: number[] = [startFrom]

  return () => {
    let [prevId] = history

    const result = history.join(',')

    if (Number.MAX_SAFE_INTEGER === prevId) {
      history.unshift(0)
      return result
    }

    history[0] = prevId + 1

    return result
  }
}
