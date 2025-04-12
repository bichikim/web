import {Drop, Shift} from 'src/types'

export const beFactory = <T extends (...args: any) => any>(func: T) => {
  return (...args: Drop<Parameters<T>>) => {
    return (value: Shift<Parameters<T>>) => {
      return func(value, ...args)
    }
  }
}
