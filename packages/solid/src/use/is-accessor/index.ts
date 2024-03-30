import {Accessor} from 'solid-js'
import {MayBeAccessor} from 'src/use/types'

export const isAccessor = <T>(value: MayBeAccessor<T>): value is Accessor<T> => {
  return typeof value === 'function'
}
