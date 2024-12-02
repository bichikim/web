import {Drop, Shift} from 'src/types'
import {chunk} from '@winter-love/lodash'

export const beFactory = <T extends (...args: any) => any>(func: T) => {
  return (...args: Drop<Parameters<T>>) => {
    return (value: Shift<Parameters<T>>) => {
      return func(value, ...args)
    }
  }
}
