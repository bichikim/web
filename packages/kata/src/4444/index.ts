export const stringifyArgs = (args: any[]): string => {
  return JSON.stringify(args)
}

export const getCache = (cacheMap: Map<string, any>, args: any[]): any => {
  const cacheKey = stringifyArgs(args)

  return cacheMap.get(cacheKey)
}

export const setCache = (cacheMap: Map<string, any>, args: any[], result: any): void => {
  const cacheKey = stringifyArgs(args)

  cacheMap.set(cacheKey, result)
}

/**
 * memo
 */
export const memo = <T extends (...args: any) => any>(func: T): T => {
  const cacheMap = new Map<string, any>()

  return ((...args: any) => {
    const cacheKey = stringifyArgs(args)

    if (cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey)
    }

    const result = func(...args)

    cacheMap.set(cacheKey, result)

    return result
  }) as any
}
