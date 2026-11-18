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

const createMemoKey = (args: unknown[]): string => {
  const specialValues: Array<[number, string]> = []
  let valueIndex = 0

  const serialized = JSON.stringify(args, (_key, value: unknown) => {
    valueIndex += 1

    if (value === undefined) {
      specialValues.push([valueIndex, 'undefined'])
      return null
    }
    if (Object.is(value, -0)) {
      specialValues.push([valueIndex, '-0'])
    } else if (typeof value === 'number' && !Number.isFinite(value)) {
      specialValues.push([valueIndex, String(value)])
    }

    return value
  })

  return JSON.stringify([serialized, specialValues])
}

/**
 * memo
 */
export const memo = <T extends (...args: any) => any>(func: T): T => {
  const cacheMap = new Map<string, any>()

  return ((...args: any) => {
    const cacheKey = createMemoKey(args)

    if (cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey)
    }

    const result = func(...args)

    cacheMap.set(cacheKey, result)

    return result
  }) as any
}
