export const getItem = <T>(target: T, paths: string[]): any => {
  let result = target

  for (const path of paths) {
    result = result[path]
    if (typeof result !== 'object') {
      return result
    }
  }

  return result
}
