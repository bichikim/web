import {Accessor} from 'solid-js'
import {isAccessor} from 'src/is-accessor'
import {AccessorsValue, MayBeAccessor, MayBeAccessors} from 'src/types'

export const resolveAccessor = <T>(value: MayBeAccessor<T>): Accessor<T> => {
  return isAccessor(value) ? value : () => value
}

export const resolveAccessors = <T extends MayBeAccessors>(
  value: T,
): Accessor<AccessorsValue<T>> => {
  if (Array.isArray(value)) {
    const accessors = value.map((value) => resolveAccessor(value))
    return (() => accessors.map((accessor) => accessor())) as any
  }
  return resolveAccessor(value) as any
}