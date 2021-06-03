export const drop = (array: any[]) => {
  const value = [...array]
  value.shift()
  return value
}

export const createUuid = (prefix: string = '') => {
  let count = 0
  return () => {
    count += 1
    return prefix + count
  }
}

export const isSSR = (): boolean => {
  /* istanbul ignore next [no way to test] */
  return typeof window === 'undefined'
}

export const isPromise = (value: any): value is Promise<any> => {
  return typeof value?.then === 'function' && typeof value?.catch === 'function'
}

export const devFreeze = <T>(target: T): Readonly<T> => {
  if (process.env.NODE_ENV === 'development') {
    return Object.freeze(target)
  }

  return target
}
