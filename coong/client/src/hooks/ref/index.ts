import {ref as _ref} from 'vue-demi'
const {assign, freeze} = Object
export type Ref<T> = T & {
  (value: T): void
  (): T
  [Symbol.toPrimitive](): T
}
export const ref = <T>(_value: T): Ref<T> => {
  const valueRef = _ref(_value) as any
  function runner(value?: T | undefined): any {
    if (typeof value === 'undefined') {
      return valueRef.value as any
    }
    valueRef.value = value
  }
  // eslint-disable-next-line prefer-object-spread
  return freeze(assign(runner, {
    [Symbol.toPrimitive]() {
      return runner()
    },
  })) as any
}
