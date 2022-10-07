import type {Ref} from 'vue'
import {IsRef} from './is-ref'

export type Unref = <T>(value: T | Ref<T>) => T

export const createUnref = (isRef: IsRef): Unref => {
  return (value: any) => {
    if (isRef) {
      return value.value
    }
    return value
  }
}
