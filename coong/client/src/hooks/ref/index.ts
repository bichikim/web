import {ref as _ref} from 'vue-demi'

export type Ref<T> = T & {
  (value: T): void
  (): T
} & {
  [Symbol.toPrimitive](): T
}
export const ref = <T>(_value: T): Ref<T> => {
  const valueRef = _ref(_value) as any
  function runner(value: T): void
  function runner(): T
  function runner(value?: T | undefined): any {
    if (typeof value === 'undefined') {
      return valueRef.value as any
    }
    valueRef.value = value
  }
  // eslint-disable-next-line prefer-object-spread
  return Object.assign(runner, {
    [Symbol.toPrimitive]() {
      return runner()
    },
  }) as any
}
