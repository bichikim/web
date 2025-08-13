export const createOnce = <T>(recipe: (...args: any[]) => T): ((...args: any[]) => T) => {
  let result: any

  return (...args: any[]) => {
    if (result) {
      return result
    }

    result = recipe(...args)

    return result
  }
}
