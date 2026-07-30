import {Drop, Shift} from 'src/core/types/shared'

export const flipArgsFactory = <T extends (...args: any) => any>(func: T) => {
  return (...args: Drop<Parameters<T>>) => {
    return (value: Shift<Parameters<T>>) => {
      return func(value, ...args)
    }
  }
}

/**
 * @deprecated Use `flipArgsFactory` instead
 */
export const beFactory = flipArgsFactory
