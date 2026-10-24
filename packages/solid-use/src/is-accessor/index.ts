import {Accessor} from 'solid-js'
import {MaybeAccessor} from 'src/types'

const NON_ACCESSOR_SYMBOL = Symbol('non-accessor')

export const nonAccessor = <T>(value: (...args: any[]) => T): Accessor<T> => {
  return Object.assign((...args: any[]) => value(...args), {
    [NON_ACCESSOR_SYMBOL]: true,
  })
}

export const isAccessor = <T>(value: MaybeAccessor<T>): value is Accessor<T> => {
  return typeof value === 'function' && !value[NON_ACCESSOR_SYMBOL]
}
