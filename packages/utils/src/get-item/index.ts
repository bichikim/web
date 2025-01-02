export const getItem = <T>(target: T, paths: string[]): any => {
  let result: any = target

  if (typeof result !== 'object') {
    return
  }

  for (const path of paths) {
    result = Reflect.get(result, path)

    if (typeof result !== 'object') {
      return result
    }
  }

  return result
}
