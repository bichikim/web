import {curry, curryReverse} from 'src/curry'

export const take = <T>(list: T[], size: number): T[] => {
  return list.slice(0, size)
}

export const takeFn = curryReverse(take)

/**
 * @deprecated use `takeFn` instead
 */
export const takeRight = takeFn
