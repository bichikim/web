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

export const clearCache = (cacheMap: Map<string, any>): void => {
  cacheMap.clear()
}

export type MemoizedFunction<T extends (...args: any) => any> = T & {
  clearCache: () => void
}

/**
 * memo
 */
export const memo = <T extends (...args: any) => any>(func: T): MemoizedFunction<T> => {
  const cacheMap = new Map<string, any>()

  return Object.assign(
    (...args: any) => {
      const cachedResult = getCache(cacheMap, args)
      if (cachedResult) {
        return cachedResult
      }

      const result = func(...args)
      setCache(cacheMap, args, result)
      return result
    },
    {clearCache: () => clearCache(cacheMap)},
  ) as any
}
