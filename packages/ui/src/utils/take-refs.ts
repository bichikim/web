import {AnyObject} from '@/types'
import {Ref} from 'vue'

export const tackRef = (ref: Ref) => {
  return ref?.value || ref
}

type ToRefs<T = any> = {
  [K in keyof T]?: Ref<T[K]>;
}

export const tackRefs = <T extends AnyObject>(refs: ToRefs<T>) => {
  const result: Record<string, any> = {}
  Object.keys(refs).forEach((key) => {
    const refLike = refs[key]
    result[key] = refLike?.value || refLike
  })
  return result
}
