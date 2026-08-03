export const getByPath = <T>(target: T, paths: readonly PropertyKey[]): any => {
  let result: any = target

  if (typeof result !== 'object' || result === null) {
    return
  }

  for (const path of paths) {
    result = Reflect.get(result, path)

    if (typeof result !== 'object' || result === null) {
      return result
    }
  }

  return result
}

/** @deprecated Use `getByPath` instead. */
export const getItem = getByPath
