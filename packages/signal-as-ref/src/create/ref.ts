import type {Ref} from 'vue'
import type {Signal} from '@preact/signals'

export type UseSignal<T = any> = (value?: T) => Signal<T>

export const createRef = (signal: UseSignal) => {
  return <T>(value: T): Ref<T> => {
    return signal(value) as any
  }
}
