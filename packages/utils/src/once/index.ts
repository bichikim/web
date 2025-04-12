export const once = <T>(runner: () => T): (() => T) => {
  let isRun = false
  let returnValue: T

  return () => {
    if (!isRun) {
      returnValue = runner()
      isRun = true

      return returnValue
    }

    return returnValue
  }
}
