import {createSignal, Signal} from 'solid-js'
import {createStore, Store} from 'solid-js/store'

export const REF = Symbol('ref')

export type Ref<T> = {
  readonly [REF]: boolean
  value: T
}

export type ReadOnlyRef<T> = Readonly<Ref<T>>

export type MaybeRef<T> = T | Ref<T>

export const isRef = <T>(value: MaybeRef<T>): value is Ref<T> => {
  return typeof value === 'object' && value !== null && (value as any)[REF] === true
}

export const resolveRef = <T>(value: MaybeRef<T>) => {
  if (isRef(value)) {
    return value
  }
  return createRef(value)
}

export const createRef = <T>(initValue: T) => {
  const [store, setStore] = createStore({
    value: initValue,
  })

  return {
    [REF]: true,
    get value() {
      return store.value
    },
    set value(value: T) {
      setStore(() => ({
        value,
      }))
    },
  }
}

export const readonly = <T>(value: Ref<T>): ReadOnlyRef<T> => {
  return {
    [REF]: true,
    get value() {
      return value.value
    },
  }
}
