import {Accessor} from 'solid-js'
import {MaybeAccessor} from 'src/types'

export const isAccessor = <T>(value: MaybeAccessor<T>): value is Accessor<T> => {
  return typeof value === 'function'
}
